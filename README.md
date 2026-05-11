# discord-bot-stock-alert

Alert-only Discord bot that scans stocks using Minervini and IBD criteria and posts trade setup alerts. No broker integration, no order execution.

## Data providers

| Provider | Role | Free tier |
|---|---|---|
| **Tiingo** | Daily OHLCV history for all scanned symbols (SMAs, 52-week range, volume, RS rank) | 1,000 calls/day, 50/hour |
| **Polygon** | Quarterly income statements + TTM ROE — fetched only for Minervini-passing stocks | 5 calls/min |
| **Finnhub** | Company profile, sector, industry — fetched only for Minervini-passing stocks | 60 calls/min |

**Call budget per daily scan (20 symbols, ~10 Minervini survivors):** ~21 Tiingo + ~10 Finnhub + ~10 Polygon = ~41 calls total.

> `FMP_API_KEY` and `ALPHA_VANTAGE_API_KEY` are still required by env validation but not used by the scan pipeline. Any non-empty value works.

## Stack

- **Runtime:** Node.js, TypeScript (ESM, NodeNext)
- **Discord:** discord.js
- **Database:** Neon (serverless PostgreSQL) + Drizzle ORM
- **Scheduler:** node-cron
- **Validation:** Zod

## Documentation

| File | Description |
|---|---|
| [ALERT_SPECS.md](./ALERT_SPECS.md) | Definitive spec: alert rules, score model, cooldowns, and embed format |
| [SCANNER_CRITERIA.md](./SCANNER_CRITERIA.md) | Minervini trend template and IBD/CAN SLIM criteria reference |
| [DATA_PROVIDER.md](./DATA_PROVIDER.md) | Provider selection rationale and API limit notes |
| [MVP.md](./MVP.md) | Technology stack, dependencies, and v1 scope |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture flowchart |
| [SUMMARY.md](./SUMMARY.md) | High-level system design and component overview |

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
POLYGON_API_KEY=
FINNHUB_API_KEY=
FMP_API_KEY=        # required by env validation; not used by scan pipeline
ALPHA_VANTAGE_API_KEY=  # required by env validation; not used by scan pipeline
```

[Install Link](https://discord.com/oauth2/authorize?client_id=1503186612975177819)
