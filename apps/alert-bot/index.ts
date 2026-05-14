import { ChatInputCommandInteraction, Events } from 'discord.js';
import { validateEnv } from '@discord-stock-alert-bot/config';
import { discordClient, handleCommand } from '@discord-stock-alert-bot/discord-client';
import { startScheduler } from '#scheduler';

validateEnv(process.env);

discordClient.once('clientReady', async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  startScheduler();
});

discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleCommand(interaction as ChatInputCommandInteraction);
});

discordClient.login(process.env.DISCORD_TOKEN);
