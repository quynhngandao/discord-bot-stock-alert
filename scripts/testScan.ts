import { discordClient } from "../src/infrastructure/discord/client.js";
import { runScan } from "../src/application/scanOrchestrator.js";

discordClient.once("clientReady", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log("Starting scan...\n");

  try {
    const results = await runScan();

    console.log("\n=== SCAN SUMMARY ===");
    for (const r of results) {
      console.log(
        `${r.symbol.padEnd(6)} score=${String(r.score).padStart(3)} ` +
        `available=${r.passesAvailableRules ? "✓" : "✗"} ` +
        `strict=${r.passesStrictRules ? "✓" : "✗"} ` +
        `data=${r.dataCompletenessScore}% ` +
        `missing=${r.missingFields.length > 0 ? r.missingFields.join(", ") : "none"}`
      );
    }

    console.log(`\nTotal candidates: ${results.length}`);
    console.log(`Strict pass:      ${results.filter((r) => r.passesStrictRules).length}`);
    console.log(`Available pass:   ${results.filter((r) => r.passesAvailableRules).length}`);
  } catch (err) {
    console.error("Scan failed:", err);
  }

  discordClient.destroy();
  process.exit(0);
});

discordClient.login(process.env.DISCORD_TOKEN!);
