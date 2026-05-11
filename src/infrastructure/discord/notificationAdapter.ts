import { TextChannel, EmbedBuilder } from "discord.js";
import { discordClient } from "./client.js";
import { env } from "../../config/env.js";
import { DISCLAIMER } from "../../config/alertConfig.js";

export interface AlertPayload {
  ticker: string;
  price: number;
  direction: "BULLISH" | "BEARISH";
  alertType: string;
  trend: string;
  relativeVolume: number;
  keyLevel: number;
  invalidationArea: number;
  potentialArea: number;
  reason: string;
}

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const channel = await discordClient.channels.fetch(env.ALERT_CHANNEL_ID);
  if (!(channel instanceof TextChannel)) {
    throw new Error(`Channel ${env.ALERT_CHANNEL_ID} is not a text channel`);
  }

  const isBullish = payload.direction === "BULLISH";
  const embed = new EmbedBuilder()
    .setTitle(`${payload.direction} WATCH — ${payload.ticker}`)
    .setDescription(isBullish ? "📈 Bullish setup detected" : "📉 Bearish setup detected")
    .setColor(isBullish ? 0x00c851 : 0xff4444)
    .addFields(
      { name: "Price", value: `$${payload.price.toFixed(2)}`, inline: true },
      { name: "Setup", value: payload.alertType, inline: true },
      { name: "Relative Volume", value: `${payload.relativeVolume.toFixed(1)}x`, inline: true },
      { name: "Trend", value: payload.trend, inline: false },
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
