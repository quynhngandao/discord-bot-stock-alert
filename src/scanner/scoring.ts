import type { MinerviniMetrics, ScoringBreakdown } from "../domain/types.js";
import type { RuleSetResult } from "./ruleEngine.js";

function pct(passed: number, total: number): number {
  if (total === 0) return 0;
  return passed / total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeScore(
  minerviniResult: RuleSetResult,
  ibdResult: RuleSetResult,
  metrics: MinerviniMetrics
): ScoringBreakdown {
  // Trend (40): strict Minervini pass rate — missing fields reduce the score
  const passedMinervini = minerviniResult.rules.filter((r) => r.passedStrict).length;
  const trend = pct(passedMinervini, minerviniResult.rules.length) * 40;

  // Leadership (30): strict IBD pass rate — missing fundamentals reduce the score
  const passedIbd = ibdResult.rules.filter((r) => r.passedStrict).length;
  const leadership = pct(passedIbd, ibdResult.rules.length) * 30;

  // Setup (20): proximity to 52-week high + volume quality
  //   Proximity: full 10 pts if within 5% of high, 0 pts at 25%
  const proximityScore = clamp((25 - metrics.percentFromHigh52Week) / 20, 0, 1) * 10;
  //   Volume: full 10 pts at >= 2M avg volume, scales down linearly
  const volumeScore = clamp(metrics.averageVolume50 / 2_000_000, 0, 1) * 10;
  const setup = proximityScore + volumeScore;

  // Market (10): placeholder — full marks until market direction is implemented
  const market = 10;

  const total = Math.round(trend + leadership + setup + market);

  return { trend, leadership, setup, market, total };
}
