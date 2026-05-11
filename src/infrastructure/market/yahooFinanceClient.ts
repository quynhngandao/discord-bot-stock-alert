import type { HistoricalPrice } from "../../domain/types.js";

const BASE_URL = "https://query2.finance.yahoo.com";

interface YahooChartResult {
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
      volume: (number | null)[];
    }>;
    adjclose?: Array<{ adjclose: (number | null)[] }>;
  };
}

interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: { code: string; description: string } | null;
  };
}

function unixToDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function twoYearsAgo(): number {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return Math.floor(d.getTime() / 1000);
}

function todayMidnightUnix(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

async function fetchYahooChart(
  symbol: string,
  period1: number,
  period2: number,
  interval: string
): Promise<HistoricalPrice[]> {
  const url = new URL(`${BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(period2));
  url.searchParams.set("interval", interval);
  url.searchParams.set("includeAdjustedClose", "true");
  url.searchParams.set("events", "div|split");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance chart/${symbol} failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as YahooChartResponse;

  if (json.chart.error) {
    throw new Error(`Yahoo Finance error for ${symbol}: ${json.chart.error.description}`);
  }

  const result = json.chart.result?.[0];
  if (!result || !result.timestamp?.length) return [];

  const quote = result.indicators.quote[0];
  const adjClose = result.indicators.adjclose?.[0]?.adjclose;
  if (!quote) return [];

  const prices: HistoricalPrice[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = quote.close[i];
    if (close === null || close === undefined) continue;

    prices.push({
      date: unixToDate(result.timestamp[i]!),
      open: quote.open[i] ?? close,
      high: quote.high[i] ?? close,
      low: quote.low[i] ?? close,
      close,
      adjClose: adjClose?.[i] ?? close,
      volume: quote.volume[i] ?? 0,
    });
  }

  return prices;
}

// Returns newest-first to match the convention expected by indicators.ts
export async function fetchHistoricalPrices(symbol: string): Promise<HistoricalPrice[]> {
  const prices = await fetchYahooChart(symbol, twoYearsAgo(), Math.floor(Date.now() / 1000), "1d");
  return prices.reverse();
}

// Returns oldest-first intraday 5m bars for today
export async function fetchIntradayCandles(symbol: string): Promise<HistoricalPrice[]> {
  return fetchYahooChart(symbol, todayMidnightUnix(), Math.floor(Date.now() / 1000), "5m");
}
