import { db } from "../src/infrastructure/db/client.js";
import { symbols } from "../src/infrastructure/db/schema.js";
import { SEED_TICKERS } from "../src/data/seedTickers.js";

const rows = [...new Set(SEED_TICKERS)].map((ticker) => ({ ticker, isActive: true }));
console.log(`Seeding ${rows.length} symbols...`);

await db.insert(symbols).values(rows).onConflictDoNothing();

console.log(`Done — ${rows.length} symbols in universe`);
process.exit(0);
