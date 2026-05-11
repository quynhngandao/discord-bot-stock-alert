import type { HistoricalPrice, IncomeStatement, IbdApproxMetrics, MinerviniMetrics } from "../domain/types.js";

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

function computeReturn(closes: number[], bars: number): number | null {
  if (closes.length <= bars) return null;
  const latest = closes[0]!;
  const prior = closes[bars]!;
  return prior > 0 ? ((latest - prior) / prior) * 100 : null;
}

// Ensure newest-first order regardless of API response ordering
function sortNewestFirst(prices: HistoricalPrice[]): HistoricalPrice[] {
  return [...prices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function computeMinerviniMetrics(
  symbol: string,
  prices: HistoricalPrice[]
): MinerviniMetrics | null {
  const sorted = sortNewestFirst(prices);
  if (sorted.length < MIN_REQUIRED_DAYS) return null;

  const latestPrice = sorted[0];
  if (!latestPrice) return null;

  const closes = sorted.map((p: HistoricalPrice): number => p.close);
  const highs = sorted.map((p: HistoricalPrice): number => p.high);
  const lows = sorted.map((p: HistoricalPrice): number => p.low);
  const volumes = sorted.map((p: HistoricalPrice): number => p.volume);

  const sma50 = sma(closes, 50);
  const sma150 = sma(closes, 150);
  const sma200 = sma(closes, 200);
  const sma150OneMonthAgo = sma(closes, 150, TRADING_DAYS_PER_MONTH);
  const sma200OneMonthAgo = sma(closes, 200, TRADING_DAYS_PER_MONTH);

  if (
    sma50 === null ||
    sma150 === null ||
    sma200 === null ||
    sma150OneMonthAgo === null ||
    sma200OneMonthAgo === null
  ) {
    return null;
  }

  const yearSlice = Math.min(sorted.length, TRADING_DAYS_PER_YEAR);
  const high52Week = Math.max(...highs.slice(0, yearSlice));
  const low52Week = Math.min(...lows.slice(0, yearSlice));

  const close = latestPrice.close;
  const averageVolume50 = avg(volumes.slice(0, 50));
  const volumeRatioPrevDay = averageVolume50 > 0 ? (volumes[0] ?? 0) / averageVolume50 : 0;

  return {
    symbol,
    close,
    sma50,
    sma150,
    sma200,
    sma150OneMonthAgo,
    sma200OneMonthAgo,
    high52Week,
    low52Week,
    percentFromHigh52Week: ((high52Week - close) / high52Week) * 100,
    percentAboveLow52Week: ((close - low52Week) / low52Week) * 100,
    averageVolume50,
    volumeRatioPrevDay,
    return63d: computeReturn(closes, 63),
    return21d: computeReturn(closes, 21),
    spy63dReturn: null,
    spy21dReturn: null,
    relativeStrengthRank: null,
  };
}

// 12-month price return used to rank stocks cross-sectionally.
// prices must be sorted newest-first.
export function computeRsScore(prices: HistoricalPrice[]): number {
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
    const rank = scored.length === 1 ? 100 : Math.round((i / (scored.length - 1)) * 100);
    scored[i]!.metrics.relativeStrengthRank = rank;
  }
}

// Extracts SPY's 63-day and 21-day returns from its historical prices.
export function computeSpyReturns(
  spyPrices: HistoricalPrice[]
): { return63d: number | null; return21d: number | null } {
  const sorted = sortNewestFirst(spyPrices);
  const closes = sorted.map((p) => p.close);
  return {
    return63d: computeReturn(closes, 63),
    return21d: computeReturn(closes, 21),
  };
}

function computeYoYGrowth(
  latest: IncomeStatement,
  all: IncomeStatement[]
): { epsGrowth: number | null; revenueGrowth: number | null } {
  const priorYear = String(Number(latest.calendarYear) - 1);
  const prior = all.find((s) => s.calendarYear === priorYear && s.period === latest.period);
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

function computeAccumulationRatio(prices: HistoricalPrice[], lookback = 50): number | null {
  const sorted = sortNewestFirst(prices);
  if (sorted.length < 2) return null;
  const window = sorted.slice(0, Math.min(lookback + 1, sorted.length));
  let upVolume = 0;
  let downVolume = 0;
  for (let i = 0; i < window.length - 1; i++) {
    const current = window[i]!;
    const prev = window[i + 1]!;
    if (current.close > prev.close) upVolume += current.volume;
    else if (current.close < prev.close) downVolume += current.volume;
  }
  return downVolume > 0 ? upVolume / downVolume : null;
}

// statements should be sorted newest-first and include at least 5 quarters for YoY coverage
export function computeIbdMetrics(
  symbol: string,
  statements: IncomeStatement[],
  minervini: MinerviniMetrics,
  prices: HistoricalPrice[]
): IbdApproxMetrics {
  const quarterly = statements.filter(
    (s: IncomeStatement): boolean =>
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
    annualEpsGrowth3Y: null, // requires annual statements — add when Polygon annual fetch is implemented
    annualRevenueGrowth3Y: null,
    roe: null, // assigned from roeMap in orchestrator
    relativeStrengthRank: minervini.relativeStrengthRank,
    averageVolume50: minervini.averageVolume50,
    dollarVolume50: minervini.close * minervini.averageVolume50,
    accumulationRatio: computeAccumulationRatio(prices),
    epsAcceleration:
      latestGrowth?.epsGrowth != null && prevGrowth?.epsGrowth != null
        ? latestGrowth.epsGrowth > prevGrowth.epsGrowth
        : null,
    revenueAcceleration:
      latestGrowth?.revenueGrowth != null && prevGrowth?.revenueGrowth != null
        ? latestGrowth.revenueGrowth > prevGrowth.revenueGrowth
        : null,
  };
}
