import type { FmpHistoricalPrice, FmpIncomeStatement } from "../infrastructure/market/fmpClient.js";
import type { IbdApproxMetrics, MinerviniMetrics } from "../domain/types.js";

const TRADING_DAYS_PER_YEAR = 252;
const TRADING_DAYS_PER_MONTH = 20;
const MIN_REQUIRED_DAYS = 200 + TRADING_DAYS_PER_MONTH;

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum: number, v: number): number => sum + v, 0) / values.length;
}

function sma(values: number[], period: number, offset: number = 0): number | null {
  if (values.length < offset + period) return null;
  return avg(values.slice(offset, offset + period));
}

// Ensure newest-first order regardless of API response ordering
function sortNewestFirst(prices: FmpHistoricalPrice[]): FmpHistoricalPrice[] {
  return [...prices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function computeMinerviniMetrics(
  symbol: string,
  prices: FmpHistoricalPrice[]
): MinerviniMetrics | null {
  const sorted = sortNewestFirst(prices);
  if (sorted.length < MIN_REQUIRED_DAYS) return null;

  const latestPrice = sorted[0];
  if (!latestPrice) return null;

  const closes = sorted.map((p: FmpHistoricalPrice): number => p.close);
  const highs = sorted.map((p: FmpHistoricalPrice): number => p.high);
  const lows = sorted.map((p: FmpHistoricalPrice): number => p.low);
  const volumes = sorted.map((p: FmpHistoricalPrice): number => p.volume);

  const sma50 = sma(closes, 50);
  const sma150 = sma(closes, 150);
  const sma200 = sma(closes, 200);
  const sma200OneMonthAgo = sma(closes, 200, TRADING_DAYS_PER_MONTH);

  if (sma50 === null || sma150 === null || sma200 === null || sma200OneMonthAgo === null) {
    return null;
  }

  const yearSlice = Math.min(sorted.length, TRADING_DAYS_PER_YEAR);
  const high52Week = Math.max(...highs.slice(0, yearSlice));
  const low52Week = Math.min(...lows.slice(0, yearSlice));

  const close = latestPrice.close;
  const averageVolume50 = avg(volumes.slice(0, 50));

  return {
    symbol,
    close,
    sma50,
    sma150,
    sma200,
    sma200OneMonthAgo,
    high52Week,
    low52Week,
    percentFromHigh52Week: ((high52Week - close) / high52Week) * 100,
    percentAboveLow52Week: ((close - low52Week) / low52Week) * 100,
    averageVolume50,
    relativeStrengthRank: null, // assigned cross-sectionally in orchestrator
  };
}

// 12-month price return used to rank stocks cross-sectionally.
// prices must be sorted newest-first.
export function computeRsScore(prices: FmpHistoricalPrice[]): number {
  const sorted = sortNewestFirst(prices);
  const yearPrices = sorted.slice(0, Math.min(sorted.length, TRADING_DAYS_PER_YEAR));
  if (yearPrices.length < 2) return 0;
  const latest = yearPrices[0]!.close;
  const yearAgo = yearPrices[yearPrices.length - 1]!.close;
  return yearAgo > 0 ? ((latest - yearAgo) / yearAgo) * 100 : 0;
}

// Sets relativeStrengthRank (0–100 percentile) on each metric in-place.
// rsScoreMap maps symbol → 12-month return. Must cover all symbols in metrics.
export function assignRelativeStrengthRanks(
  metrics: MinerviniMetrics[],
  rsScoreMap: Map<string, number>
): void {
  if (metrics.length === 0) return;

  const scored = metrics.map((m) => ({
    metrics: m,
    rsScore: rsScoreMap.get(m.symbol) ?? 0,
  }));
  scored.sort((a, b) => a.rsScore - b.rsScore);

  for (let i = 0; i < scored.length; i++) {
    const rank =
      scored.length === 1 ? 100 : Math.round((i / (scored.length - 1)) * 100);
    scored[i]!.metrics.relativeStrengthRank = rank;
  }
}

function computeYoYGrowth(
  latest: FmpIncomeStatement,
  all: FmpIncomeStatement[]
): { epsGrowth: number | null; revenueGrowth: number | null } {
  const priorYear = String(Number(latest.calendarYear) - 1);
  const prior = all.find(
    (s) => s.calendarYear === priorYear && s.period === latest.period
  );
  if (!prior) return { epsGrowth: null, revenueGrowth: null };

  const epsGrowth =
    latest.eps !== null && prior.eps !== null && prior.eps !== 0
      ? ((latest.eps - prior.eps) / Math.abs(prior.eps)) * 100
      : null;

  const revenueGrowth =
    latest.revenue !== null && prior.revenue !== null && prior.revenue !== 0
      ? ((latest.revenue - prior.revenue) / Math.abs(prior.revenue)) * 100
      : null;

  return { epsGrowth, revenueGrowth };
}

// statements should be sorted newest-first and include at least 5 quarters for YoY coverage
export function computeIbdMetrics(
  symbol: string,
  statements: FmpIncomeStatement[],
  minervini: MinerviniMetrics
): IbdApproxMetrics {
  const quarterly = statements.filter(
    (s: FmpIncomeStatement): boolean =>
      s.period === "Q1" || s.period === "Q2" || s.period === "Q3" || s.period === "Q4"
  );

  const latest = quarterly[0];
  const previous = quarterly[1];

  const latestGrowth = latest ? computeYoYGrowth(latest, quarterly) : null;
  const prevGrowth = previous ? computeYoYGrowth(previous, quarterly) : null;

  return {
    symbol,
    epsGrowthLatestQuarter: latestGrowth?.epsGrowth ?? null,
    epsGrowthPreviousQuarter: prevGrowth?.epsGrowth ?? null,
    revenueGrowthLatestQuarter: latestGrowth?.revenueGrowth ?? null,
    revenueGrowthPreviousQuarter: prevGrowth?.revenueGrowth ?? null,
    annualEpsGrowth3Y: null, // requires annual statements — add later
    roe: null,               // not in current FMP fields — add later
    relativeStrengthRank: minervini.relativeStrengthRank,
    averageVolume50: minervini.averageVolume50,
  };
}
