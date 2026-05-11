# Minimal MVP Technology Stack

## Required
- **TypeScript**
- **Node.js**
- **discord.js**
- **Finnhub** (intraday quotes + news WebSocket)
- **Financial Modeling Prep (FMP)** (top 100 US tickers by market cap)
- **Neon** (serverless PostgreSQL)
- **Drizzle**
- **node-cron**
- **dotenv**
- **esLint**
- **Prettier**


## Nice to have later
- **Redis**
- **Sentry**
- **Web dashboard**

## MVP goal
Build a Discord bot that:
- runs on a schedule
- scans a small stock list
- applies simple checklist rules
- sends alerts to one Discord channel
- stores alert history to avoid duplicates