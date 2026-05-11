import { lt } from "drizzle-orm";
import { db } from "../infrastructure/db/client.js";
import { alerts, scanSnapshots } from "../infrastructure/db/schema.js";

const RETENTION_DAYS = 30;

export async function runDailyCleanup(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  await Promise.all([
    db.delete(alerts).where(lt(alerts.sentAt, cutoff)),
    db.delete(scanSnapshots).where(lt(scanSnapshots.scanDate, cutoff)),
  ]);

  console.log(`Cleanup: removed alerts and scan snapshots older than ${RETENTION_DAYS} days (cutoff: ${cutoff.toDateString()})`);
}
