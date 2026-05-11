import { EmbedBuilder, TextChannel } from "discord.js";
import { env } from "../../config/env.js";
import { DISCLAIMER } from "../../config/alertConfig.js";
import type { StockScanResult } from "../../domain/types.js";
import { discordClient } from "./client.js";

function fmt(n: number | null, suffix = "%"): string {
  if (n === null) return "N/A";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}${suffix}`;
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

  const embed = new EmbedBuilder()
    .setTitle(`${priority} — ${result.symbol}`)
    .setDescription(`Daily scan result · Score: **${score}/100**`)
    .setColor(color)
    .addFields(
      {
        name: "Price",
        value: `$${result.close.toFixed(2)}`,
        inline: true,
      },
      {
        name: "From 52w High",
        value: fmt(result.percentFromHigh52Week),
        inline: true,
      },
      {
        name: "Above 52w Low",
        value: fmt(result.percentAboveLow52Week),
        inline: true,
      },
      {
        name: "SMA",
        value: `50: $${result.sma50.toFixed(2)} · 150: $${result.sma150.toFixed(2)} · 200: $${result.sma200.toFixed(2)}`,
        inline: false,
      },
      {
        name: "EPS Growth (Q)",
        value: fmt(result.epsGrowthLatestQuarter),
        inline: true,
      },
      {
        name: "Revenue Growth (Q)",
        value: fmt(result.revenueGrowthLatestQuarter),
        inline: true,
      },
      {
        name: "Filters",
        value: `Minervini: ${result.passesMinervini ? "✅" : "❌"} · IBD: ${result.passesIbdApprox ? "✅" : "❌"}`,
        inline: false,
      }
    )
    .setFooter({ text: DISCLAIMER })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
