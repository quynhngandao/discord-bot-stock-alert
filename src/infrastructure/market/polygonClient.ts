import { env } from "../../config/env.js";
import type { FmpHistoricalPrice, FmpIncomeStatement } from "./fmpClient.js";

const BASE_URL = "https://api.polygon.io";

async function get<T>(path: string, params: Record<string, string> = {}, retries = 1): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("apiKey", env.POLYGON_API_KEY);

  const res = await fetch(url.toString());

  if (res.status === 429 && retries > 0) {
    const waitSec = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    console.warn(`[Polygon] Rate limited — waiting ${waitSec}s before retry...`);
    await new Promise((r) => setTimeout(r, waitSec * 1000));
    return get(path, params, retries - 1);
  }

  if (!res.ok) {
    throw new Error(`[Polygon] ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface PolygonBar {
  t: number; // Unix ms (start of bar window)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface PolygonFinancialValue {
  value: number | null;
}

interface PolygonFinancialResult {
  end_date: string;
  fiscal_period: string; // Q1, Q2, Q3, Q4
  fiscal_year: string;
  financials?: {
    income_statement?: {
      revenues?: PolygonFinancialValue;
      basic_earnings_per_share?: PolygonFinancialValue;
      net_income_loss?: PolygonFinancialValue;
    };
    balance_sheet?: {
      equity?: PolygonFinancialValue;
      equity_attributable_to_parent?: PolygonFinancialValue;
    };
  };
}

// Returns 2 years of daily adjusted OHLCV sorted newest-first
export async function fetchHistoricalPrices(ticker: string): Promise<FmpHistoricalPrice[]> {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 2);

  const data = await get<{ results?: PolygonBar[]; status: string }>(
    `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}`,
    { adjusted: "true", sort: "desc", limit: "730" }
  );

  if (!data.results || data.results.length === 0) return [];

  return data.results.map((bar) => ({
    date: new Date(bar.t).toISOString().slice(0, 10),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    adjClose: bar.c, // adjusted=true → bar.c is already split/dividend-adjusted
    volume: bar.v,
  }));
}

function computeTtmRoe(results: PolygonFinancialResult[]): number | null {
  const recent = results.slice(0, 4);
  if (recent.length < 2) return null;

  const netIncomes = recent.map(
    (r) => r.financials?.income_statement?.net_income_loss?.value ?? null
  );
  if (netIncomes.some((v) => v === null)) return null;
  const ttmNetIncome = (netIncomes as number[]).reduce((a, b) => a + b, 0);

  const latestEquity =
    results[0]?.financials?.balance_sheet?.equity_attributable_to_parent?.value ??
    results[0]?.financials?.balance_sheet?.equity?.value ??
    null;

  if (latestEquity === null || latestEquity <= 0) return null;
  return (ttmNetIncome / latestEquity) * 100;
}

// Returns up to `limit` quarterly income statements (newest-first) + TTM ROE
export async function fetchFinancials(
  ticker: string,
  limit = 8
): Promise<{ statements: FmpIncomeStatement[]; ttmRoe: number | null }> {
  const data = await get<{ results?: PolygonFinancialResult[]; status: string }>(
    "/vX/reference/financials",
    { ticker, timeframe: "quarterly", limit: String(limit), sort: "filing_date", order: "desc" }
  );

  if (!data.results || data.results.length === 0) {
    return { statements: [], ttmRoe: null };
  }

  const quarterly = data.results.filter((r) => /^Q[1-4]$/.test(r.fiscal_period));

  const statements: FmpIncomeStatement[] = quarterly.map((r) => ({
    date: r.end_date,
    calendarYear: r.fiscal_year,
    period: r.fiscal_period,
    eps: r.financials?.income_statement?.basic_earnings_per_share?.value ?? null,
    revenue: r.financials?.income_statement?.revenues?.value ?? null,
    epsgrowth: null, // computed cross-quarter by indicators.ts
    revenueGrowth: null, // computed cross-quarter by indicators.ts
  }));

  const ttmRoe = computeTtmRoe(quarterly);

  return { statements, ttmRoe };
}
