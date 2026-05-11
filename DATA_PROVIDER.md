# Data Provider Notes

## Current provider mapping

| Need | Provider | Notes |
|---|---|---|
| Daily OHLCV / price history | **Tiingo** | All symbols including SPY, every scan |
| Quarterly income statements + TTM ROE | **Polygon** | Post-Minervini filter only (free: 5 calls/min) |
| Company profile, sector, industry | **Finnhub** | Post-Minervini filter only (free: 60 calls/min) |

`FMP_API_KEY` and `ALPHA_VANTAGE_API_KEY` are still declared in `env.ts` but not used by the scan pipeline. Any non-empty string satisfies validation.

---

## Free-tier limits

| Provider | Free-tier limit | Bottleneck |
|---|---|---|
| Tiingo | 1,000 calls/day, 50/hour | Hourly limit if scan is run repeatedly |
| Polygon | 5 calls/min | Rate limiter uses 12,500ms delay between calls |
| Finnhub | ~60 calls/min | Rate limiter uses 200ms delay between calls |

**Call budget per daily scan (20 symbols, ~10 Minervini survivors):**
~21 Tiingo + ~10 Polygon + ~10 Finnhub = ~41 calls total. Well within all free-tier limits.

---

## Tiingo

Used for **daily price history** (open, high, low, close, volume) for all scanned symbols and SPY.

- Supplies data for SMA computation, 52-week high/low, volume, and RS ranking
- Do not fragment calls — fetch full history once per symbol per scan

## Polygon

Used for **quarterly fundamentals** after Minervini filtering narrows the candidate list.

- `fetchFinancials(ticker, 8)` returns 8 quarters of income statements + TTM ROE
- Rate limited to 5 calls/min on the free tier; `withRateLimit` handles delays
- Results are cached per-ticker in the database to reduce repeat calls

## Finnhub

Used for **company profile** (market cap, sector, industry) post-Minervini filter.

- `finnhubClient.profile(ticker)` returns sector/industry/market cap
- Rate limited with 200ms delay between calls

---

## Potential upgrades

| Provider | When useful |
|---|---|
| Polygon annual financials | `annualEpsGrowth3Y` — call `/vX/reference/financials?timeframe=annual` |
| Polygon WebSocket | Intraday scanner in v2+ only |
| Alpha Vantage | Fallback for ROE or sector if other providers miss |
