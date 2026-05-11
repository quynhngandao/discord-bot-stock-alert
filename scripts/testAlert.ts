import { discordClient } from "../src/infrastructure/discord/client.js";
import { sendAlert } from "../src/infrastructure/discord/notificationAdapter.js";
import { env } from "../src/config/env.js";

const sampleHighPriority = {
  ticker: "MU",
  price: 108.45,
  direction: "BULLISH" as const,
  label: "HIGH PRIORITY",
  alertType: "Minervini trend setup",
  trendDescription: "Price above 50d, 150d, and 200d SMA",
  movingAverages: "SMA50: $101.20 · SMA150: $94.80 · SMA200: $89.55",
  relativeVolume: 1.45,
  keyLevel: 101.20,
  invalidationArea: 94.80,
  potentialArea: 157.54,
  reason: "Score 100/100 · EPS +42.3% · Rev +18.7% · Outperforming SPY on 63d and 21d",
  companyName: "Micron Technology",
  industry: "Semiconductors",
};

const sampleWatchlist = {
  ticker: "AMD",
  price: 134.22,
  direction: "BULLISH" as const,
  label: "WATCHLIST",
  alertType: "Minervini trend setup",
  trendDescription: "Price above 50d, 150d, and 200d SMA",
  movingAverages: "SMA50: $128.10 · SMA150: $118.40 · SMA200: $110.75",
  relativeVolume: 1.12,
  keyLevel: 128.10,
  invalidationArea: 118.40,
  potentialArea: 227.30,
  reason: "Score 95/100 · EPS +15.2% · Rev +8.9% · Outperforming SPY on 63d",
  companyName: "Advanced Micro Devices",
  industry: "Semiconductors",
};

const sampleIntraday = {
  ticker: "NVDA",
  price: 134.52,
  direction: "BULLISH" as const,
  label: "WATCHLIST",
  alertType: "VWAP reclaim",
  trendDescription: "5-12 Cloud Bullish · 34-50 Cloud Bullish · Price above VWAP",
  movingAverages: "EMA5/12: $134.20/$133.10 · EMA8/9: $133.80/$133.60 · EMA34/50: $131.20/$130.45 · VWAP: $132.80",
  relativeVolume: 1.8,
  keyLevel: 132.80,
  invalidationArea: 133.10,
  potentialArea: 153.13,
  reason: "Price reclaimed VWAP with 5-12 cloud bullish, 34-50 bias bullish, 1.8x vol",
  companyName: "NVIDIA Corporation",
  industry: "Semiconductors",
};

const sampleBearishWatchlist = {
  ticker: "TSLA",
  price: 218.40,
  direction: "BEARISH" as const,
  label: "WATCHLIST",
  alertType: "VWAP rejection",
  trendDescription: "5-12 Cloud Bearish · 34-50 Cloud Bearish · Price below VWAP",
  movingAverages: "EMA5/12: $219.10/$220.30 · EMA8/9: $219.40/$219.60 · EMA34/50: $221.80/$223.10 · VWAP: $220.50",
  relativeVolume: 1.9,
  keyLevel: 220.50,
  invalidationArea: 220.30,
  potentialArea: 198.20,
  reason: "Price rejected VWAP with 5-12 cloud bearish, 34-50 bias bearish, 1.9x vol",
  companyName: "Tesla Inc.",
  industry: "Auto Manufacturers",
};

discordClient.on("ready", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Sending test alerts to channel ${env.ALERT_CHANNEL_ID}...`);

  await sendAlert(sampleHighPriority);
  console.log("Bullish HIGH PRIORITY alert sent");

  await sendAlert(sampleWatchlist);
  console.log("Bullish WATCHLIST alert sent");

  await sendAlert(sampleIntraday);
  console.log("Intraday WATCHLIST alert sent");

  await sendAlert(sampleBearishWatchlist);
  console.log("Bearish WATCHLIST alert sent");

  discordClient.destroy();
  process.exit(0);
});

discordClient.login(env.DISCORD_TOKEN);
