import { scannerConfig } from "../config/scannerConfig.js";
import type { IbdApproxMetrics, MinerviniMetrics } from "../domain/types.js";

export interface RuleResult {
  name: string;
  passed: boolean; // lenient: null treated as passing (skip)
  passedStrict: boolean; // strict: null treated as failing
  missing: boolean; // true when value was null
  value: number | null;
  threshold: number | null;
}

export interface RuleSetResult {
  passesAvailableRules: boolean; // all non-missing rules passed (for candidate discovery)
  passesStrictRules: boolean; // all rules passed including null checks (for Discord alerts)
  missingFields: string[];
  dataCompletenessScore: number; // 0–100
  rules: RuleResult[];
}

function rule(
  name: string,
  value: number | null,
  threshold: number | null,
  check: (v: number, t: number) => boolean
): RuleResult {
  const missing = value === null || threshold === null;
  const passedStrict = !missing && check(value!, threshold!);
  const passed = missing || passedStrict; // lenient: skip missing
  return { name, value, threshold, passed, passedStrict, missing };
}

function buildRuleSetResult(rules: RuleResult[]): RuleSetResult {
  const missingFields = rules.filter((r) => r.missing).map((r) => r.name);
  const nonMissing = rules.filter((r) => !r.missing);
  const passesAvailableRules = nonMissing.every((r) => r.passedStrict);
  const passesStrictRules = rules.every((r) => r.passedStrict);
  const dataCompletenessScore =
    rules.length === 0 ? 100 : Math.round((nonMissing.length / rules.length) * 100);
  return { passesAvailableRules, passesStrictRules, missingFields, dataCompletenessScore, rules };
}

export function evaluateMinervini(m: MinerviniMetrics): RuleSetResult {
  const cfg = scannerConfig.minervini;

  const rules: RuleResult[] = [
    ...(cfg.requireCloseAboveSma50
      ? [rule("close > sma50", m.close, m.sma50, (v, t) => v > t)]
      : []),
    rule("close > sma150", m.close, m.sma150, (v, t) => v > t),
    rule("close > sma200", m.close, m.sma200, (v, t) => v > t),
    rule("sma150 rising", m.sma150, m.sma150OneMonthAgo, (v, t) => v > t),
    rule("sma200 rising", m.sma200, m.sma200OneMonthAgo, (v, t) => v > t),
    rule("sma50 > sma150", m.sma50, m.sma150, (v, t) => v > t),
    rule("sma50 > sma200", m.sma50, m.sma200, (v, t) => v > t),
    rule("% above 52w low", m.percentAboveLow52Week, cfg.minPercentAboveLow52Week, (v, t) => v >= t),
    rule("% from 52w high", m.percentFromHigh52Week, cfg.maxPercentFromHigh52Week, (v, t) => v <= t),
    rule("RS rank", m.relativeStrengthRank, cfg.minRsRank, (v, t) => v >= t),
    rule("avg volume 50d", m.averageVolume50, cfg.minAvgVolume50, (v, t) => v >= t),
  ];

  return buildRuleSetResult(rules);
}

export function evaluateIbd(ibd: IbdApproxMetrics): RuleSetResult {
  const cfg = scannerConfig.ibd;

  // Fundamentals are enrichment only in v1 — all rules are lenient (null = pass)
  const rules: RuleResult[] = [
    rule("EPS growth latest Q", ibd.epsGrowthLatestQuarter, cfg.minEpsGrowthLatestQuarter, (v, t) => v >= t),
    rule("EPS growth prev Q", ibd.epsGrowthPreviousQuarter, cfg.minEpsGrowthPreviousQuarter, (v, t) => v >= t),
    rule("Revenue growth latest Q", ibd.revenueGrowthLatestQuarter, cfg.minRevenueGrowthLatestQuarter, (v, t) => v >= t),
    rule("Annual EPS growth 3Y", ibd.annualEpsGrowth3Y, cfg.minAnnualEpsGrowth3Y, (v, t) => v >= t),
    rule("ROE", ibd.roe, cfg.minRoe, (v, t) => v >= t),
    rule("RS rank (IBD)", ibd.relativeStrengthRank, cfg.minRsRank, (v, t) => v >= t),
    rule("Dollar volume 50d", ibd.dollarVolume50, cfg.minDollarVolume50, (v, t) => v >= t),
  ];

  return buildRuleSetResult(rules);
}
