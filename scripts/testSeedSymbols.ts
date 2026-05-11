import { like, notInArray } from "drizzle-orm";
import { db } from "../src/infrastructure/db/client.js";
import { symbols } from "../src/infrastructure/db/schema.js";
import { SEED_TICKERS } from "../src/data/seedTickers.js";

// Remove any dashed tickers (preferred stocks, warrants, etc.) already in DB
const deleted = await db.delete(symbols).where(like(symbols.ticker, "%-%")).returning();
if (deleted.length > 0) {
  console.log(`Removed ${deleted.length} dashed ticker(s): ${deleted.map((r) => r.ticker).join(", ")}`);
}

const validTickers = [...new Set(SEED_TICKERS)].filter((ticker) => !ticker.includes("-"));

// Remove tickers no longer in the seed list
const purged = await db
  .delete(symbols)
  .where(notInArray(symbols.ticker, validTickers))
  .returning();
if (purged.length > 0) {
  console.log(`Purged ${purged.length} ticker(s) not in seed list: ${purged.map((r) => r.ticker).join(", ")}`);
}

const rows = validTickers.map((ticker) => ({ ticker, isActive: true }));

console.log(`Seeding ${rows.length} symbols...`);
await db.insert(symbols).values(rows).onConflictDoNothing();
console.log(`Done — ${rows.length} symbols in universe`);
process.exit(0);
