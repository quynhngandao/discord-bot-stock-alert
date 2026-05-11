import { createHash } from "crypto";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../infrastructure/db/client.js";
import { alerts, scanSnapshots } from "../infrastructure/db/schema.js";
import type { StockScanResult } from "../domain/types.js";

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function messageHash(ticker: string, date: Date): string {
  return createHash("sha256")
    .update(`${ticker}-${date.toISOString().slice(0, 10)}`)
    .digest("hex");
}

export async function wasAlertedToday(ticker: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.ticker, ticker),
        eq(alerts.alertType, "daily_scan"),
        gte(alerts.sentAt, todayStart())
      )
    );
  return rows.length > 0;
}

export async function recordAlert(ticker: string, score: number): Promise<void> {
  await db.insert(alerts).values({
    ticker,
    alertType: "daily_scan",
    direction: "BULLISH",
    score,
    messageHash: messageHash(ticker, new Date()),
  });
}

export async function saveScanSnapshot(result: StockScanResult, score: number): Promise<void> {
  const passed = result.passesMinervini && result.passesIbdApprox;
  await db.insert(scanSnapshots).values({
    ticker: result.symbol,
    scanDate: new Date(),
    score,
    passed,
    price: result.close,
    triggersJson: {
      passesMinervini: result.passesMinervini,
      passesIbdApprox: result.passesIbdApprox,
      percentFromHigh52Week: result.percentFromHigh52Week,
      epsGrowthLatestQuarter: result.epsGrowthLatestQuarter,
      revenueGrowthLatestQuarter: result.revenueGrowthLatestQuarter,
    },
  });
}
