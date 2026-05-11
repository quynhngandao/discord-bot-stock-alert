import {
  AI_SPECULATIVE_TICKERS,
  BIG_TECH_TICKERS,
  SECTOR_LEADER_TICKERS,
} from "../data/seedTickers.js";

export type AlertTier = "bigTech" | "sectorLeaders" | "aiSpeculative" | "unknown";

export const ALERT_CONFIG = {
  bigTech: {
    minNewsScore: 0.65,
    minRelativeVolume: 1.3,
    minPriceMovePct: 1.0,
    cooldownMinutes: 30,
  },
  sectorLeaders: {
    minNewsScore: 0.7,
    minRelativeVolume: 1.4,
    minPriceMovePct: 1.5,
    cooldownMinutes: 45,
  },
  aiSpeculative: {
    minNewsScore: 0.78,
    minRelativeVolume: 1.8,
    minPriceMovePct: 4.0,
    cooldownMinutes: 45,
  },
} satisfies Record<Exclude<AlertTier, "unknown">, object>;

export function getTickerAlertTier(ticker: string): AlertTier {
  if (BIG_TECH_TICKERS.includes(ticker)) return "bigTech";
  if (AI_SPECULATIVE_TICKERS.includes(ticker)) return "aiSpeculative";
  if (SECTOR_LEADER_TICKERS.includes(ticker)) return "sectorLeaders";
  return "unknown";
}

export function getAlertConfig(ticker: string) {
  const tier = getTickerAlertTier(ticker);
  return tier === "unknown" ? null : ALERT_CONFIG[tier];
}
