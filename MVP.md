# MVP Technology Stack

## Core dependencies

| Package | Purpose |
|---|---|
| `typescript` | Language |
| `tsx` | Dev runner (no compile step needed) |
| `discord.js` | Discord bot client |
| `drizzle-orm` + `drizzle-kit` | ORM and migrations |
| `@neondatabase/serverless` | Neon PostgreSQL HTTP driver |
| `node-cron` | Job scheduler |
| `zod` | Environment variable validation |
| `dotenv` | `.env` loading |
| `finnhub` | Finnhub SDK (WebSocket news) |

## Data providers

| Provider | What it provides | When called |
|---|---|---|
| Tiingo | Daily OHLCV history | Every scan, all symbols |
| Finnhub | Profile, market cap, quotes, news | Post-Minervini filter + WebSocket |
| FMP | Quarterly EPS and revenue | Post-Minervini filter only |
| Alpha Vantage | Sector, ROE, YoY growth fallback | Only when Finnhub returns null |

## Database (Neon — serverless PostgreSQL)

| Table | Purpose |
|---|---|
| `symbols` | Ticker universe (never deleted) |
| `scan_snapshots` | Per-scan results — 30-day retention |
| `alerts` | Sent alert log for deduplication — 30-day retention |
| `alert_state` | Cooldown state for future intraday alerts |

## MVP goal

Build a Discord bot that:
- runs on a schedule (8:25 AM CST weekdays)
- scans a curated list of ~20–200 US large-cap stocks
- applies Minervini trend template + IBD/CAN SLIM rules
- scores each stock 0–100
- sends WATCHLIST / HIGH PRIORITY embeds to Discord
- deduplicates alerts within the same day
- cleans up old data weekly

## Nice to have later

- Redis (caching between scans)
- Sentry (error monitoring)
- Intraday scanner (VWAP, EMA, breakout alerts)
- Web dashboard
- User watchlists via slash commands
