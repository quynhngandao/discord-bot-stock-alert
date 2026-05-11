import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { alerts, symbols } from "../db/schema.js";
import { runScan } from "../../application/scanOrchestrator.js";
import { isMarketClosed } from "../../utils/marketCalendar.js";
import { DISCLAIMER } from "../../config/alertConfig.js";

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function handleScan(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (isMarketClosed()) {
    await interaction.editReply("Market is closed today — scan skipped. Use `/scan` on a trading day.");
    return;
  }

  try {
    const results = await runScan();
    const passed = results.filter((r) => r.passesAvailableRules).length;
    await interaction.editReply(`Scan complete — ${results.length} candidates, ${passed} passed filters.`);
  } catch (err) {
    await interaction.editReply(`Scan failed: ${(err as Error).message}`);
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const symbolRows = await db.select().from(symbols);
  const activeCount = symbolRows.filter((s) => s.isActive).length;

  const nextScan = "Weekdays at 8:05 AM CST (25 min before market open)";
  const marketStatus = isMarketClosed() ? "Closed" : "Open";

  const embed = new EmbedBuilder()
    .setTitle("Bot Status")
    .setColor(0x00b4d8)
    .addFields(
      { name: "Market", value: marketStatus, inline: true },
      { name: "Symbols", value: `${activeCount} active`, inline: true },
      { name: "Next Scan", value: nextScan, inline: false }
    )
    .setFooter({ text: DISCLAIMER })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleWatchlist(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const rows = await db
    .select()
    .from(alerts)
    .where(gte(alerts.sentAt, todayStart()))
    .limit(10);

  if (rows.length === 0) {
    await interaction.editReply("No alerts sent today.");
    return;
  }

  const lines = rows.map(
    (a) => `**${a.ticker}** — score ${a.score ?? "N/A"} · ${a.alertType} · ${new Date(a.sentAt).toLocaleTimeString("en-US", { timeZone: "America/Chicago" })} CST`
  );

  const embed = new EmbedBuilder()
    .setTitle("Today's Alerts")
    .setColor(0xffd700)
    .setDescription(lines.join("\n"))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (interaction.commandName === "scan") await handleScan(interaction);
    else if (interaction.commandName === "status") await handleStatus(interaction);
    else if (interaction.commandName === "watchlist") await handleWatchlist(interaction);
  } catch (err) {
    console.error(`[Command] ${interaction.commandName} failed:`, err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("Something went wrong.").catch(() => null);
    } else {
      await interaction.reply({ content: "Something went wrong.", ephemeral: true }).catch(() => null);
    }
  }
}
