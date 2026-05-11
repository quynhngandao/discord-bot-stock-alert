import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "../src/config/env.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  console.log("Waiting for /ping interaction...");
});

client.on(Events.InteractionCreate, async (interaction) => {
  console.log("Interaction received:", interaction.type, (interaction as { commandName?: string }).commandName ?? "");

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply({ content: "Pong!", ephemeral: true });
    console.log("Replied with Pong!");
  }
});

client.login(env.DISCORD_TOKEN);
