import { env } from "../../config/env.js";
import type { CompanyProfile } from "./finnhubClient.js";

const BASE_URL = "https://www.alphavantage.co/query";

interface AlphaVantageOverview {
  Symbol: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  ReturnOnEquityTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
}

async function fetchOverview(symbol: string): Promise<AlphaVantageOverview | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("function", "OVERVIEW");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", env.ALPHA_VANTAGE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, string>;
  if (!data["Symbol"]) return null; // rate-limited or unknown symbol

  return data as unknown as AlphaVantageOverview;
}

// Fallback profile when Finnhub returns null
export async function fetchProfileFallback(symbol: string): Promise<CompanyProfile | null> {
  try {
    const data = await fetchOverview(symbol);
    if (!data) return null;
    return {
      symbol,
      mktCap: Number(data.MarketCapitalization) || 0,
      sector: data.Sector ?? "",
      industry: data.Industry ?? "",
    };
  } catch {
    return null;
  }
}

// Supplemental fundamentals: ROE and YoY growth rates
export async function fetchFundamentalsFallback(symbol: string): Promise<{
  roe: number | null;
  epsGrowthYoY: number | null;
  revenueGrowthYoY: number | null;
} | null> {
  try {
    const data = await fetchOverview(symbol);
    if (!data) return null;
    return {
      roe: parseFloat(data.ReturnOnEquityTTM) || null,
      epsGrowthYoY: data.QuarterlyEarningsGrowthYOY
        ? parseFloat(data.QuarterlyEarningsGrowthYOY) * 100
        : null,
      revenueGrowthYoY: data.QuarterlyRevenueGrowthYOY
        ? parseFloat(data.QuarterlyRevenueGrowthYOY) * 100
        : null,
    };
  } catch {
    return null;
  }
}
