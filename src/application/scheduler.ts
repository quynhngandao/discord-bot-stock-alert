import cron from "node-cron";
import { runScan } from "./scanOrchestrator.js";
import { runIntradayCheck } from "./intradayMonitor.js";
import { runDailyCleanup } from "../alerts/cleanupService.js";
import { isMarketHoliday } from "../utils/marketCalendar.js";

export function startScheduler(): void {
  // Daily scan — 8:05 AM CST weekdays (25 min before market open at 8:30 AM CST / 9:30 AM ET)
  cron.schedule(
    "5 8 * * 1-5",
    async () => {
      if (isMarketHoliday()) {
        console.log("Market holiday — skipping scan.");
        return;
      }
      await runScan();
    },
    { timezone: "America/Chicago" }
  );

  // Intraday monitor — every 5 min during market hours on weekdays
  cron.schedule(
    "*/5 8-15 * * 1-5",
    async () => {
      await runIntradayCheck();
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
