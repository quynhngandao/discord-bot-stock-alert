import { asc, eq } from "drizzle-orm";
import { db } from "../infrastructure/db/client.js";
import { symbols } from "../infrastructure/db/schema.js";
import type { HistoricalPrice, IncomeStatement } from "../domain/types.js";
import { fetchHistoricalPrices } from "../infrastructure/market/tiingoClient.js";
import { fetchHistoricalPrices as fetchHistoricalPricesYahoo } from "../infrastructure/market/yahooFinanceClient.js";
import { fetchFinancials } from "../infrastructure/market/polygonClient.js";
import {
  getCachedFundamentals,
  setCachedFundamentals,
} from "../infrastructure/db/fundamentalsCacheService.js";
import { finnhubClient } from "../infrastructure/market/finnhubClient.js";
import type { CompanyProfile } from "../infrastructure/market/finnhubClient.js";
import { withRateLimit } from "../infrastructure/market/rateLimiter.js";
import type { MinerviniMetrics, ScoringBreakdown, StockScanResult } from "../domain/types.js";
import {
  assignRelativeStrengthRanks,
  computeIbdMetrics,
  computeMinerviniMetrics,
  computeRsScore,
  computeSpyReturns,
} from "../scanner/indicators.js";
import { evaluateIbd, evaluateMinervini } from "../scanner/ruleEngine.js";
import type { RuleSetResult } from "../scanner/ruleEngine.js";
import { computeScore } from "../scanner/scoring.js";
import { processResults } from "../alerts/alertEngine.js";
import { sendScanSkipped } from "../infrastructure/discord/scanAlertAdapter.js";
import { setIntradayWatchlist } from "./intradayMonitor.js";

const SCHEDULED_SCAN_LIMIT = 25;
// Increase limit as confidence grows. Sorted by id = market-cap priority (seed order).
export const MANUAL_SCAN_LIMIT = 10;

async function loadActiveTickers(limit: number): Promise<string[]> {
  const rows = await db
    .select()
    .from(symbols)
    .where(eq(symbols.isActive, true))
    .orderBy(asc(symbols.id));
  const tickers = rows.map((r) => r.ticker).slice(0, limit);
  // Always include SPY as benchmark — deduplicate if already in list
  return Array.from(new Set(["SPY", ...tickers]));
}

async function fetchPricesForAll(
  tickers: string[],
  provider: "tiingo" | "yahoo" = "tiingo"
): Promise<Map<string, HistoricalPrice[]>> {
  const delayMs = provider === "yahoo" ? 200 : 500;
  const results = await withRateLimit(
    tickers.map(
      (ticker) => (): Promise<[string, HistoricalPrice[]] | null> => {
        if (provider === "yahoo") {
          return fetchHistoricalPricesYahoo(ticker)
            .then((prices) => [ticker, prices] as [string, HistoricalPrice[]])
            .catch((err) => {
              console.warn(`[Yahoo] ${ticker} failed: ${(err as Error).message}`);
              return null;
            });
        }
        return fetchHistoricalPrices(ticker)
          .then((prices) => [ticker, prices] as [string, HistoricalPrice[]])
          .catch(async (err) => {
            console.warn(`[Tiingo] ${ticker} failed (${(err as Error).message}), trying Yahoo Finance...`);
            try {
              const prices = await fetchHistoricalPricesYahoo(ticker);
              console.log(`[Yahoo] ${ticker} fallback succeeded`);
              return [ticker, prices] as [string, HistoricalPrice[]];
            } catch (yahooErr) {
              console.warn(`[Yahoo] ${ticker} also failed: ${(yahooErr as Error).message}`);
              return null;
            }
          });
      }
    ),
    delayMs
  );

  const map = new Map<string, HistoricalPrice[]>();
  for (const result of results) {
    if (result) map.set(result[0], result[1]);
  }
  return map;
}

