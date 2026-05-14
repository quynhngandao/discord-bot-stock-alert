export const BIG_TECH_TICKERS: string[] = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'META',
  'GOOGL',
  'TSLA',
  'AVGO',
  'ORCL',
  'AMD',
  'INTC',
  'QCOM',
  'TXN',
  'ADI',
  'MU',
  'AMAT',
  'LRCX',
  'KLAC',
  'ASML',
  'ARM',
  'MRVL',
  'SMCI',
  'PANW',
  'CRWD',
  'PLTR',
  'NOW',
  'CRM',
  'ADBE',
  'INTU',
  'SNPS',
  'CDNS',
  'NFLX',
];

// Traditional sectors capped at top 3 each.
// These are the more stable, liquid, high-news-value names.
export const SECTOR_TOP_3_TICKERS = {
  financials: ['JPM', 'V', 'MA'],
  healthcare: ['LLY', 'UNH', 'JNJ'],
  consumerRetail: ['COST', 'WMT', 'HD'],
  staplesFoodBev: ['PG', 'KO', 'PEP'],
  industrialsDefense: ['CAT', 'GE', 'RTX'],
  energy: ['XOM', 'CVX', 'COP'],
  utilities: ['NEE', 'SO', 'DUK'],
  reitsInfrastructure: ['PLD', 'EQIX', 'AMT'],
  telecomMedia: ['TMUS', 'DIS', 'CMCSA'],
  internationalLeaders: ['MELI', 'PDD', 'TSM'],
} as const;

export const AI_SPECULATIVE_TICKERS: string[] = [
  // Quantum computing
  'IONQ',
  'QBTS',
  'RGTI',
  'QUBT',

  // AI power / nuclear / grid / cooling
  'BE',
  'VRT',
  'OKLO',
  'SMR',
  'GEV',
  'PWR',
  'VST',
  'CEG',
  'ETN',

  // AI optical networking / data-center plumbing
  'LITE',
  'AAOI',
  'CRDO',
  'GLW',
  'COHR',
  'FN',
  'ALAB',

  // AI memory / storage
  'SNDK',
  'WDC',
  'STX',

  // AI cloud / compute / infrastructure
  'CRWV',
  'NBIS',
  'IREN',
  'DY',
  'DELL',
  'HPE',

  // AI software / robotics / applied AI
  'APP',
  'SOUN',
  'BBAI',
  'AI',
  'SERV',
  'RXRX',
  'TEM',
  'UPST',
  'PATH',
];

export const SECTOR_LEADER_TICKERS: string[] = Object.values(SECTOR_TOP_3_TICKERS).flat();

export const ALERT_TICKERS_100: string[] = Array.from(new Set([...BIG_TECH_TICKERS, ...SECTOR_LEADER_TICKERS, ...AI_SPECULATIVE_TICKERS]));

if (ALERT_TICKERS_100.length !== 100) {
  throw new Error(`Expected 100 alert tickers, got ${ALERT_TICKERS_100.length}`);
}

export const SEED_TICKERS = ALERT_TICKERS_100;
