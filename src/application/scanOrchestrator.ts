import { eq } from "drizzle-orm";
import { db } from "../infrastructure/db/client.js";
import { symbols } from "../infrastructure/db/schema.js";
import type { FmpHistoricalPrice, FmpIncomeStatement } from "../infrastructure/market/fmpClient.js";
import { fetchIncomeStatements } from "../infrastructure/market/fmpClient.js";
import {
  getCachedFundamentals,
  setCachedFundamentals,
} from "../infrastructure/db/fundamentalsCacheService.js";
import { fetchHistoricalPrices } from "../infrastructure/market/tiingoClient.js";
import { finnhubClient } from "../infrastructure/market/finnhubClient.js";
import type { CompanyProfile } from "../infrastructure/market/finnhubClient.js";
import {
  fetchFundamentalsFallback,
  fetchProfileFallback,
} from "../infrastructure/market/alphaVantageClient.js";
import { withRateLimit } from "../infrastructure/market/rateLimiter.js";
import type { MinerviniMetrics, ScoringBreakdown, StockScanResult } from "../domain/types.js";
import {
  assignRelativeStrengthRanks,
  computeIbdMetrics,
  computeMinerviniMetrics,
  computeRsScore,
} from "../scanner/indicators.js";
import { evaluateIbd, evaluateMinervini } from "../scanner/ruleEngine.js";
import type { RuleSetResult } from "../scanner/ruleEngine.js";
import { computeScore } from "../scanner/scoring.js";
import { processResults } from "../alerts/alertEngine.js";
import { sendScanSkipped } from "../infrastructure/discord/scanAlertAdapter.js";

const SCAN_LIMIT = 167; // full universe — lower to 20 for local testing if hitting Tiingo quota

async function loadActiveTickers(): Promise<string[]> {
  const rows = await db.select().from(symbols).where(eq(symbols.isActive, true));
  return rows.map((r) => r.ticker).slice(0, SCAN_LIMIT);
}

async function fetchPricesForAll(tickers: string[]): Promise<Map<string, FmpHistoricalPrice[]>> {
  const results = await withRateLimit(
    tickers.map(
      (ticker) => (): Promise<[string, FmpHistoricalPrice[]] | null> =>
        fetchHistoricalPrices(ticker)
          .then((prices) => [ticker, prices] as [string, FmpHistoricalPrice[]])
          .catch((err) => {
            console.warn(`[Tiingo] Skipping ${ticker}: ${(err as Error).message}`);
            return null;
          })
    )
  );

  const map = new Map<string, FmpHistoricalPrice[]>();
  for (const result of results) {
    if (result) map.set(result[0], result[1]);
  }
  return map;
}

async function fetchFundamentalsForAll(
  tickers: string[]
): Promise<Map<string, FmpIncomeStatement[]>> {
  const map = new Map<string, FmpIncomeStatement[]>();

  const cacheMisses: string[] = [];
  for (const ticker of tickers) {
    const cached = await getCachedFundamentals(ticker);
    if (cached) {
      map.set(ticker, cached);
    } else {
      cacheMisses.push(ticker);
    }
  }

  if (cacheMisses.length === 0) return map;

  const results = await withRateLimit(
    cacheMisses.map(
      (ticker) => (): Promise<[string, FmpIncomeStatement[]] | null> =>
        fetchIncomeStatements(ticker, 8)
          .then(async (stmts) => {
            await setCachedFundamentals(ticker, stmts);
            return [ticker, stmts] as [string, FmpIncomeStatement[]];
          })
          .catch((err) => {
            console.warn(`[FMP] Fundamentals unavailable for ${ticker}: ${(err as Error).message}`);
            return null;
          })
    )
  );

  for (const result of results) {
    if (result) map.set(result[0], result[1]);
  }
  return map;
}

