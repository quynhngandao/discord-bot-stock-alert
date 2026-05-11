import { db } from "../src/infrastructure/db/client.js";
import { symbols } from "../src/infrastructure/db/schema.js";

const TICKERS = [
  "NVDA", "GOOGL", "AAPL", "GOOG", "MSFT", "AMZN", "AVGO", "TSM", "TSLA", "META",
  "USB-PA", "WMT", "BRK-A", "BRK-B", "LLY", "MU", "JPM", "AMD", "INTC", "ASML",
  "V", "XOM", "ORCL", "JNJ", "COST", "MA", "CAT", "CSCO", "NFLX", "LRCX",
  "BAC", "CVX", "ABBV", "AMAT", "UNH", "PG", "KO", "BABA", "PLTR", "JPM-PC",
  "JPM-PD", "HD", "GE", "HSBC", "MS", "AZN", "GEV", "NVS", "GS", "MRK",
  "PM", "TXN", "BML-PH", "BML-PG", "RY", "BAC-PB", "BAC-PK", "KLAC", "BML-PL", "RTX",
  "SHEL", "WFC", "SNDK", "QCOM", "LIN", "ARM", "BML-PJ", "BAC-PE", "TM", "C",
  "IBM", "AXP", "BHP", "PEP", "TMUS", "SAP", "NVO", "ADI", "MUFG", "VZ",
  "TTE", "MCD", "NEE", "WFC-PY", "DIS", "BA", "WFC-PL", "TD", "AMGN", "ANET",
  "SAN", "STX", "T", "TMO", "RIO", "TJX", "DELL", "PANW", "BLK", "WDC",
];

const rows = TICKERS.map((ticker) => ({ ticker, isActive: true }));

await db.insert(symbols).values(rows).onConflictDoNothing();

console.log(`Seeded ${rows.length} symbols`);
process.exit(0);