async function fetchFundamentalsForAll(
  tickers: string[]
): Promise<{ statementsMap: Map<string, IncomeStatement[]>; roeMap: Map<string, number> }> {
  const statementsMap = new Map<string, IncomeStatement[]>();
  const roeMap = new Map<string, number>();

  const cacheMisses: string[] = [];
  for (const ticker of tickers) {
    const cached = await getCachedFundamentals(ticker);
    if (cached) {
      statementsMap.set(ticker, cached);
    } else {
      cacheMisses.push(ticker);
    }
  }

  if (cacheMisses.length === 0) return { statementsMap, roeMap };

  // Polygon free: 5 calls/min — 12,500ms keeps us safely under the limit
  const results = await withRateLimit(
    cacheMisses.map(
      (ticker) => (): Promise<[string, IncomeStatement[], number | null] | null> =>
        fetchFinancials(ticker, 8)
          .then(async ({ statements, ttmRoe }) => {
            await setCachedFundamentals(ticker, statements);
            return [ticker, statements, ttmRoe] as [string, IncomeStatement[], number | null];
          })
          .catch((err) => {
            console.warn(`[Polygon] Fundamentals unavailable for ${ticker}: ${(err as Error).message}`);
            return null;
          })
    ),
    12_500
  );

  for (const result of results) {
    if (result) {
      const [ticker, stmts, roe] = result;
      statementsMap.set(ticker, stmts);
      if (roe !== null) roeMap.set(ticker, roe);
    }
  }
  return { statementsMap, roeMap };
}

async function fetchProfilesForAll(tickers: string[]): Promise<Map<string, CompanyProfile>> {
  const results = await withRateLimit(
    tickers.map((ticker) => async (): Promise<[string, CompanyProfile | null] | null> => {
      try {
        const profile = await finnhubClient.profile(ticker);
        return [ticker, profile];
      } catch (err) {
        console.warn(`[Finnhub] Profile unavailable for ${ticker}: ${(err as Error).message}`);
        return null;
      }
    }),
    200
  );

  const map = new Map<string, CompanyProfile>();
  for (const result of results) {
    if (result) {
      const [ticker, profile] = result;
      if (profile) map.set(ticker, profile);
    }
  }
  return map;
}

function buildScanResult(
  minervini: MinerviniMetrics,
  minerviniResult: RuleSetResult,
  ibdResult: RuleSetResult,
  scoreBreakdown: ScoringBreakdown,
  profile: CompanyProfile | null
): StockScanResult {
  const missingFields = [...minerviniResult.missingFields, ...ibdResult.missingFields];
  const totalRules = minerviniResult.rules.length + ibdResult.rules.length;
  const dataCompletenessScore =
    totalRules === 0 ? 100 : Math.round(((totalRules - missingFields.length) / totalRules) * 100);

  const beatsSpy63d =
    minervini.return63d !== null &&
    minervini.spy63dReturn !== null &&
    minervini.return63d > minervini.spy63dReturn;

  const beatsSpy21d =
    minervini.return21d !== null &&
    minervini.spy21dReturn !== null &&
    minervini.return21d > minervini.spy21dReturn;

  return {
    symbol: minervini.symbol,
    companyName: profile?.name || null,
    close: minervini.close,
    marketCap: profile?.mktCap ?? null,
    industry: profile?.industry || null,

    epsGrowthLatestQuarter:
      ibdResult.rules.find((r) => r.name === "EPS growth latest Q")?.value ?? null,
    revenueGrowthLatestQuarter:
      ibdResult.rules.find((r) => r.name === "Revenue growth latest Q")?.value ?? null,

    sma50: minervini.sma50,
    sma150: minervini.sma150,
    sma200: minervini.sma200,
    high52Week: minervini.high52Week,
    low52Week: minervini.low52Week,
    percentFromHigh52Week: minervini.percentFromHigh52Week,
    percentAboveLow52Week: minervini.percentAboveLow52Week,
    averageVolume50: minervini.averageVolume50,
    volumeRatioPrevDay: minervini.volumeRatioPrevDay,
    return63d: minervini.return63d,
    return21d: minervini.return21d,
    beatsSpy63d,
    beatsSpy21d,
    relativeStrengthRank: minervini.relativeStrengthRank,

    passesMinervini: minerviniResult.passesAvailableRules,
    passesIbdApprox: ibdResult.passesAvailableRules,
    passesAvailableRules: minerviniResult.passesAvailableRules && ibdResult.passesAvailableRules,
    passesStrictRules: minerviniResult.passesStrictRules && ibdResult.passesStrictRules,

    missingFields,
    dataCompletenessScore,
    score: scoreBreakdown.total,
    scoreBreakdown,
  };
}

