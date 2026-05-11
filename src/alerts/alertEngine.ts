import { scannerConfig } from "../config/scannerConfig.js";
import type { StockScanResult } from "../domain/types.js";
import { sendScanAlert } from "../infrastructure/discord/scanAlertAdapter.js";
import { recordAlert, saveScanSnapshot, wasAlertedToday } from "./dedupeService.js";

const { minScoreForWatchlist, minScoreForPriority } = scannerConfig.alertThresholds;
const { minAlertDataCompletenessScore } = scannerConfig.dataQuality;

export async function processResults(results: StockScanResult[]): Promise<void> {
  let sent = 0;
  let skipped = 0;

  for (const result of results) {
    // Must pass all available rules (lenient: missing fields are skipped, not failed)
    // Require paid Finnhub plan for real-time news-based alerts.
    if (!result.passesAvailableRules) {
      skipped++;
      continue;
    }

    // Data quality gate: too many missing fields means unreliable signal
    if (result.dataCompletenessScore < minAlertDataCompletenessScore) {
      skipped++;
      continue;
    }

    // Score gate
    if (result.score < minScoreForWatchlist) {
      skipped++;
      continue;
    }

    const alreadySent = await wasAlertedToday(result.symbol);
    if (alreadySent) {
      skipped++;
      continue;
    }

    const priority = result.score >= minScoreForPriority ? "HIGH PRIORITY" : "WATCHLIST";

    try {
      await sendScanAlert(result, result.score, priority);
      await recordAlert(result.symbol, result.score);
      await saveScanSnapshot(result, result.score);
      sent++;
    } catch (err) {
      console.error(`Failed to send alert for ${result.symbol}:`, err);
    }
  }

  console.log(`Alert engine: ${sent} sent, ${skipped} skipped`);
}
