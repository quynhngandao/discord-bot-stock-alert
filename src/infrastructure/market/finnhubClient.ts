import { env } from "../../config/env.js";

const BASE_URL = "https://finnhub.io/api/v1";

export interface Quote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // day high
  l: number;  // day low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("token", env.FINNHUB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const finnhubClient = {
  quote: (symbol: string) => get<Quote>("/quote", { symbol }),
};