export async function runScan(limit = SCHEDULED_SCAN_LIMIT, provider: "tiingo" | "yahoo" = "tiingo"): Promise<StockScanResult[]> {
  const tickers = await loadActiveTickers(limit);
  console.log(`Scanning ${tickers.length} symbols via ${provider}...`);

  // Step 1: fetch historical prices for all tickers
  console.log(`Fetching historical prices via ${provider}...`);
  const priceMap = await fetchPricesForAll(tickers, provider);

  if (priceMap.size === 0) {
    const msg = "Historical price data unavailable — Tiingo API rate limit reached. No stocks could be evaluated. Please wait before retrying.";
    console.warn(msg);
    await sendScanSkipped(msg);
    return [];
  }

  // Step 2: compute Minervini metrics — skip insufficient data; exclude SPY from candidates
  const minerviniMetrics: MinerviniMetrics[] = [];
  for (const ticker of tickers) {
    if (ticker === "SPY") continue;
    const prices = priceMap.get(ticker);
    if (!prices || prices.length === 0) continue;
    const metrics = computeMinerviniMetrics(ticker, prices);
    if (metrics) minerviniMetrics.push(metrics);
  }

  // Step 3: compute RS scores and assign cross-sectional ranks (excludes SPY)
  const rsScoreMap = new Map<string, number>();
  for (const m of minerviniMetrics) {
    const prices = priceMap.get(m.symbol) ?? [];
    rsScoreMap.set(m.symbol, computeRsScore(prices));
  }
  assignRelativeStrengthRanks(minerviniMetrics, rsScoreMap);

  // Step 3b: assign SPY benchmark returns to all metrics
  const spyPrices = priceMap.get("SPY") ?? [];
  const { return63d: spy63d, return21d: spy21d } = computeSpyReturns(spyPrices);
  if (spy63d === null) {
    console.warn("[Scan] SPY 63-day return unavailable — beats-SPY rule will be skipped (lenient)");
  }
  for (const m of minerviniMetrics) {
    m.spy63dReturn = spy63d;
    m.spy21dReturn = spy21d;
  }

  // Step 4: evaluate Minervini rules (lenient) — keep candidates that pass available rules
  const minerviniPassing = minerviniMetrics.filter(
    (m) => evaluateMinervini(m).passesAvailableRules
  );
  console.log(`Minervini filter: ${minerviniPassing.length}/${minerviniMetrics.length} passed`);

  if (minerviniPassing.length === 0) {
    console.log("No stocks passed Minervini filter.");
    return [];
  }

  const passingTickers = minerviniPassing.map((m) => m.symbol);

  // Step 5: fetch fundamentals and profiles only for Minervini-passing stocks
  console.log("Fetching fundamentals and profiles for Minervini-passing stocks...");
  const [{ statementsMap: fundamentalMap, roeMap }, profileMap] = await Promise.all([
    fetchFundamentalsForAll(passingTickers),
    fetchProfilesForAll(passingTickers),
  ]);

  // Step 6: compute IBD metrics, score, build results
  const scanResults: StockScanResult[] = [];

  for (const minervini of minerviniPassing) {
    const minerviniResult = evaluateMinervini(minervini);
    const statements = fundamentalMap.get(minervini.symbol) ?? [];
    const prices = priceMap.get(minervini.symbol) ?? [];
    const ibdMetrics = computeIbdMetrics(minervini.symbol, statements, minervini, prices);
    ibdMetrics.roe = roeMap.get(minervini.symbol) ?? null;
    const ibdResult = evaluateIbd(ibdMetrics);
    const scoreBreakdown = computeScore(minerviniResult, ibdResult, minervini);
    const profile = profileMap.get(minervini.symbol) ?? null;

    const result = buildScanResult(minervini, minerviniResult, ibdResult, scoreBreakdown, profile);
    scanResults.push(result);

    console.log(
      `${minervini.symbol.padEnd(6)} score=${scoreBreakdown.total} ` +
        `available=${result.passesAvailableRules} strict=${result.passesStrictRules} ` +
        `data=${result.dataCompletenessScore}%`
    );
  }

  const strictPassing = scanResults.filter((r) => r.passesStrictRules);
  console.log(
    `Scan complete: ${strictPassing.length} strict / ${scanResults.filter((r) => r.passesAvailableRules).length} available / ${scanResults.length} Minervini candidates`
  );

  await processResults(scanResults);
  setIntradayWatchlist(scanResults.filter((r) => r.passesMinervini));
  return scanResults;
}
