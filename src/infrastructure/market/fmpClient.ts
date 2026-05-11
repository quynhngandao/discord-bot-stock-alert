import { env } from "../../config/env.js";

// /stable/ requires a paid plan. /api/v3/ is the free-tier API.
const BASE_URL = "https://financialmodelingprep.com/api/v3";

export interface FmpProfile {
  symbol: string;
  mktCap: number;
  sector: string;
  industry: string;
}

export interface FmpIncomeStatement {
  date: string;
  calendarYear: string;
  period: string;
  eps: number | null;
  revenue: number | null;
  epsgrowth: number | null;
  revenueGrowth: number | null;
}

export interface FmpHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("apikey", env.FMP_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`FMP ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Requires FMP paid plan — uncomment when upgrading.
// export interface FmpStockListItem {
//   symbol: string;
//   price: number;
//   exchangeShortName: string;
//   type: string;
// }
//
// const US_EXCHANGES = new Set(["NYSE", "NASDAQ", "AMEX"]);
//
// export async function fetchTopUSTickers(limit = 100): Promise<string[]> {
//   const stocks = await get<FmpStockListItem[]>("/stock-list");
//   return stocks
//     .filter((s) => US_EXCHANGES.has(s.exchangeShortName) && s.type === "stock" && s.price >= 5)
//     .slice(0, limit)
//     .map((s) => s.symbol);
// }

export async function fetchProfile(symbol: string): Promise<FmpProfile | null> {
  const results = await get<FmpProfile[]>(`/profile/${symbol}`);
  return results[0] ?? null;
}

export async function fetchIncomeStatements(symbol: string, limit = 8): Promise<FmpIncomeStatement[]> {
  return get<FmpIncomeStatement[]>(`/income-statement/${symbol}`, {
    period: "quarter",
    limit: String(limit),
  });
}

export async function fetchHistoricalPrices(symbol: string): Promise<FmpHistoricalPrice[]> {
  const res = await get<{ historical: FmpHistoricalPrice[] }>(
    `/historical-price-full/${symbol}`
  );
  return res.historical ?? [];
}
