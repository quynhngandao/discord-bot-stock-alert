const DEFAULT_DELAY_MS = 100; // 10 calls/sec, well under Finnhub (30/sec) and FMP (30/sec) limits

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRateLimit<T>(
  calls: Array<() => Promise<T>>,
  delayMs = DEFAULT_DELAY_MS
): Promise<T[]> {
  const results: T[] = [];
  for (const call of calls) {
    results.push(await call());
    await delay(delayMs);
  }
  return results;
}
