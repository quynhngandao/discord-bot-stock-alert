import cron from "node-cron";
import { runScan } from "./scanOrchestrator.js";
import { runDailyCleanup } from "../alerts/cleanupService.js";

export function startScheduler(): void {
  // Daily scan — 8:05 AM CST weekdays (25 min before market open at 8:30 AM CST / 9:30 AM ET)
  cron.schedule(
    "5 8 * * 1-5",
    async () => {
      await runScan();
    },
    { timezone: "America/Chicago" }
  );

  // Weekly cleanup — Sunday midnight CST
  cron.schedule(
    "0 0 * * 0",
    async () => {
      await runDailyCleanup();
    },
    { timezone: "America/Chicago" }
  );

  console.log("Scheduler started — daily scan at 8:05 AM CST, cleanup Sunday midnight CST");
}
