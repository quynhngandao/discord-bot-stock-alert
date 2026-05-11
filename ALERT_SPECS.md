# Alert Specification

## Mode

`ALERT_ONLY` — no broker integration, no order execution, no position sizing, no buy/sell commands, no account balance access, no trading permissions.

## Core alert filters

> Stocks must also pass the Minervini and IBD criteria in [`SCANNER_CRITERIA.md`](./SCANNER_CRITERIA.md) before the alert rules below are evaluated.

All alerts require the stock to pass every filter before any rule is evaluated:

| Filter | Requirement |
|---|---|
| Price | >= $5 |
| Average daily volume | >= 1,000,000 shares |
| Relative volume | >= 1.5x |
| Spread | <= 0.5% |
| Halted | No |
| Earnings day | No |

## Alert rules

### Bullish

Send `BULLISH` alert when:

- Price > VWAP
- 20 EMA > 50 EMA
- Price breaks above previous 5-minute candle high
- Relative volume >= 1.5
- Risk/reward area >= 2:1

### Bearish

Send `BEARISH` alert when:

- Price < VWAP
- 20 EMA < 50 EMA
- Price breaks below previous 5-minute candle low
- Relative volume >= 1.5
- Risk/reward area >= 2:1

> **VWAP** = volume-weighted average price  
> **EMA** = exponential moving average

## Discord embed format

Use `watch`, `setup`, or `alert` — never `buy` or `sell`.

### Bullish

```
📈 BULLISH WATCH

Ticker: AAPL
Price: 192.50
Setup: VWAP reclaim + 5m breakout
Trend: Price above VWAP, 20 EMA > 50 EMA
Relative Volume: 1.8x
Key Level: 193.00
Invalidation Area: Below 190.80
Potential Upside Area: 195.90
Reason: Breakout with volume confirmation

Not financial advice. Alert only.
```

### Bearish

```
📉 BEARISH WATCH

Ticker: TSLA
Price: 218.40
Setup: VWAP rejection + 5m breakdown
Trend: Price below VWAP, 20 EMA < 50 EMA
Relative Volume: 2.1x
Key Level: 217.80
Invalidation Area: Above 221.00
Potential Downside Area: 214.50
Reason: Breakdown with volume confirmation

Not financial advice. Alert only.
```

## Supported alert types

**VWAP**
- `vwap_reclaim`
- `vwap_rejection`

**5-minute candle**
- `five_minute_breakout`
- `five_minute_breakdown`

**Opening range**
- `opening_range_breakout`
- `opening_range_breakdown`

**Volume**
- `relative_volume_spike`
- `unusual_volume_spike`

**Pre-market levels**
- `premarket_high_break`
- `premarket_low_break`

**Prior day levels**
- `previous_day_high_break`
- `previous_day_low_break`

**52-week levels**
- `fifty_two_week_high_break`
- `fifty_two_week_low_break`

**Gap continuation**
- `gap_up_continuation`
- `gap_down_continuation`

**Key levels**
- `support_bounce`
- `resistance_rejection`

**Retest**
- `breakout_retest`
- `breakdown_retest`

**Failed moves**
- `failed_breakout`
- `failed_breakdown`

**Special**
- `halt_resume`
- `news_volume_spike`

## "Do not alert" rules

These matter more than the alert rules — noise kills a bot faster than missing signals.

- Do not alert in the first 5 minutes after market open
- Do not alert in the last 10 minutes before market close
- Do not alert if spread > 0.5%
- Do not alert if relative volume < 1.5
- Do not alert if price < $5
- Do not alert if average volume < 1M
- Do not alert if ticker already alerted in the last 30 minutes
- Do not alert if stock is halted
- Do not alert if earnings are today
- Do not alert if move is more than 3 ATR from VWAP

> **ATR** = average true range

## Cooldown rules

| Rule | Value |
|---|---|
| Same ticker cooldown | 30 minutes |
| Same setup cooldown | 60 minutes |
| Max alerts per ticker per day | 3 |
| Max alerts per channel per hour | 10 |

## Recommended config

```json
{
  "mode": "alert_only",
  "minPrice": 5,
  "minAvgVolume": 1000000,
  "minRelativeVolume": 1.5,
  "maxSpreadPercent": 0.5,
  "fastEMA": 20,
  "slowEMA": 50,
  "atrPeriod": 14,
  "minRiskRewardArea": 2,
  "noAlertFirstMinutes": 5,
  "noAlertLastMinutes": 10,
  "blockEarningsDay": true,
  "blockHaltedStocks": true,
  "maxAtrExtensionFromVwap": 3,
  "sameTickerCooldownMinutes": 30,
  "sameSetupCooldownMinutes": 60,
  "maxAlertsPerTickerPerDay": 3,
  "maxAlertsPerChannelPerHour": 10
}
```

## v1 scope

Start with only 3 alert types:

1. VWAP reclaim
2. 5-minute breakout
3. High relative volume

**v1 rule (all must be true):**

- Price >= $5
- Average volume >= 1M
- Relative volume >= 1.5
- Price above VWAP
- 20 EMA > 50 EMA
- Price breaks above previous 5-minute candle high
- Ticker has not alerted in the last 30 minutes

Do not add more setups until v1 is working. Noise is a bigger problem than missing signals.
