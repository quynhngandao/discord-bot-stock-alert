import cron from "node-cron";
import { runScan } from "./scanOrchestrator.js";

export function startScheduler(): void {
  // 8:25 AM CST weekdays — 5 minutes before market open (8:30 AM CST / 9:30 AM ET)
  cron.schedule("25 8 * * 1-5", async () => {
    await runScan();
  }, { timezone: "America/Chicago" });

  console.log("Scheduler started — daily scan at 8:25 AM CST");
}