async function fetchProfilesForAll(tickers: string[]): Promise<Map<string, CompanyProfile>> {
  // Primary: Finnhub REST profile. Fallback: Alpha Vantage OVERVIEW.
  const results = await withRateLimit(
    tickers.map((ticker) => async (): Promise<[string, CompanyProfile | null] | null> => {
      try {
        const profile = await finnhubClient.profile(ticker);
        if (profile) return [ticker, profile];
        return [ticker, await fetchProfileFallback(ticker)];
      } catch (err) {
        console.warn(`[Finnhub/AlphaVantage] Profile unavailable for ${ticker}: ${(err as Error).message}`);
        return null;
      }
    })
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

  return {
    symbol: minervini.symbol,
    close: minervini.close,
    marketCap: profile?.mktCap ?? null,
    sector: profile?.sector ?? null,
    industry: profile?.industry ?? null,

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

export async function runScan(): Promise<StockScanResult[]> {
  const tickers = await loadActiveTickers();
  console.log(`Scanning ${tickers.length} symbols...`);

  // Step 1: fetch historical prices for all tickers
  console.log("Fetching historical prices...");
  const priceMap = await fetchPricesForAll(tickers);

  if (priceMap.size === 0) {
    const msg = "Historical price data unavailable — Tiingo API rate limit reached. No stocks could be evaluated. Please wait before retrying.";
    console.warn(msg);
    await sendScanSkipped(msg);
    return [];
  }

  // Step 2: compute Minervini metrics — skip insufficient data
  const minerviniMetrics: MinerviniMetrics[] = [];
  for (const ticker of tickers) {
    const prices = priceMap.get(ticker);
    if (!prices || prices.length === 0) continue;
    const metrics = computeMinerviniMetrics(ticker, prices);
    if (metrics) minerviniMetrics.push(metrics);
  }

  // Step 3: compute RS scores and assign cross-sectional ranks to all metrics
  const rsScoreMap = new Map<string, number>();
  for (const m of minerviniMetrics) {
    const prices = priceMap.get(m.symbol) ?? [];
    rsScoreMap.set(m.symbol, computeRsScore(prices));
  }
  assignRelativeStrengthRanks(minerviniMetrics, rsScoreMap);

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
  const [fundamentalMap, profileMap] = await Promise.all([
    fetchFundamentalsForAll(passingTickers),
    fetchProfilesForAll(passingTickers),
  ]);

  // Step 5b: Alpha Vantage fallback for tickers where FMP returned nothing
  const missingFundamentalTickers = passingTickers.filter(
    (t) => (fundamentalMap.get(t) ?? []).length === 0
  );
  const avFundamentalsMap = new Map<
    string,
    { epsGrowthYoY: number | null; revenueGrowthYoY: number | null; roe: number | null }
  >();
  if (missingFundamentalTickers.length > 0) {
    const avResults = await withRateLimit(
      missingFundamentalTickers.map(
        (ticker) => async (): Promise<[string, Awaited<ReturnType<typeof fetchFundamentalsFallback>>]> =>
          [ticker, await fetchFundamentalsFallback(ticker).catch((err) => {
            console.warn(`[AlphaVantage] Fundamentals fallback failed for ${ticker}: ${(err as Error).message}`);
            return null;
          })]
      )
    );
    for (const [ticker, data] of avResults) {
      if (data) avFundamentalsMap.set(ticker, data);
    }
  }

  // Step 6: compute IBD metrics, score, build results
  const scanResults: StockScanResult[] = [];

  for (const minervini of minerviniPassing) {
    const minerviniResult = evaluateMinervini(minervini);
    const statements = fundamentalMap.get(minervini.symbol) ?? [];
    const ibdMetrics = computeIbdMetrics(minervini.symbol, statements, minervini);

    // Apply Alpha Vantage overrides when FMP had no data
    const avData = avFundamentalsMap.get(minervini.symbol);
    if (avData && statements.length === 0) {
      ibdMetrics.epsGrowthLatestQuarter = avData.epsGrowthYoY;
      ibdMetrics.revenueGrowthLatestQuarter = avData.revenueGrowthYoY;
      ibdMetrics.roe = avData.roe;
    }
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
  return scanResults;
}
