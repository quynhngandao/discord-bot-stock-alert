# Discord Stock Alert Bot Architecture

## 1 High-level system design

Think in 5 parts:

### A. Market Data Layer

This pulls stock data from APIs.

It fetches things like:

- daily candles
- intraday candles
- volume
- moving averages
- fundamentals
- maybe relative strength inputs

This layer should do zero Discord logic. Its only job is: get clean stock data.

### B. Scanner / Rules Engine

This is the brain.

It takes data and checks off the checklist:

- is price above 50 MA?
- is 200 MA rising?
- is volume above threshold?
- is stock near 52-week high?
- did it break out today?
- does it pass Minervini/IBD scoring?

This layer should output something like:

```ts
{
  ticker: "NVDA",
  passed: true,
  score: 84,
  triggers: [
    "Above 50/150/200 MA",
    "Within 10% of 52-week high",
    "Breakout above 20-day range",
    "Volume 1.8x average"
  ],
  alertType: "HIGH_PRIORITY_BREAKOUT"
}
```

This is the most important layer in the system.

### C. Alert Decision Layer

This is separate from the scanner for a reason.

Just because a stock passes rules does not mean we want to spam Discord every 5 minutes.

This layer handles:

- deduplication
- cooldowns
- only alert on state changes
- priority thresholds
- alert routing

Example:

- do not send same alert twice in same day
- only alert if score improved by 10+
- only send breakout alert once unless it reclaims after failing
- different channels for watchlist vs high-priority setups

### D. Notification Layer

This sends messages to Discord.

Responsibilities:

- build Discord embeds
- post to correct channel
- optionally mention roles
- include chart links / setup summary / score

This layer should be dumb:

- input = alert event
- output = nicely formatted Discord message

### E. Persistence Layer

Store:

- watchlist
- previous scan results
- sent alerts
- cooldown state
- scoring snapshots
- maybe performance tracking later

## 2 Recommended v1 architecture

Build a modular monolith.

Not microservices.  
Not Kubernetes.  
Not distributed event-driven cloud-native blockchain AI toaster architecture.

Just one app with clear modules.

### Suggested stack

- TypeScript
- Node.js
- discord.js
- PostgreSQL
- cron scheduler
- stock API client
- optional Redis later

## 3 Core components

Here is a clean mental model:

```text
[Scheduler]
    |
    v
[Scan Job Runner]
    |
    v
[Symbol Universe Loader]
    |
    v
[Market Data Service] ---> [Cache]
    |
    v
[Rule Engine / Scanner]
    |
    v
[Alert Decision Engine]
    |
    +----> [Database: scans, alerts, watchlist, state]
    |
    v
[Discord Notifier]
```

## 4 Request/data flow

### End-of-day scan flow

This is the easiest v1:

1. cron job runs after market close
2. load list of stocks to scan
3. fetch historical candles + required fundamentals
4. compute indicators
5. evaluate checklist
6. generate candidate alerts
7. dedupe against DB
8. send alerts to Discord
9. save results

### Intraday flow later

Future - real-time-ish alerts:

1. scheduler runs every 1-5 minutes
2. fetch latest candles/quotes
3. recalculate trigger-only rules
4. compare with prior state
5. send only new signal transitions
6. update alert state

That transition/state part matters a lot.

## 5 Suggested modules / folders

```text
src/
  config/
    env.ts              # Zod-validated env vars
    alertConfig.ts      # alert thresholds
    scannerConfig.ts    # rule weights and filters

  infrastructure/
    db/
      client.ts         # Drizzle + pg pool
      schema.ts         # all table definitions
    discord/
      client.ts         # discord.js Client
      notificationAdapter.ts
    market/
      finnhubClient.ts  # typed Finnhub REST wrapper
      cacheService.ts

  domain/
    symbolUniverse.ts   # symbol list
    types.ts            # Candle, ScanResult, AlertEvent, Rule

  scanner/
    indicators.ts       # SMA, volume avg, 52w high
    ruleEngine.ts       # composable Rule functions
    trendTemplate.ts    # Minervini trend template rules
    scoring.ts          # weighted score computation

  alerts/
    alertEngine.ts      # decide whether to send
    dedupeService.ts
    cooldownService.ts

  application/
    scanOrchestrator.ts # fetch → scan → alert pipeline
    scheduler.ts        # node-cron job definitions

  index.ts              # entry point
```

## 6 Key database tables

### `symbols`

Tracks stocks.

Fields:

- ticker
- exchange
- is_active

### `scan_snapshots`

Optional for storing computed scan output.

Fields:

- ticker
- scan_date
- score
- passed
- triggers_json

### `alerts`

Stores what got sent.

Fields:

- id
- ticker
- alert_type
- score
- message_hash
- sent_at

### `alert_state`

Tracks current status to avoid duplicates.

Fields:

- ticker
- setup_type
- last_alerted_at
- last_score
- last_state

### `watchlists`

Optional if we want user-managed lists.

## 7 Core domain design

Types

### Market data

```ts
type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
```

### Scan result

```ts
type ScanResult = {
  ticker: string;
  passed: boolean;
  score: number;
  checks: Record<string, boolean>;
  triggers: string[];
  metrics: {
    close: number;
    sma50: number;
    sma150: number;
    sma200: number;
    avgVolume50: number;
    volumeRatio?: number;
    distanceFrom52WeekHigh?: number;
  };
};
```

### Alert event

