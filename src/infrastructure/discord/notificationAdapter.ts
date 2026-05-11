import { TextChannel, EmbedBuilder } from "discord.js";
import { discordClient } from "./client.js";
import { env } from "../../config/env.js";
import { DISCLAIMER } from "../../config/alertConfig.js";

export interface AlertPayload {
  ticker: string;
  price: number;
  direction: "BULLISH" | "BEARISH";
  label: string;              // title suffix: "WATCHLIST", "HIGH PRIORITY", "WATCH"
  alertType: string;          // Setup field: "VWAP reclaim", "Minervini trend setup"
  trendDescription: string;   // Trend field: "Price above VWAP, 20 EMA > 50 EMA"
  movingAverages: string;     // Moving Average field: "EMA20: $X · SMA50: $X"
  relativeVolume: number;
  keyLevel: number;
  invalidationArea: number;
  potentialArea: number;
  reason: string;
  companyName?: string;
  industry?: string;
}

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const channel = await discordClient.channels.fetch(env.ALERT_CHANNEL_ID);
  if (!(channel instanceof TextChannel)) {
    throw new Error(`Channel ${env.ALERT_CHANNEL_ID} is not a text channel`);
  }

  const isBullish = payload.direction === "BULLISH";
  const isHighPriority = payload.label === "HIGH PRIORITY";
  const color = isBullish
    ? isHighPriority ? 0xffd700 : 0x00c851   // gold : green
    : isHighPriority ? 0xcc0000 : 0xff4444;  // dark red : red

  const descParts: string[] = [];
  if (payload.companyName) descParts.push(`**${payload.companyName}**`);
  if (payload.industry) descParts.push(payload.industry);
  descParts.push(isBullish ? "📈 Bullish setup detected" : "📉 Bearish setup detected");

  const embed = new EmbedBuilder()
    .setTitle(`${payload.direction} ${payload.label} — ${payload.ticker}`)
    .setDescription(descParts.join(" · "))
    .setColor(color)
    .addFields(
      { name: "Price", value: `$${payload.price.toFixed(2)}`, inline: true },
      { name: "Setup", value: payload.alertType, inline: true },
      { name: "Relative Volume", value: `${payload.relativeVolume.toFixed(1)}x`, inline: true },
      { name: "Trend", value: payload.trendDescription, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "Moving Averages", value: payload.movingAverages, inline: false },
      { name: "Key Level", value: `$${payload.keyLevel.toFixed(2)}`, inline: true },
      {
        name: "Invalidation",
        value: `${isBullish ? "Below" : "Above"} $${payload.invalidationArea.toFixed(2)}`,
        inline: true,
      },
      {
        name: isBullish ? "Potential Upside" : "Potential Downside",
        value: `$${payload.potentialArea.toFixed(2)}`,
        inline: true,
      },
      { name: "Reason", value: payload.reason, inline: false }
    )
    .setFooter({ text: DISCLAIMER })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
