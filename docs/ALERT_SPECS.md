# Alert Specification

## Mode

`ALERT_ONLY` - no broker integration, no order execution, no position sizing, no buy/sell commands, no account balance access, and no trading permissions.

The bot may only send Discord watchlist alerts. Use words like `watch`, `setup`, or `alert`. Do not use `buy`, `sell`, `long`, `short`, `entry`, `exit`, or `position` in alerts.

## v1 design target

v1 is a free-tier-friendly daily watchlist scanner.

The bot does not run a live intraday scanner in v1. It does not require live quotes, bid/ask spread, real-time VWAP, 5-minute candles, halt status, or live relative volume.

All v1 calculations use the latest completed daily candle and a small curated ticker list.

## Data used in v1

| Data | Required | Notes |
|---|---:|---|
| Curated ticker list | Yes | Start with 20-200 liquid US stocks. |
| Daily OHLCV bars | Yes | Use at least 220 daily bars; 260 is preferred. |
| Benchmark daily bars | Yes | Use `SPY` for simple relative strength comparison. |
| Fundamentals | No | Do not make EPS/revenue a hard requirement in v1. Add later only if cached and reliable. |
| Live quotes | No | Not used in v1. |
| 5-minute candles | No | Not used in v1. |
| VWAP intraday | No | Not used in v1. |
| Spread | No | Not used in v1. |
| Halt status | No | Not used in v1. |
| Earnings calendar | No | Optional later; not a hard blocker in v1. |

## Core filters

A ticker must pass every core filter before any alert is created.

| Filter | Requirement |
|---|---|
| Price | Latest daily close >= $5 |
| Data sufficiency | At least 220 completed daily candles |
| Average daily volume | 50-day average volume >= 1,000,000 shares |
| Average dollar volume | Latest close * 50-day average volume >= $10,000,000 |
| Duplicate alert | Ticker has not already alerted today |

## Minimal Minervini-lite criteria

These are daily-chart approximations of the Minervini trend template.

A ticker must pass all of the following:

- Latest close > 50-day SMA
- Latest close > 150-day SMA
- Latest close > 200-day SMA
- 150-day SMA is higher than it was 20 trading days ago (rising)
- 200-day SMA is higher than it was 20 trading days ago (rising)
- 50-day SMA > 150-day SMA
- 50-day SMA > 200-day SMA
- Latest close is at least 30% above the 52-week low
- Latest close is within 25% of the 52-week high
- RS rank (cross-sectional 12-month return percentile) >= 70
- 50-day average volume >= 500,000 shares

## Minimal IBD/CAN SLIM-lite criteria

IBD proprietary ratings are not available in v1. Use these lightweight approximations instead.

Fundamentals are enrichment only — if EPS or revenue data is unavailable, do not block the alert.

| Rule | Threshold | Strict? |
|---|---|---|
| EPS growth latest quarter (YoY) | >= 25% | Lenient (null = pass) |
| EPS growth previous quarter (YoY) | >= 25% | Lenient |
| Revenue growth latest quarter (YoY) | >= 20% | Lenient |
| Annual EPS growth 3-year | >= 25% | Lenient |
| ROE | >= 17% | Lenient |
| RS rank (IBD threshold) | >= 80 | Lenient |
| Dollar volume 50-day | >= $10,000,000 | Lenient |

Prior-day volume ratio (latest volume / 50-day avg volume) is tracked for scoring and HIGH_PRIORITY gating but is not a pass/fail filter.

## Alert types in v1

Only two Discord alert types are supported in v1:

1. `WATCHLIST`
2. `HIGH_PRIORITY_WATCHLIST`

Do not add bearish alerts, VWAP alerts, 5-minute breakout alerts, opening-range alerts, halt alerts, news alerts, or pre-market alerts until v1 is working reliably.

## WATCHLIST rule

Send a `WATCHLIST` alert when all are true:

- Core filters pass
- Minervini-lite criteria pass
- IBD/CAN SLIM-lite criteria pass
- Score >= 70
- Ticker has not already alerted today

## HIGH_PRIORITY_WATCHLIST rule

Send a `HIGH_PRIORITY_WATCHLIST` alert when all are true:

- WATCHLIST rule passes
- Score >= 85
- Prior-day volume ratio >= 1.5, or latest close is within 10% of the 52-week high

## Score model

The score is only used to rank watchlist candidates. It is not a trading signal.

| Category | Points |
|---|---:|
| Trend template strength | 50 |
| Relative strength vs SPY | 20 |
| 52-week high proximity | 15 |
| Volume/liquidity | 15 |
| Total | 100 |

Scoring details:

| Rule | Points |
|---|---:|
| Trend: proportional to Minervini rules passed (9 rules × ~5.5 pts each) | 0–50 |
| 63-day return > SPY 63-day return | 15 |
| 21-day return > SPY 21-day return | 5 |
| Close within 10% of 52-week high | 15 |
| Close within 15% of 52-week high | 10 |
| Close within 25% of 52-week high | 0 |
| 50-day average volume >= 1M | 5 |
| Average dollar volume >= $10M | 5 |
| Prior-day volume ratio >= 1.5 | 5 |

## Do not alert rules

These rules override all alert rules.

- Do not alert if latest close < $5
- Do not alert if fewer than 220 daily candles are available
- Do not alert if 50-day average volume < 1,000,000 shares
- Do not alert if average dollar volume < $10,000,000
- Do not alert if ticker already alerted today
- Do not alert if the latest daily candle is stale or missing
- Do not alert if score < 70
- Do not alert more than the configured maximum number of tickers per scan

## Cooldown and deduplication rules

| Rule | Value |
|---|---:|
| Same ticker cooldown | 1 trading day |
| Max alerts per ticker per day | 1 |
| Max alerts per scan | 10 |
| Max Discord messages per scan | 10 |

## Discord embed format

Use `WATCHLIST` or `HIGH PRIORITY WATCHLIST`. Do not use `buy` or `sell`.

### WATCHLIST example

```text
WATCHLIST

Ticker: AAPL
Close: 192.50
Score: 82/100
Setup: Minervini-lite trend template + relative strength
Trend: Close above 50/150/200 SMA; 50 SMA > 150 SMA > 200 SMA
Relative Strength: 63-day return outperforming SPY
Volume: 50-day avg volume 55.2M; prior-day volume 1.2x avg
Key Level: 52-week high area 199.62
Invalidation Reference: Close back below 50-day SMA or recent daily swing low
Reason: Trend template pass, near highs, outperforming SPY

Not financial advice. Alert only.
```

### HIGH PRIORITY WATCHLIST example

```text
HIGH PRIORITY WATCHLIST

Ticker: NVDA
Close: 912.40
Score: 91/100
Setup: Trend template pass + strong volume expansion
Trend: Close above 50/150/200 SMA; 200 SMA rising
Relative Strength: 21-day and 63-day returns outperforming SPY
Volume: 50-day avg volume 42.8M; prior-day volume 1.7x avg
Key Level: 52-week high area 950.02
Invalidation Reference: Close back below 50-day SMA or recent daily swing low
Reason: Strong trend, near 52-week high, volume confirmation

Not financial advice. Alert only.
```

## Later versions

Move these to a later intraday version only after the daily watchlist bot is reliable:

- VWAP reclaim/rejection
- 5-minute breakout/breakdown
- Opening range breakout/breakdown
- Live relative volume
- Bid/ask spread checks
- Halt checks
- Earnings-day blocking
- News-volume alerts
- Pre-market high/low breaks
- Prior-day high/low breaks
- Discord slash commands