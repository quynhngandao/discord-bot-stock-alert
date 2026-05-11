import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { fundamentalsCache } from "./schema.js";
import type { IncomeStatement } from "../../domain/types.js";

const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export async function getCachedFundamentals(
  ticker: string
): Promise<IncomeStatement[] | null> {
  const rows = await db
    .select()
    .from(fundamentalsCache)
    .where(eq(fundamentalsCache.ticker, ticker));

  const row = rows[0];
  if (!row) return null;

  const age = Date.now() - new Date(row.cachedAt).getTime();
  if (age > CACHE_TTL_MS) return null;

  return row.data as IncomeStatement[];
}

export async function setCachedFundamentals(
  ticker: string,
  data: IncomeStatement[]
): Promise<void> {
  await db
    .insert(fundamentalsCache)
    .values({ ticker, data })
    .onConflictDoUpdate({
      target: fundamentalsCache.ticker,
      set: { data, cachedAt: new Date() },
    });
}
