import { db } from "../src/infrastructure/db/client.js";
import { symbols } from "../src/infrastructure/db/schema.js";
import { fetchTopUSTickers } from "../src/infrastructure/market/fmpClient.js";

console.log("Fetching top 100 US tickers from FMP...");
const tickers = await fetchTopUSTickers(100);
console.log(`Fetched ${tickers.length} tickers`);

const rows = tickers.map((ticker) => ({ ticker, isActive: true }));
await db.insert(symbols).values(rows).onConflictDoNothing();

console.log(`Seeded ${rows.length} symbols`);
process.exit(0);
