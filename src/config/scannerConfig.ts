export const scannerConfig = {
  mode: "alert_only" as const,
  scanMode: "daily_watchlist" as const,

  // Core filters
  minPrice: 5,
  minAvgVolume: 1_000_000,
  minAvgDollarVolume: 10_000_000,

  // Minervini trend template thresholds
  minervini: {
    minAvgVolume50: 500_000,
    minPercentAboveLow52Week: 30, // close >= low52Week * 1.30
    maxPercentFromHigh52Week: 25, // close within 25% of 52-week high
    minRsRank: 70,               // percentile rank vs scan universe (12-month return)
    requireCloseAboveSma50: true,
  },

  // IBD / CAN SLIM approximate thresholds (enrichment only in v1)
  ibd: {
    minEpsGrowthLatestQuarter: 25,
    minEpsGrowthPreviousQuarter: 25,
    minRevenueGrowthLatestQuarter: 20,
    minAnnualEpsGrowth3Y: 25,
    minRoe: 17,
    minRsRank: 80,
    minDollarVolume50: 10_000_000,
  },

  // Score thresholds for Discord alerts
  alertThresholds: {
    minScoreForWatchlist: 70,
    minScoreForPriority: 85,
  },

  // HIGH_PRIORITY additional gates
  highPriority: {
    minVolumeRatio: 1.5,
    maxPercentFromHigh: 10,
  },

  // Cooldowns
  sameTickerCooldownTradingDays: 1,
  maxAlertsPerTickerPerDay: 1,
  maxAlertsPerScan: 10,
};

export type ScannerConfig = typeof scannerConfig;

