export const providerConfig = {
  historicalDaily: "tiingo",         // required — EOD OHLCV, powers all Minervini metrics
  profile: "finnhub",                // optional — market cap, industry, quotes, news, earnings
  fundamentals: "fmp",               // optional — IBD approximation for Minervini survivors only
  fundamentalsFallback: "alpha_vantage", // fallback — ROE, YoY growth when FMP misses
  realtime: "finnhub",               // optional — real-time quotes
  news: "finnhub",                   // optional — WebSocket news (paid plan only)
} as const;

export type ProviderConfig = typeof providerConfig;
