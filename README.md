# discord-bot-stock-alert

Alert-only Discord bot that scans stocks using Minervini and IBD criteria and posts trade setup alerts. No broker integration, no order execution.

## Data providers

| Provider | Role | Free tier |
|---|---|---|
| **Tiingo** | Daily OHLCV history for all scanned symbols (powers SMA, 52-week range, volume, RS rank) | 500 calls/day |
| **Finnhub** | Company profile, market cap, industry, real-time quotes, news WebSocket | 30 calls/sec |
| **FMP** | Quarterly income statements (EPS, revenue) — fetched only for Minervini survivors | 250 calls/day |
| **Alpha Vantage** | Fallback for sector, industry, ROE, YoY growth when Finnhub/FMP miss | 25 calls/day |

**Call budget per daily scan (20 symbols):** ~20 Tiingo + ~10 Finnhub + ~10 FMP = ~40 calls total.

## Stack

- **Runtime:** Node.js, TypeScript (ESM, NodeNext)
- **Discord:** discord.js
- **Database:** Neon (serverless PostgreSQL) + Drizzle ORM
- **Scheduler:** node-cron
- **Validation:** Zod

## Documentation

| File | Description |
|---|---|
| [ALERT_SPECS.md](./ALERT_SPECS.md) | Alert rules, filters, embed format, cooldowns, and v1 scope |
| [SCANNER_CRITERIA.md](./SCANNER_CRITERIA.md) | Minervini trend template and IBD/CAN SLIM scanner criteria |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture flowchart |
| [SUMMARY.md](./SUMMARY.md) | Full system design, modules, data flow, and component overview |
| [MVP.md](./MVP.md) | MVP scope and build order |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run in development mode |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled output |
| `pnpm test:discord` | Send a mock scan alert embed to Discord (no DB or API calls needed) |
| `pnpm test:scan` | Run the full scan pipeline against live data |
| `pnpm db:generate` | Generate Drizzle migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:seed` | Seed the `symbols` table with the initial ticker list |
| `pnpm db:studio` | Open Drizzle Studio to browse the database |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format source files with Prettier |

## Required environment variables

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
ALERT_CHANNEL_ID=
DATABASE_URL=
TIINGO_API_KEY=
FINNHUB_API_KEY=
FMP_API_KEY=
ALPHA_VANTAGE_API_KEY=
```

[Install Link](https://discord.com/oauth2/authorize?client_id=1503186612975177819)
