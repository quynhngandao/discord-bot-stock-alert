import { env } from "./config/env.js";
import { discordClient } from "./infrastructure/discord/client.js";
import { startNewsWebSocket } from "./infrastructure/market/newsWebSocket.js";
import { startScheduler } from "./application/scheduler.js";

discordClient.once("clientReady", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  await startNewsWebSocket();
  startScheduler();
});

discordClient.login(env.DISCORD_TOKEN);
