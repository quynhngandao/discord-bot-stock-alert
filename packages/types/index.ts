export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export interface IncomeStatement {
  date: string;
  calendarYear: string;
  period: string;
  eps: number | null;
  revenue: number | null;
  epsgrowth: number | null;
  revenueGrowth: number | null;
}

export interface ScoringBreakdown {
  trend: number; // 0–50
  rs: number; // 0–20
  proximity: number; // 0–15
  volume: number; // 0–15
  total: number; // 0–100
}

export interface MinerviniMetrics {
  symbol: string;
  close: number;
  sma50: number;
  sma150: number;
  sma200: number;
  sma150OneMonthAgo: number;
  sma200OneMonthAgo: number;
  high52Week: number;
  low52Week: number;
  percentFromHigh52Week: number;
  percentAboveLow52Week: number;
  averageVolume50: number;
  volumeRatioPrevDay: number;
  return63d: number | null;
  return21d: number | null;
  spy63dReturn: number | null; // assigned in orchestrator from SPY prices
  spy21dReturn: number | null; // assigned in orchestrator from SPY prices
  relativeStrengthRank: number | null; // assigned cross-sectionally in orchestrator
}

export interface IbdApproxMetrics {
  symbol: string;
  epsGrowthLatestQuarter: number | null;
  epsGrowthPreviousQuarter: number | null;
  revenueGrowthLatestQuarter: number | null;
  revenueGrowthPreviousQuarter: number | null;
  annualEpsGrowth3Y: number | null;
  annualRevenueGrowth3Y: number | null;
  roe: number | null;
  relativeStrengthRank: number | null;
  averageVolume50: number;
  dollarVolume50: number;
  accumulationRatio: number | null;
  epsAcceleration: boolean | null;
  revenueAcceleration: boolean | null;
}

export interface StockScanResult {
  symbol: string;
  companyName: string | null;
  close: number;
  marketCap: number | null;
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
  volumeRatioPrevDay: number;
  return63d: number | null;
  return21d: number | null;
  beatsSpy63d: boolean;
  beatsSpy21d: boolean;
  relativeStrengthRank: number | null;

  passesMinervini: boolean;
  passesIbdApprox: boolean;
  passesAvailableRules: boolean;
  passesStrictRules: boolean;

  missingFields: string[];
  dataCompletenessScore: number; // 0–100

  score: number;
  scoreBreakdown: ScoringBreakdown;
}
