import { eq } from "drizzle-orm";
import { db } from "../infrastructure/db/client.js";
import { symbols } from "../infrastructure/db/schema.js";

export async function runScan(): Promise<void> {
  const rows = await db
    .select({ ticker: symbols.ticker })
    .from(symbols)
    .where(eq(symbols.isActive, true));

  const tickers = rows.map((r) => r.ticker);

  console.log(`Scanning ${tickers.length} symbols...`);
  // TODO: fetch quotes → compute indicators → apply rules → score → decide → alert
}
