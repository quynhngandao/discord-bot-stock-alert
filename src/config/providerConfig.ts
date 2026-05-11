export const providerConfig = {
  historicalDaily: "tiingo", // EOD OHLCV for all scanned symbols
  profile: "finnhub", // market cap, industry, news — Finnhub REST
  fundamentals: "fmp", // EPS/revenue — only for Minervini survivors
  fundamentalsFallback: "alpha_vantage", // sector, ROE, YoY growth when FMP/Finnhub miss
  realtime: "finnhub",
  news: "finnhub",
} as const;

export type ProviderConfig = typeof providerConfig;
