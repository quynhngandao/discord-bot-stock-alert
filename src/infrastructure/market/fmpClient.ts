import { env } from "../../config/env.js";

const BASE_URL = "https://financialmodelingprep.com/stable";

interface FmpScreenerResult {
  symbol: string;
  marketCap: number | null;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
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

export async function fetchTopUSTickers(limit = 100): Promise<string[]> {
  const stocks = await get<FmpScreenerResult[]>("/company-screener", {
    country: "US",
    isActivelyTrading: "true",
    limit: String(limit * 3),
  });

  return stocks
    .filter((s): boolean => Boolean(s.symbol))
    .sort((a, b): number => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, limit)
    .map((s): string => s.symbol);
}
