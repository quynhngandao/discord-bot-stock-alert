import { lt } from "drizzle-orm";
import { db } from "../infrastructure/db/client.js";
import { alerts, fundamentalsCache, scanSnapshots } from "../infrastructure/db/schema.js";

const RETENTION_DAYS = 30;
const CACHE_RETENTION_DAYS = 7; // keep fundamentals cache a bit longer than TTL for safety

export async function runDailyCleanup(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const cacheCutoff = new Date();
  cacheCutoff.setDate(cacheCutoff.getDate() - CACHE_RETENTION_DAYS);

  await Promise.all([
    db.delete(alerts).where(lt(alerts.sentAt, cutoff)),
    db.delete(scanSnapshots).where(lt(scanSnapshots.scanDate, cutoff)),
    db.delete(fundamentalsCache).where(lt(fundamentalsCache.cachedAt, cacheCutoff)),
  ]);

  console.log(
    `Cleanup: removed alerts/snapshots older than ${RETENTION_DAYS} days, fundamentals cache older than ${CACHE_RETENTION_DAYS} days`
  );
}
