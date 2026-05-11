import type { HistoricalPrice } from "../domain/types.js";
import type { StockScanResult } from "../domain/types.js";

export interface IntradaySignal {
  condition: "vwap_reclaim" | "vwap_rejection" | "pullback_8_9" | "volume_spike" | "price_breakout";
  direction: "BULLISH" | "BEARISH";
  price: number;
  vwap: number;
  ema5: number;
  ema8: number;
  ema9: number;
  ema12: number;
  ema34: number;
  ema50: number;
  relVol: number;
}

export function computeVwap(bars: HistoricalPrice[]): number {
  let cumTypicalVolume = 0;
  let cumVolume = 0;
  for (const bar of bars) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumTypicalVolume += typicalPrice * bar.volume;
    cumVolume += bar.volume;
  }
  return cumVolume === 0 ? 0 : cumTypicalVolume / cumVolume;
}

export function computeEma(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = closes[0]!;
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i]! * k + ema * (1 - k);
  }
  return ema;
}

// Compares today's cumulative volume to the expected volume at this point in the session.
// Assumes ~78 bars in a full 6.5hr session (5m bars).
export function computeIntradayRelVol(bars: HistoricalPrice[], avgDailyVolume: number): number {
  if (avgDailyVolume === 0 || bars.length === 0) return 0;
  const cumVolume = bars.reduce((sum, b) => sum + b.volume, 0);
  const expectedVolume = (avgDailyVolume / 78) * bars.length;
  return expectedVolume === 0 ? 0 : cumVolume / expectedVolume;
}

export function detectConditions(
  bars: HistoricalPrice[],
  scanResult: StockScanResult
): IntradaySignal[] {
  // Need enough bars for EMA50 to be meaningful
  if (bars.length < 20) return [];

  const closes = bars.map((b) => b.close);
  const vwap = computeVwap(bars);
  const ema5  = computeEma(closes, 5);
  const ema8  = computeEma(closes, 8);
  const ema9  = computeEma(closes, 9);
  const ema12 = computeEma(closes, 12);
  const ema34 = computeEma(closes, 34);
  const ema50 = computeEma(closes, 50);
  const relVol = computeIntradayRelVol(bars, scanResult.averageVolume50);

  const last = bars[bars.length - 1]!;
  const prev = bars[bars.length - 2]!;
  const price = last.close;

  // Cloud states
  const cloud_5_12_bullish  = ema5 > ema12;
  const cloud_5_12_bearish  = ema5 < ema12;
  const cloud_34_50_bullish = ema34 > ema50;
  const cloud_34_50_bearish = ema34 < ema50;

  const signals: IntradaySignal[] = [];
  const base = { price, vwap, ema5, ema8, ema9, ema12, ema34, ema50, relVol };

  // VWAP reclaim — price crosses above VWAP, 5-12 cloud bullish, 34-50 bias bullish
  if (prev.close <= vwap && last.close > vwap && cloud_5_12_bullish && cloud_34_50_bullish && relVol > 1.3) {
    signals.push({ ...base, condition: "vwap_reclaim", direction: "BULLISH" });
  }

  // VWAP rejection — price crosses below VWAP, 5-12 cloud bearish, 34-50 bias bearish
  if (prev.close >= vwap && last.close < vwap && cloud_5_12_bearish && cloud_34_50_bearish && relVol > 1.3) {
    signals.push({ ...base, condition: "vwap_rejection", direction: "BEARISH" });
  }

  // 8-9 cloud pullback — price dips to 8-9 cloud then bounces, bias bullish
  if (
    prev.low <= ema9 &&          // previous bar touched the 8-9 cloud
    last.close > ema8 &&         // current bar closed above the cloud
    cloud_5_12_bullish &&
    cloud_34_50_bullish &&
    relVol > 1.2
  ) {
    signals.push({ ...base, condition: "pullback_8_9", direction: "BULLISH" });
  }

  // Volume spike — unusual surge with positive price action
  if (relVol > 2.5 && last.close > prev.close) {
    signals.push({ ...base, condition: "volume_spike", direction: "BULLISH" });
  }

  // Price breakout above 52-week high with volume confirmation
  if (prev.close < scanResult.high52Week && last.close >= scanResult.high52Week && relVol > 1.5) {
    signals.push({ ...base, condition: "price_breakout", direction: "BULLISH" });
  }

  return signals;
}