```ts
type AlertEvent = {
  ticker: string;
  alertType: "WATCHLIST" | "BREAKOUT" | "HIGH_PRIORITY";
  score: number;
  reasons: string[];
  channel: string;
  occurredAt: string;
};
```

## 8 Rule engine design

Do not hardcode everything inside one giant function.

Make each rule composable.

Example:

```ts
type RuleContext = {
  candles: Candle[];
  fundamentals?: {
    epsGrowthQoq?: number;
    salesGrowthQoq?: number;
  };
};

type RuleResult = {
  name: string;
  passed: boolean;
  value?: number;
  note?: string;
};

type Rule = (ctx: RuleContext) => RuleResult;
```

Then define rules like:

- priceAbove50MA
- priceAbove200MA
- movingAveragesAligned
- withinXPercentOf52WeekHigh
- volumeSurge
- salesGrowthOver20

Then combine them in:

- trendTemplateRules
- leadershipRules
- triggerRules

That makes iteration way easier.

## 9 Scoring design

Use weighted scoring instead of only hard filters.

Example:

```ts
const weights = {
  trend: 40,
  leadership: 30,
  setup: 20,
  market: 10
};
```

Then compute subtotal per category.

Why this matters:

- one missing fundamental datapoint will not kill a good chart
- can tune signal quality later
- much easier to backtest and adjust

## 10 Alert engine logic

This layer should ask:

### Did the stock newly qualify?

Example:

- yesterday score = 62
- today score = 83
- crossed alert threshold

Alert: yes.

### Is this the same alert as before?

Example:

- same ticker
- same setup
- same day
- no meaningful score change

Alert: no.

### Has it cooled down?

Example:

- breakout alert already sent 45 min ago
- cooldown = 4 hours

Alert: no.

### Did setup status change?

Example:

- was WATCHLIST
- now BREAKOUT

Alert: yes.

This is really a small state machine, even if we do not call it that.

## 11 Discord message design

A clean Discord embed could include:

- ticker
- price
- alert type
- score
- top passed criteria
- top failed criteria
- volume ratio
- distance from 52-week high
- chart link
- timestamp

Example:

```text
NVDA - HIGH PRIORITY BREAKOUT
Score: 84/100

Passed:
- Above 50/150/200 MA
- 200 MA rising
- Within 8% of 52-week high
- Volume 1.8x avg
- Broke above 20-day range

Failed:
- Quarterly sales growth unavailable

Price: 112.40
```

That is way better than:

```text
NVDA alert!!!
```

## 12 Caching and API limits

This matters a lot for stock APIs.

Do not repeatedly fetch the same data for every rule.

Use caching for:

- symbol lists
- daily candles
- fundamentals
- indicator inputs

Good rule:

- fetch raw data once
- compute all indicators locally
- reuse results across rules

## 13 Scheduler design

For v1:

- one cron for daily scan
- optional second cron for market health scan

For v2:

- one cron every few minutes during market hours
- one cron for end-of-day summary
- one cron for cleanup / retention jobs

A simple schedule might be:

- 4:15 PM ET daily scan
- every 5 min during market hours intraday trigger scan
- 8:00 PM summary report

## 14 Reliability concerns

Stuff that breaks in real life:

### API failures

Handle:

- retries
- fallbacks
- partial scans
- logging

### Discord rate limits

Batch or stagger messages if many alerts fire at once.

### Duplicate alerts

Always hash/store alert fingerprints.

### Missing fundamentals

Scanner should degrade gracefully instead of crashing.

### Market calendar

Do not scan on weekends or market holidays.

## 15 Logging and observability

At minimum log:

- job start/end
- symbols scanned
- API failures
- number of candidates
- number of alerts sent
- duplicates suppressed

This helps answer:

- Why did I not get an alert?
- Why did I get 47 alerts for garbage?

## 16 Security / secrets

Env vars for:

- Discord bot token
- stock API keys
- DB connection string

Never hardcode these into source.

## 17 Best v1 design choice

Build this as:

### One app with 3 main jobs

- dailyScanJob
- marketHealthJob
- discordBotCommandHandler

### One database

- PostgreSQL

### One scanner config file

Where all thresholds live:

```ts
export const scannerConfig = {
  minPrice: 10,
  minAvgVolume: 300000,
  minDollarVolume: 5000000,
  maxDistanceFromHigh: 0.15,
  minScoreForWatchlist: 65,
  minScoreForPriority: 80,
  breakoutVolumeRatio: 1.5
};
```

## 18 MVP architecture example

### MVP

- TypeScript + Node.js
- discord.js
- cron-based scanner
- Finnhub as stock data provider
- PostgreSQL + Drizzle ORM
- daily scans only
- rule engine with config-driven thresholds
- alert dedupe table
- one Discord channel for alerts
- one optional channel for daily summaries

### Later

- intraday scans
- chart image generation
- slash commands
- user watchlists
- backtest reports
- admin panel
- Redis queue
- multiple alert profiles

## 19 Architecture in one sentence

A scheduler triggers scans, a market data service fetches data, a rule engine scores setups, an alert engine prevents spam, and a Discord notifier sends only meaningful state changes while persistence stores everything for dedupe and analysis.

## 20 Preliminary Steps

This order:

1. load fixed list of symbols
2. fetch daily candles
3. compute MAs + 52-week position
4. score checklist
5. send one Discord summary message
6. store results in PostgreSQL
7. add breakout alerts later
