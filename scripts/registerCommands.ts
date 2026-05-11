import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { env } from "../src/config/env.js";

const commands = [
  new SlashCommandBuilder()
    .setName("scan")
    .setDescription("Trigger a manual scan now"),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show bot status — symbols loaded, next scan time"),

  new SlashCommandBuilder()
    .setName("watchlist")
    .setDescription("Show the last 10 alerts sent today"),
].map((c) => c.toJSON());

const rest = new REST().setToken(env.DISCORD_TOKEN);

await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
  body: commands,
});

console.log(`Registered ${commands.length} slash commands.`);
process.exit(0);
