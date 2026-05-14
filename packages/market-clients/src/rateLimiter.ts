// Tiingo free: ~50 requests/hour. 500ms spacing = max 120/hour, but quota is the real limit.
// Finnhub free: 30 calls/min. Polygon free: 5 calls/min.
const DEFAULT_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRateLimit<T>(calls: Array<() => Promise<T>>, delayMs = DEFAULT_DELAY_MS): Promise<T[]> {
  const results: T[] = [];
  for (const call of calls) {
    results.push(await call());
    await delay(delayMs);
  }
  return results;
}
