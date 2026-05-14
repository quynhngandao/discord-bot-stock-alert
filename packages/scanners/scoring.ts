import type { MinerviniMetrics, ScoringBreakdown } from '@discord-stock-alert-bot/types';
import type { RuleSetResult } from './ruleEngine.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeScore(minerviniResult: RuleSetResult, _ibdResult: RuleSetResult, metrics: MinerviniMetrics): ScoringBreakdown {
  // Trend (50): 10 pts each for 5 core Minervini criteria
  const trendRules = [
    'close > sma50',
    'close > sma150',
    'close > sma200',
    'sma150 rising',
    'sma200 rising',
    'sma50 > sma150',
    'sma50 > sma200',
    '% above 52w low',
    '% from 52w high',
  ];
  const trendPassed = minerviniResult.rules.filter((r) => trendRules.includes(r.name) && r.passedStrict).length;
  // Map passed rules (0–9) proportionally to 0–50
  const trend = Math.round((trendPassed / trendRules.length) * 50);

  // Relative strength vs SPY (20): 63d outperforms = 15 pts, 21d outperforms = 5 pts
  const beats63d = metrics.return63d !== null && metrics.spy63dReturn !== null && metrics.return63d > metrics.spy63dReturn;
  const beats21d = metrics.return21d !== null && metrics.spy21dReturn !== null && metrics.return21d > metrics.spy21dReturn;
  const rs = (beats63d ? 15 : 0) + (beats21d ? 5 : 0);

  // 52-week high proximity (15): within 25%=0 bonus, within 15%=+10, within 10%=+5 more
  const pctFromHigh = metrics.percentFromHigh52Week;
  const proximity = pctFromHigh <= 10 ? 15 : pctFromHigh <= 15 ? 10 : pctFromHigh <= 25 ? 0 : 0;

  // Volume/liquidity (15): avg vol >= 1M = 5pts, dollar vol >= $10M = 5pts, vol ratio >= 1.5 = 5pts
  const volPts = metrics.averageVolume50 >= 1_000_000 ? 5 : 0;
  const dollarVolPts = metrics.close * metrics.averageVolume50 >= 10_000_000 ? 5 : 0;
  const volRatioPts = metrics.volumeRatioPrevDay >= 1.5 ? 5 : 0;
  const volume = volPts + dollarVolPts + volRatioPts;

  const total = clamp(Math.round(trend + rs + proximity + volume), 0, 100);

  return { trend, rs, proximity, volume, total };
}
