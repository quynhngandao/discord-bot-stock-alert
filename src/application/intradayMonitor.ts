import type { StockScanResult } from "../domain/types.js";
import { fetchIntradayCandles } from "../infrastructure/market/yahooFinanceClient.js";
import { sendAlert } from "../infrastructure/discord/notificationAdapter.js";
import type { AlertPayload } from "../infrastructure/discord/notificationAdapter.js";
import { detectConditions } from "../scanner/intradayIndicators.js";
import type { IntradaySignal } from "../scanner/intradayIndicators.js";
import { isMarketOpen } from "../utils/marketCalendar.js";

const watchlist = new Map<string, StockScanResult>();
// ticker → condition → last fired timestamp (ms)
const cooldowns = new Map<string, Map<string, number>>();
const COOLDOWN_MS = 45 * 60 * 1000;

export function setIntradayWatchlist(results: StockScanResult[]): void {
  watchlist.clear();
  cooldowns.clear();
  for (const r of results) {
    watchlist.set(r.symbol, r);
  }
  console.log(`[Intraday] Watchlist set: ${results.map((r) => r.symbol).join(", ")}`);
}

function isOnCooldown(ticker: string, condition: string): boolean {
  const tickerCooldowns = cooldowns.get(ticker);
  if (!tickerCooldowns) return false;
  const lastFired = tickerCooldowns.get(condition);
  if (!lastFired) return false;
  return Date.now() - lastFired < COOLDOWN_MS;
}

function setCooldown(ticker: string, condition: string): void {
  if (!cooldowns.has(ticker)) cooldowns.set(ticker, new Map());
  cooldowns.get(ticker)!.set(condition, Date.now());
}

function buildPayload(signal: IntradaySignal, result: StockScanResult): AlertPayload {
  const { price, vwap, ema5, ema8, ema9, ema12, ema34, ema50, relVol } = signal;

  const cloud512 = ema5 > ema12 ? "Bullish" : "Bearish";
  const cloud3450 = ema34 > ema50 ? "Bullish" : "Bearish";

  const trendDescription =
    signal.direction === "BULLISH"
      ? `5-12 Cloud ${cloud512} · 34-50 Cloud ${cloud3450} · Price above VWAP`
      : `5-12 Cloud ${cloud512} · 34-50 Cloud ${cloud3450} · Price below VWAP`;

  const movingAverages =
    `EMA5/12: $${ema5.toFixed(2)}/$${ema12.toFixed(2)} · ` +
    `EMA8/9: $${ema8.toFixed(2)}/$${ema9.toFixed(2)} · ` +
    `EMA34/50: $${ema34.toFixed(2)}/$${ema50.toFixed(2)} · ` +
    `VWAP: $${vwap.toFixed(2)}`;

  const base = {
    ticker: result.symbol,
    price,
    direction: signal.direction,
    label: "WATCHLIST" as const,
    trendDescription,
    movingAverages,
    relativeVolume: relVol,
    companyName: result.companyName ?? undefined,
    industry: result.industry ?? undefined,
  };

  switch (signal.condition) {
    case "vwap_reclaim":
      return {
        ...base,
        alertType: "VWAP reclaim",
        keyLevel: vwap,
        invalidationArea: ema12,
        potentialArea: result.high52Week,
        reason: `Price reclaimed VWAP with 5-12 cloud bullish, 34-50 bias bullish, ${relVol.toFixed(1)}x vol`,
      };

    case "vwap_rejection":
      return {
        ...base,
        alertType: "VWAP rejection",
        keyLevel: vwap,
        invalidationArea: ema12,
        potentialArea: result.low52Week,
        reason: `Price rejected VWAP with 5-12 cloud bearish, 34-50 bias bearish, ${relVol.toFixed(1)}x vol`,
      };

    case "pullback_8_9":
      return {
        ...base,
        alertType: "8-9 cloud pullback",
        keyLevel: ema9,
        invalidationArea: ema12,
        potentialArea: result.high52Week,
        reason: `Price bounced off 8-9 EMA cloud with 5-12 bullish, 34-50 bias bullish, ${relVol.toFixed(1)}x vol`,
      };

    case "volume_spike":
      return {
        ...base,
        alertType: "Volume spike",
        keyLevel: price,
        invalidationArea: price * 0.99,
        potentialArea: result.high52Week,
        reason: `Unusual volume surge at ${relVol.toFixed(1)}x relative volume with positive price action`,
      };

    case "price_breakout":
      return {
        ...base,
        alertType: "52w high breakout",
        keyLevel: result.high52Week,
        invalidationArea: result.high52Week * 0.99,
        potentialArea: result.high52Week * 1.05,
        reason: `Price broke above 52-week high of $${result.high52Week.toFixed(2)} with ${relVol.toFixed(1)}x vol`,
      };
  }
}

export async function runIntradayCheck(): Promise<void> {
  if (!isMarketOpen()) return;
  if (watchlist.size === 0) return;

  console.log(`[Intraday] Checking ${watchlist.size} tickers...`);

  for (const [ticker, result] of watchlist) {
    try {
      const bars = await fetchIntradayCandles(ticker);
      if (bars.length < 3) continue;

      const signals = detectConditions(bars, result);

      for (const signal of signals) {
        if (isOnCooldown(ticker, signal.condition)) continue;

        const payload = buildPayload(signal, result);
        await sendAlert(payload);
        setCooldown(ticker, signal.condition);
        console.log(`[Intraday] ${ticker} — ${signal.condition} alert sent`);
      }
    } catch (err) {
      console.warn(`[Intraday] ${ticker} check failed: ${(err as Error).message}`);
    }
  }
}
