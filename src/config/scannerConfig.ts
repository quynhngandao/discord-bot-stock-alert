export const scannerConfig = {
  mode: "alert_only" as const,

  // Price filters
  minPrice: 5,
  minAvgVolume: 1_000_000,
  minRelativeVolume: 1.5,
  maxSpreadPercent: 0.5,

  // Indicators
  fastEMA: 20,
  slowEMA: 50,
  atrPeriod: 14,

  // Risk/reward
  minRiskRewardArea: 2,

  // Market hours blackout
  noAlertFirstMinutes: 5,
  noAlertLastMinutes: 10,

  // Hard blocks
  blockEarningsDay: true,
  blockHaltedStocks: true,
  maxAtrExtensionFromVwap: 3,

  // Cooldowns
  sameTickerCooldownMinutes: 30,
  sameSetupCooldownMinutes: 60,
  maxAlertsPerTickerPerDay: 3,
  maxAlertsPerChannelPerHour: 10,
};

export type ScannerConfig = typeof scannerConfig;
