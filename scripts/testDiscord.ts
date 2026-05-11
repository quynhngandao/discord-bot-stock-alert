import { discordClient } from "../src/infrastructure/discord/client.js";
import { sendScanAlert } from "../src/infrastructure/discord/scanAlertAdapter.js";
import type { StockScanResult } from "../src/domain/types.js";

const mockResult: StockScanResult = {
  symbol: "NVDA",
  close: 134.52,
  marketCap: 3_300_000_000_000,
  sector: "Technology",
  industry: "Semiconductors",
  epsGrowthLatestQuarter: 88.0,
  revenueGrowthLatestQuarter: 69.0,
  sma50: 118.40,
  sma150: 105.20,
  sma200: 98.60,
  high52Week: 149.77,
  low52Week: 86.22,
  percentFromHigh52Week: 10.2,
  percentAboveLow52Week: 56.0,
  averageVolume50: 285_000_000,
  relativeStrengthRank: 94,
  passesMinervini: true,
  passesIbdApprox: true,
  passesAvailableRules: true,
  passesStrictRules: true,
  missingFields: [],
  dataCompletenessScore: 100,
  score: 87,
  scoreBreakdown: { trend: 36, leadership: 27, setup: 14, market: 10, total: 87 },
};

discordClient.once("clientReady", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  await sendScanAlert(mockResult, mockResult.score, "HIGH PRIORITY");
  console.log("Test alert sent — check your Discord channel");
  discordClient.destroy();
  process.exit(0);
});

discordClient.login(process.env.DISCORD_TOKEN!);
