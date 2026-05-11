import { env } from "./config/env.js";
import { discordClient } from "./infrastructure/discord/client.js";
import { startScheduler } from "./application/scheduler.js";
// import { startNewsWebSocket } from "./infrastructure/market/newsWebSocket.js"; // requires Finnhub paid plan

discordClient.once("clientReady", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  startScheduler();
  // await startNewsWebSocket(); // requires Finnhub paid plan — uncomment to enable
});

discordClient.login(env.DISCORD_TOKEN);
