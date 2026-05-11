# Minervini and IBD Scanner Criteria

This is a practical hybrid stock scanner combining Mark Minervini-style technical filters with IBD (Investor's Business Daily) / CAN SLIM-style growth and leadership filters.

> This is a screening framework, not investment advice. The scanner is meant to identify candidates for deeper chart and fundamental review.

---

## 1. Minervini Trend Template - Technical Base Filter

Use this first to eliminate weak charts.

| Filter | Criteria |
|---|---|
| Price trend | Price > 50-day simple moving average (SMA), 150-day SMA, and 200-day SMA |
| Moving average alignment | 50-day SMA > 150-day SMA > 200-day SMA |
| Long-term trend | 200-day SMA trending up for at least 1 month |
| 52-week position | Price is within 25% of 52-week high |
| Avoid broken stocks | Price is at least 25% above 52-week low |
| Relative strength | Relative Strength (RS) Rating or equivalent > 70, preferably > 80 |
| Liquidity | Average daily dollar volume high enough for your position size |

Common Minervini-style rules include price above the 50-day, 150-day, and 200-day moving averages; the 50-day above the 150-day and 200-day; the 150-day above the 200-day; a rising 200-day; price near the 52-week high; price well above the 52-week low; and strong relative strength.

---

## 2. IBD / CAN SLIM-Style Fundamental Filter

After the technical filter, add growth and quality criteria.

| Filter | Criteria |
|---|---|
| Current earnings | Latest quarterly earnings per share (EPS) growth >= 25% year-over-year |
| Sales growth | Latest quarterly revenue growth >= 20% year-over-year |
| Annual earnings | Annual EPS growth strong over the last 3 years, ideally >= 25% |
| Return on equity | Return on equity (ROE) >= 17%, if available |
| New catalyst | New product, service, market, management, industry shift, or new price high |
| Leader filter | Stock is a leader in a leading industry group |
| Institutional support | Increasing fund ownership or positive accumulation/distribution |
| Market direction | Only take aggressive breakouts when the general market is in an uptrend |

CAN SLIM stands for:

- **C** - Current earnings
- **A** - Annual earnings
- **N** - New product, service, management, price high, or catalyst
- **S** - Supply and demand
- **L** - Leader or laggard
- **I** - Institutional sponsorship
- **M** - Market direction

IBD also emphasizes proprietary ratings such as EPS Rating, Relative Strength Rating, Industry Group Relative Strength, and Composite Rating.

---

## 3. Suggested Scanner Settings

### Conservative Version

Use this when you want fewer, higher-quality names.

| Category | Criteria |
|---|---|
| Price | Price > $10 |
| Liquidity | Average daily volume > 500,000 shares |
| Dollar volume | Price x average volume > $20M |
| Trend | Price > 50-day, 150-day, 200-day SMA |
| SMA structure | 50-day SMA > 150-day SMA > 200-day SMA |
| 200-day SMA | Rising for at least 20 trading days |
| 52-week high distance | Within 15% of 52-week high |
| 52-week low distance | At least 50% above 52-week low |
| Relative strength | RS Rating > 80, or 6-month price performance in top 20% |
| EPS growth | Latest quarter EPS growth > 25% |
| Revenue growth | Latest quarter revenue growth > 20% |
| Composite score | IBD Composite Rating > 90, if available |

### Looser Version

Use this when market breadth is weak and the conservative scan returns too few stocks.

| Category | Criteria |
|---|---|
| Price | Price > $5 |
| Liquidity | Average daily volume > 200,000 shares |
| Trend | Price > 150-day and 200-day SMA |
| SMA structure | 150-day SMA > 200-day SMA |
| 52-week high distance | Within 25% of 52-week high |
| Relative strength | RS Rating > 70 |
| EPS growth | Latest quarter EPS growth > 15% |
| Revenue growth | Latest quarter revenue growth > 10% |

---

## 4. Breakout / Setup Filter

The scanner only finds candidates. The setup still matters.

| Setup Trait | Preferred Condition |
|---|---|
| Base | Cup-with-handle, flat base, double bottom, high-tight flag, or volatility contraction pattern (VCP) |
| Volume dry-up | Lower volume near the right side of the base |
| Breakout volume | Breakout volume at least 40% above average |
| Relative strength line | Relative strength line near or at a new high before price breaks out |
| Pivot proximity | Price within 0% to 5% of pivot, not already extended |
| Risk | Stop can be placed within roughly 5% to 8% below entry |

---

## 5. Pseudocode Scanner Logic

```text
Universe:
  US stocks only
  price > 10
  avg_volume_50d > 500000
  avg_dollar_volume_50d > 20000000

Minervini technical filters:
  close > sma_50
  close > sma_150
  close > sma_200
  sma_50 > sma_150
  sma_150 > sma_200
  sma_200 > sma_200[20 trading days ago]
  close >= 1.25 * 52_week_low
  close >= 0.85 * 52_week_high
  relative_strength_rank >= 80

IBD-style growth filters:
  latest_quarter_eps_growth >= 25
  latest_quarter_sales_growth >= 20
  annual_eps_growth_3y >= 20 or 25
  roe >= 17
  composite_rating >= 90 if available
  eps_rating >= 80 if available
  industry_group_rank in top 40% if available

Setup filters:
  price within 5% of pivot
  volume contracting in base
  relative_strength_line near new high
```

---

## 6. Ranking Formula

After the scan, rank results instead of treating all hits equally.

```text
Score =
  30% relative strength
  20% EPS growth
  15% revenue growth
  15% distance from 52-week high
  10% industry group strength
  10% accumulation / volume quality
```

---

## 7. Main Trap

The weakest part of this kind of scanner is **over-filtering**.

A stock can fail one fundamental criterion and still become a major winner, especially newer companies with explosive revenue but inconsistent earnings. On the other hand, a stock can pass every filter and still be extended, late-stage, or breaking out in a weak market.

The scanner should answer:

> What deserves chart review?

It should not answer:

> What should I buy?

