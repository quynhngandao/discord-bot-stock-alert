export const providerConfig = {
  historicalDaily: "tiingo",   // required — EOD OHLCV, powers all Minervini metrics
  fundamentals: "polygon",     // quarterly income statements + TTM ROE
  profile: "finnhub",          // market cap, sector, industry
} as const;

export type ProviderConfig = typeof providerConfig;
