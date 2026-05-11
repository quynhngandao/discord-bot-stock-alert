import { discordClient } from "../src/infrastructure/discord/client.js";
import { sendAlert } from "../src/infrastructure/discord/notificationAdapter.js";
import { env } from "../src/config/env.js";

const sampleBullish = {
  ticker: "NVDA",
  price: 134.52,
  direction: "BULLISH" as const,
  alertType: "VWAP reclaim + 5m breakout",
  trend: "Price above VWAP, 20 EMA > 50 EMA",
  relativeVolume: 1.8,
  keyLevel: 135.00,
  invalidationArea: 132.80,
  potentialArea: 138.50,
  reason: "Breakout above previous 5-minute candle high with volume confirmation",
};

const sampleBearish = {
  ticker: "TSLA",
  price: 218.40,
  direction: "BEARISH" as const,
  alertType: "VWAP rejection + 5m breakdown",
  trend: "Price below VWAP, 20 EMA < 50 EMA",
  relativeVolume: 2.1,
  keyLevel: 217.80,
  invalidationArea: 221.00,
  potentialArea: 214.50,
  reason: "Breakdown below previous 5-minute candle low with volume confirmation",
};

discordClient.once("clientReady", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Sending test alerts to channel ${env.ALERT_CHANNEL_ID}...`);

  await sendAlert(sampleBullish);
  console.log("Bullish alert sent");

  await sendAlert(sampleBearish);
  console.log("Bearish alert sent");

  discordClient.destroy();
  process.exit(0);
});

discordClient.login(env.DISCORD_TOKEN);
