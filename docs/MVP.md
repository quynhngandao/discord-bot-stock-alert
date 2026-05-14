# MVP Technology Stack

## v1 scope

Build a free-tier-friendly Discord watchlist bot.

v1 is a daily/pre-market scanner only. It scans a curated list of liquid US stocks using completed daily candles, applies lightweight Minervini and IBD/CAN SLIM approximations, scores each ticker, and sends WATCHLIST or HIGH PRIORITY WATCHLIST embeds to Discord.

v1 does not use intraday data, live quotes, broker integration, order execution, account data, position sizing, or buy/sell commands.

## Core dependencies

| Package | Purpose |
|---|---|
| `typescript` | Language |
| `tsx` | Dev runner with no compile step required |
| `discord.js` | Discord bot client |
| `drizzle-orm` + `drizzle-kit` | ORM and migrations |
| `@neondatabase/serverless` | Neon PostgreSQL HTTP driver |
| `node-cron` | Scheduled weekday scan |
| `zod` | Environment variable validation |
| `dotenv` | `.env` loading |

## Optional dependencies for later

| Package | Purpose |
|---|---|
| `finnhub` | Optional later use for news, company profile, or earnings calendar if plan allows |
| Redis client | Optional cache if the app grows beyond the database cache |
| Sentry SDK | Optional error monitoring |

## Data providers

| Provider | v1 use | When called |
|---|---|---|
| **Tiingo** | Required | Every scan — daily OHLCV for all symbols including SPY |
| **Polygon** | Required | Post-Minervini filter — quarterly income statements + TTM ROE |
| **Finnhub** | Required | Post-Minervini filter — company profile, sector, industry |

## Database: Neon serverless PostgreSQL

| Table | Purpose |
|---|---|
| `symbols` | Curated ticker universe; never automatically deleted |
| `daily_bars` | Cached daily OHLCV bars to reduce API calls |
| `scan_snapshots` | Per-scan result rows; 30-day retention |
| `alerts` | Sent Discord alert log for same-day deduplication; 30-day retention |
| `bot_runs` | Optional run history, failures, and timing metadata |

Do not add `alert_state` in v1 unless needed. The daily alert log is enough for deduplication.

## Schedule

| Job | Schedule | Purpose |
|---|---|---|
| Daily watchlist scan | Weekdays at 8:25 AM America/Chicago | Build pre-market watchlist using the latest completed daily candle |
| Data cleanup | Weekly | Delete old scan snapshots and alert rows |

The scan should use the most recent completed trading day. If the latest candle is missing or stale, the bot should log the issue and skip affected tickers.

## Scanner logic

For each ticker:

1. Load the last 260 daily bars from cache or provider.
2. Load the last 260 daily bars for `SPY`.
3. Calculate SMA 50, SMA 150, SMA 200, 52-week high, 52-week low, 21-day return, 63-day return, 50-day average volume, average dollar volume, and prior-day volume ratio.
4. Apply core filters.
5. Apply Minervini-lite criteria.
6. Apply IBD/CAN SLIM-lite criteria.
7. Score the ticker from 0 to 100.
8. Rank passing tickers by score.
9. Send at most 10 Discord alerts per scan.
10. Record alerts for same-day deduplication.

## v1 core filters

| Filter | Requirement |
|---|---|
| Price | Latest close >= $5 |
| Data sufficiency | At least 220 completed daily candles |
| Average daily volume | 50-day average volume >= 1,000,000 shares |
| Average dollar volume | Latest close * 50-day average volume >= $10,000,000 |
| Duplicate alert | Ticker has not already alerted today |
| Extension check | Latest close is not more than 15% above the 50-day SMA |

## v1 Minervini-lite criteria

All must pass:

- Latest close > 50-day SMA
- Latest close > 150-day SMA
- Latest close > 200-day SMA
- 150-day SMA > 150-day SMA from 20 trading days ago (rising)
- 200-day SMA > 200-day SMA from 20 trading days ago (rising)
- 50-day SMA > 150-day SMA
- 50-day SMA > 200-day SMA
- Latest close is at least 30% above the 52-week low
- Latest close is within 25% of the 52-week high
- RS rank (cross-sectional 12-month return percentile) >= 70
- 50-day average volume >= 500,000 shares

## v1 IBD/CAN SLIM-lite criteria

Enrichment only — null values never block an alert.

Tracked rules (all lenient): EPS growth latest/prev quarter (YoY), revenue growth latest quarter, annual EPS growth 3Y, ROE, RS rank >= 80, dollar volume 50-day >= $10M.

Additional tracked signals: `accumulationRatio` (up/down volume ratio), `epsAcceleration`, `revenueAcceleration`.

Do not use IBD proprietary ratings in v1. Do not block alerts if fundamentals are unavailable.

## Alert outputs

| Alert | Requirement |
|---|---|
| `WATCHLIST` | Passes core filters, Minervini-lite, IBD-lite, and score >= 70 |
| `HIGH_PRIORITY_WATCHLIST` | Passes WATCHLIST, score >= 85, and has either prior-day volume ratio >= 1.5 or close within 10% of 52-week high |

## MVP goal

Build a Discord bot that:

- Runs on a weekday schedule at 8:25 AM America/Chicago
- Scans a curated list of roughly 20-200 US large-cap or liquid growth stocks
- Uses daily OHLCV only in v1
- Applies lightweight Minervini trend-template criteria
- Applies lightweight IBD/CAN SLIM-style relative strength criteria
- Scores each stock from 0 to 100
- Sends WATCHLIST or HIGH PRIORITY WATCHLIST embeds to Discord
- Deduplicates alerts within the same trading day
- Cleans up old data weekly

## Explicit v1 non-goals

Do not build these in v1:

- Broker integration
- Order execution
- Buy/sell commands
- Position sizing
- Account balance access
- Intraday scanner
- VWAP reclaim/rejection
- 5-minute candle breakout/breakdown
- Opening range breakout/breakdown
- Live relative volume
- Bid/ask spread checks
- Halt checks
- Earnings-day blocking
- News-volume alerts
- User watchlists via slash commands
- Web dashboard

## Nice to have later

- Finnhub enrichment for company profile, sector, industry, earnings calendar, or news if plan allows
- Redis caching between scans
- Sentry error monitoring
- Intraday scanner using minute aggregates
- VWAP, EMA, and breakout alerts
- Web dashboard
- User watchlists via slash commands