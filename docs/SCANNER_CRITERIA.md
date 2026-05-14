# Minervini and IBD Scanner Criteria

## Mode

`EOD_WATCHLIST_ONLY` — this scanner uses completed daily candles only.

It does **not** use live quotes, intraday candles, bid/ask spreads, VWAP reclaims, 5-minute breakouts, real-time relative volume, account data, broker integrations, order execution, position sizing, or buy/sell commands.

This file defines a practical **MVP scanner** inspired by Mark Minervini-style trend filtering and IBD/CAN SLIM-style leadership filtering, but simplified for a free-tier API and a small curated stock universe.

> This is a screening framework, not investment advice. The scanner identifies watchlist candidates for further review.

---

## 1. Data assumptions

The MVP scanner only needs daily OHLCV data.

Required fields per symbol:

| Field | Required | Notes |
|---|---:|---|
| Date | Yes | Completed trading day only |
| Open | Yes | Daily open |
| High | Yes | Daily high |
| Low | Yes | Daily low |
| Close | Yes | Daily close |
| Volume | Yes | Daily volume |

Optional benchmark data:

| Symbol | Purpose |
|---|---|
| SPY | Used as a simple market-relative strength benchmark |

Do **not** use the current unfinished trading day in the daily scanner.

Recommended schedule:

```text
Run time: 8:25 AM Central, weekdays
Data used: previous completed trading day
Output: WATCHLIST or HIGH_PRIORITY_WATCHLIST
```

Example:

```text
Monday morning scan uses Friday's completed daily candle.
Tuesday morning scan uses Monday's completed daily candle.
```

---

## 2. What v1 intentionally does not use

To keep the MVP minimal and free-tier friendly, v1 does not require:

- IBD proprietary ratings
- Composite Rating
- EPS Rating
- RS Rating
- Accumulation/Distribution Rating
- Industry Group Relative Strength
- Quarterly EPS growth
- Quarterly revenue growth
- ROE
- Institutional ownership
- Earnings calendar checks
- Halt status checks
- Bid/ask spread checks
- Intraday VWAP
- 5-minute candles
- Opening range levels
- Premarket levels
- Real-time relative volume
- Live news catalysts

Those can be added later, but they are not required for the first working bot.

---

## 3. Universe filter

Start with a curated list of roughly **20–200 liquid U.S. stocks**.

Required universe filters:

| Filter | Requirement |
|---|---:|
| Price | Close >= $5 |
| Average volume | 50-day average volume >= 1,000,000 shares |
| Dollar volume | 50-day avg close × 50-day avg volume >= $10,000,000 |
| History | At least 220 daily candles available |

---

## 4. Minervini-lite trend template

Use this as the main technical base filter. All must pass.

| Filter | Requirement |
|---|---:|
| Price above short-term trend | Close > 50-day SMA |
| Price above intermediate trend | Close > 150-day SMA |
| Price above long-term trend | Close > 200-day SMA |
| Intermediate trend rising | 150-day SMA > 150-day SMA from 20 trading days ago |
| Long-term trend rising | 200-day SMA > 200-day SMA from 20 trading days ago |
| Short vs intermediate alignment | 50-day SMA > 150-day SMA |
| Short vs long alignment | 50-day SMA > 200-day SMA |
| 52-week high proximity | Close >= 75% of 52-week high (within 25%) |
| Avoid broken stocks | Close >= 130% of 52-week low (at least 30% above) |
| RS rank | Cross-sectional 12-month return percentile >= 70 |
| Volume | 50-day average volume >= 500,000 shares |

---

## 5. IBD/CAN SLIM-lite enrichment

Traditional IBD/CAN SLIM scanning uses earnings, sales growth, industry leadership, institutional sponsorship, and proprietary IBD ratings. For the free-tier MVP, fundamentals are tracked as enrichment only — a null value never blocks an alert.

| Rule | Threshold |
|---|---:|
| EPS growth latest quarter (YoY) | >= 25% |
| EPS growth previous quarter (YoY) | >= 25% |
| Revenue growth latest quarter (YoY) | >= 20% |
| Annual EPS growth 3-year | >= 25% |
| ROE | >= 17% |
| RS rank (IBD threshold) | >= 80 |
| Dollar volume 50-day | >= $10,000,000 |

Additional tracked fields (not pass/fail gates): `accumulationRatio`, `epsAcceleration`, `revenueAcceleration`.

---

## 6. Required v1 pass/fail rules

A stock passes the Minervini filter only when all of the following are true:

```text
close >= 5
avg_volume_50d >= 500,000
history_count >= 220

close > sma_50
close > sma_150
close > sma_200
sma_150 > sma_150_20_days_ago
sma_200 > sma_200_20_days_ago
sma_50 > sma_150
sma_50 > sma_200

close >= 0.75 * high_52w    (within 25% of 52-week high)
close >= 1.30 * low_52w     (at least 30% above 52-week low)

rs_rank >= 70               (cross-sectional 12-month return percentile)
```

---

## 7. Scoring model

After the pass/fail scan, rank results with a 0–100 score. The score is for prioritization only, not a trading signal.

| Category | Max points | How earned |
|---|---:|---|
| Trend strength | 50 | Proportional: # Minervini rules passed / total rules |
| Relative strength vs SPY | 20 | 63d outperform = 15 pts; 21d outperform = 5 pts |
| 52-week high proximity | 15 | ≤10% from high = 15; ≤15% = 10; ≤25% = 0 |
| Volume / liquidity | 15 | Avg vol ≥1M = 5; dollar vol ≥$10M = 5; vol ratio ≥1.5 = 5 |

---

## 8. Alert thresholds

| Alert type | Requirement |
|---|---|
| `WATCHLIST` | Passes Minervini filter and score >= 70 |
| `HIGH_PRIORITY` | Passes WATCHLIST, score >= 85, and (vol ratio >= 1.5 OR within 10% of 52-week high) |

See [ALERT_SPECS.md](./ALERT_SPECS.md) for the full alert spec including embed format and cooldowns.

---

## 9. Future upgrades

Add these only after v1 is stable.

### v2 — fundamentals (annual data)

- Annual EPS growth via Polygon annual financials endpoint
- Industry group relative strength
- Accumulation/Distribution rating approximation
- Earnings date blocking

### v3 — intraday alerts

- Intraday VWAP, 5-minute breakout, opening range breaks
- Real-time relative volume, halt checks, news volume spikes
