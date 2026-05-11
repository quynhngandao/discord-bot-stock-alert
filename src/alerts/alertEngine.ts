import { scannerConfig } from "../config/scannerConfig.js";
import type { StockScanResult } from "../domain/types.js";
import { sendScanAlert } from "../infrastructure/discord/scanAlertAdapter.js";
import { recordAlert, saveScanSnapshot, wasAlertedToday } from "./dedupeService.js";

const { minScoreForWatchlist, minScoreForPriority } = scannerConfig.alertThresholds;
const { minVolumeRatio, maxPercentFromHigh } = scannerConfig.highPriority;

export async function processResults(results: StockScanResult[]): Promise<void> {
  let sent = 0;
  let skipped = 0;

  for (const result of results) {
    // Must pass all Minervini rules (lenient: missing SPY data is skipped, not failed)
    if (!result.passesMinervini) {
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

    const isHighPriority =
      result.score >= minScoreForPriority &&
      (result.volumeRatioPrevDay >= minVolumeRatio ||
        result.percentFromHigh52Week <= maxPercentFromHigh);

    const priority = isHighPriority ? "HIGH PRIORITY" : "WATCHLIST";

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
