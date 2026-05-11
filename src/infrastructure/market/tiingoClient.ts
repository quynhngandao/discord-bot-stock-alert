import { env } from "../../config/env.js";
import type { FmpHistoricalPrice } from "./fmpClient.js";

const BASE_URL = "https://api.tiingo.com";

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("token", env.TIINGO_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) return [] as unknown as T;
    if (res.status === 429) throw new Error(`Tiingo rate limit hit — wait before retrying`);
    throw new Error(`Tiingo ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface TiingoEodRow {
  date: string; // "2024-01-02T00:00:00+00:00"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
  adjOpen: number;
  adjHigh: number;
  adjLow: number;
  adjVolume: number;
}

function twoYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

// Returns newest-first to match the expected convention in indicators.ts
export async function fetchHistoricalPrices(symbol: string): Promise<FmpHistoricalPrice[]> {
  const rows = await get<TiingoEodRow[]>(`/tiingo/daily/${symbol}/prices`, {
    startDate: twoYearsAgo(),
  });

  return rows
    .map(
      (r): FmpHistoricalPrice => ({
        date: r.date.slice(0, 10),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        adjClose: r.adjClose,
        volume: r.volume,
      })
    )
    .reverse(); // Tiingo returns oldest-first; flip to newest-first
}
