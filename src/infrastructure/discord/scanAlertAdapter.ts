import { EmbedBuilder, TextChannel } from "discord.js";
import { env } from "../../config/env.js";
import { DISCLAIMER } from "../../config/alertConfig.js";
import type { StockScanResult } from "../../domain/types.js";
import { discordClient } from "./client.js";
import { sendAlert } from "./notificationAdapter.js";

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
  const formatGrowth = (v: number | null) =>
    v === null ? "N/A" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  const rsVsSpy = result.beatsSpy63d
    ? result.beatsSpy21d ? "Outperforming SPY on 63d and 21d" : "Outperforming SPY on 63d"
    : "Underperforming SPY";

  await sendAlert({
    ticker: result.symbol,
    price: result.close,
    direction: "BULLISH",
    label: priority,
    alertType: "Minervini trend setup",
    trendDescription: `Price above 50d, 150d, and 200d SMA`,
    movingAverages: `SMA50: $${result.sma50.toFixed(2)} · SMA150: $${result.sma150.toFixed(2)} · SMA200: $${result.sma200.toFixed(2)}`,
    relativeVolume: result.volumeRatioPrevDay,
    keyLevel: result.sma50,
    invalidationArea: result.sma150,
    potentialArea: result.high52Week,
    reason: `Score ${score}/100 · EPS ${formatGrowth(result.epsGrowthLatestQuarter)} · Rev ${formatGrowth(result.revenueGrowthLatestQuarter)} · ${rsVsSpy}`,
    companyName: result.companyName ?? undefined,
    industry: result.industry ?? undefined,
  });
}
