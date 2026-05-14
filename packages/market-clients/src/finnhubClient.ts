import { validateEnv } from '@discord-stock-alert-bot/config';
validateEnv(process.env);

const BASE_URL = 'https://finnhub.io/api/v1';

export interface Quote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // day high
  l: number; // day low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('token', process.env.FINNHUB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

interface FinnhubProfile {
  ticker: string;
  name: string;
  finnhubIndustry: string;
  marketCapitalization: number; // in millions
  exchange: string;
  country: string;
  currency: string;
  logo: string;
  weburl: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  mktCap: number; // in dollars (converted from millions)
  industry: string; // finnhubIndustry
}

export const finnhubClient = {
  quote: (symbol: string) => get<Quote>('/quote', { symbol }),

  profile: async (symbol: string): Promise<CompanyProfile | null> => {
    try {
      const raw = await get<FinnhubProfile>('/stock/profile2', { symbol });
      if (!raw.ticker) return null; // empty response for unknown symbols
      return {
        symbol: raw.ticker,
        name: raw.name ?? '',
        mktCap: (raw.marketCapitalization ?? 0) * 1_000_000,
        industry: raw.finnhubIndustry ?? '',
      };
    } catch {
      return null;
    }
  },
};
