export interface ScoringBreakdown {
  trend: number; // 0–40
  leadership: number; // 0–30
  setup: number; // 0–20
  market: number; // 0–10
  total: number; // 0–100
}

export interface MinerviniMetrics {
  symbol: string;
  close: number;
  sma50: number;
  sma150: number;
  sma200: number;
  sma200OneMonthAgo: number;
  high52Week: number;
  low52Week: number;
  percentFromHigh52Week: number;
  percentAboveLow52Week: number;
  averageVolume50: number;
  relativeStrengthRank: number | null;
}

export interface IbdApproxMetrics {
  symbol: string;
  epsGrowthLatestQuarter: number | null;
  epsGrowthPreviousQuarter: number | null;
  revenueGrowthLatestQuarter: number | null;
  revenueGrowthPreviousQuarter: number | null;
  annualEpsGrowth3Y: number | null;
  roe: number | null;
  relativeStrengthRank: number | null;
  averageVolume50: number;
}

export interface StockScanResult {
  symbol: string;
  close: number;
  marketCap: number | null;
  sector: string | null;
  industry: string | null;

  epsGrowthLatestQuarter: number | null;
  revenueGrowthLatestQuarter: number | null;

  sma50: number;
  sma150: number;
  sma200: number;
  high52Week: number;
  low52Week: number;
  percentFromHigh52Week: number;
  percentAboveLow52Week: number;
  averageVolume50: number;
  relativeStrengthRank: number | null;

  // Lenient: null fields are skipped — used for candidate discovery
  passesMinervini: boolean;
  passesIbdApprox: boolean;
  passesAvailableRules: boolean;

  // Strict: null fields fail — used for Discord alerts
  passesStrictRules: boolean;

  missingFields: string[];
  dataCompletenessScore: number; // 0–100

  score: number;
  scoreBreakdown: ScoringBreakdown;
}
