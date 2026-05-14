export const ALERT_TYPES = [
  // VWAP
  'vwap_reclaim',
  'vwap_rejection',

  // 5-minute candle
  'five_minute_breakout',
  'five_minute_breakdown',

  // Opening range
  'opening_range_breakout',
  'opening_range_breakdown',

  // Volume
  'relative_volume_spike',
  'unusual_volume_spike',

  // Pre-market levels
  'premarket_high_break',
  'premarket_low_break',

  // Prior day levels
  'previous_day_high_break',
  'previous_day_low_break',

  // 52-week levels
  'fifty_two_week_high_break',
  'fifty_two_week_low_break',

  // Gap continuation
  'gap_up_continuation',
  'gap_down_continuation',

  // Key levels
  'support_bounce',
  'resistance_rejection',

  // Retest
  'breakout_retest',
  'breakdown_retest',

  // Failed moves
  'failed_breakout',
  'failed_breakdown',

  // Special
  'halt_resume',
  'news_volume_spike',
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_DIRECTION = {
  BULLISH: 'BULLISH',
  BEARISH: 'BEARISH',
} as const;

export type AlertDirection = keyof typeof ALERT_DIRECTION;

export const DISCLAIMER = 'Not financial advice. Alert only.';
