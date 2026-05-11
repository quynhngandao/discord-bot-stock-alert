export const scannerConfig = {
  mode: "alert_only" as const,

  // Intraday alert filters
  minPrice: 5,
  minAvgVolume: 1_000_000,
  minRelativeVolume: 1.5,
  maxSpreadPercent: 0.5,

  // Intraday indicators
  fastEMA: 20,
  slowEMA: 50,
  atrPeriod: 14,
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

  // Minervini trend template thresholds
  minervini: {
    minAvgVolume50: 500_000,
    minPercentAboveLow52Week: 25, // close >= low52Week * 1.25
    maxPercentFromHigh52Week: 25, // close >= high52Week * 0.75
    minRsRank: 70,
  },

  // IBD / CAN SLIM approximate thresholds
  ibd: {
    minEpsGrowthLatestQuarter: 25, // %
    minEpsGrowthPreviousQuarter: 25, // %
    minRevenueGrowthLatestQuarter: 20, // %
    minRevenueGrowthPreviousQuarter: 20, // %
    minAvgVolume50: 500_000,
    minRsRank: 80,
  },

  // Score thresholds for Discord alerts
  alertThresholds: {
    minScoreForWatchlist: 65,
    minScoreForPriority: 80,
  },

  // Data quality gates — lenient for discovery, strict for alerts
  dataQuality: {
    minAlertDataCompletenessScore: 85,
  },
};

export type ScannerConfig = typeof scannerConfig;
