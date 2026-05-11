import { EmbedBuilder, TextChannel } from "discord.js";
import { env } from "../../config/env.js";
import { DISCLAIMER } from "../../config/alertConfig.js";
import type { StockScanResult } from "../../domain/types.js";
import { discordClient } from "./client.js";

export async function sendNewsAlert(
  ticker: string,
  headline: string,
  source: string,
  url: string
): Promise<void> {
  const channel = await discordClient.channels.fetch(env.ALERT_CHANNEL_ID);
  if (!(channel instanceof TextChannel)) return;

  const embed = new EmbedBuilder()
    .setTitle(`News — ${ticker}`)
    .setDescription(`**${headline}**`)
    .setColor(0xf4a261)
    .addFields(
      { name: "Source", value: source, inline: true },
      { name: "Link", value: url, inline: false }
    )
    .setFooter({ text: DISCLAIMER })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

export async function sendScanSkipped(reason: string): Promise<void> {
  const channel = await discordClient.channels.fetch(env.ALERT_CHANNEL_ID);
  if (!(channel instanceof TextChannel)) return;

  const embed = new EmbedBuilder()
    .setTitle("Scan Skipped")
    .setDescription(`No scan results available.`)
    .setColor(0x888888)
    .addFields({ name: "Reason", value: reason, inline: false })
    .setFooter({ text: "Next scan will run as scheduled." })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

export async function sendScanAlert(
  result: StockScanResult,
  score: number,
  priority: "WATCHLIST" | "HIGH PRIORITY"
): Promise<void> {
  const channel = await discordClient.channels.fetch(env.ALERT_CHANNEL_ID);
  if (!(channel instanceof TextChannel)) {
    throw new Error(`Channel ${env.ALERT_CHANNEL_ID} is not a text channel`);
  }

  const color = priority === "HIGH PRIORITY" ? 0xffd700 : 0x00b4d8;

  const rsLine = result.beatsSpy63d
    ? result.beatsSpy21d
      ? "63d ✅ · 21d ✅ (both outperforming SPY)"
      : "63d ✅ · 21d ❌ (outperforming SPY on 63d)"
    : "❌ Not outperforming SPY";

  const volRatioStr = result.volumeRatioPrevDay.toFixed(2);
  const avgVolStr = (result.averageVolume50 / 1_000_000).toFixed(1) + "M";

  const embed = new EmbedBuilder()
    .setTitle(`${priority} — ${result.symbol}`)
    .setDescription(`Daily scan · Score: **${score}/100**`)
    .setColor(color)
    .addFields(
      { name: "Close", value: `$${result.close.toFixed(2)}`, inline: true },
      { name: "From 52w High", value: `${result.percentFromHigh52Week.toFixed(1)}%`, inline: true },
      { name: "Above 52w Low", value: `+${result.percentAboveLow52Week.toFixed(1)}%`, inline: true },
      {
        name: "Trend",
        value: `50d: $${result.sma50.toFixed(2)} · 150d: $${result.sma150.toFixed(2)} · 200d: $${result.sma200.toFixed(2)}`,
        inline: false,
      },
      { name: "Relative Strength", value: rsLine, inline: false },
      {
        name: "Volume",
        value: `50d avg: ${avgVolStr} · Prior-day ratio: ${volRatioStr}x`,
        inline: false,
      }
    )
    .setFooter({ text: DISCLAIMER })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
