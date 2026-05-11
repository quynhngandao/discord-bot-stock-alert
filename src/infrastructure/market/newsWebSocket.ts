import { env } from "../../config/env.js";
import { MEGA_CAP_TECH_TICKERS } from "../../data/seedTickers.js";
import { sendNewsAlert } from "../discord/scanAlertAdapter.js";

const WS_URL = `wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`;
const MAX_NEWS_PER_TICKER = 20;
const RECONNECT_DELAY_MS = 5_000;
const NEWS_ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes per ticker

interface NewsItem {
  headline: string;
  source: string;
  datetime: number;
  url: string;
}

interface FinnhubNewsMessage {
  type: string;
  data: Array<{
    related: string;
    headline: string;
    source: string;
    datetime: number;
    url: string;
  }>;
}

const newsStore = new Map<string, NewsItem[]>();
const lastAlertedAt = new Map<string, number>(); // ticker → timestamp

export function getRecentNews(ticker: string): NewsItem[] {
  return newsStore.get(ticker) ?? [];
}

export function hasRecentNews(ticker: string, withinMinutes = 60): boolean {
  const cutoff = Date.now() / 1000 - withinMinutes * 60;
  return getRecentNews(ticker).some((item): boolean => item.datetime >= cutoff);
}

function subscribeAll(socket: WebSocket, tickers: string[]): void {
  for (const ticker of tickers) {
    socket.send(JSON.stringify({ type: "subscribe-news", symbol: ticker }));
  }
}

function isFinnhubNewsMessage(msg: unknown): msg is FinnhubNewsMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>)["type"] === "news" &&
    Array.isArray((msg as Record<string, unknown>)["data"])
  );
}

function handleMessage(raw: string): void {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (!isFinnhubNewsMessage(msg)) return;

  for (const item of msg.data) {
    if (!item.related) continue;
    const ticker = item.related;

    const existing = newsStore.get(ticker) ?? [];
    newsStore.set(
      ticker,
      [
        { headline: item.headline, source: item.source, datetime: item.datetime, url: item.url },
        ...existing,
      ].slice(0, MAX_NEWS_PER_TICKER)
    );

    // Send Discord alert for first news item within cooldown window
    const last = lastAlertedAt.get(ticker) ?? 0;
    if (Date.now() - last >= NEWS_ALERT_COOLDOWN_MS) {
      lastAlertedAt.set(ticker, Date.now());
      sendNewsAlert(ticker, item.headline, item.source, item.url).catch((err) => {
        console.error(`[Discord] Failed to send news alert for ${ticker}:`, err);
      });
    }
  }
}

export async function startNewsWebSocket(): Promise<void> {
  const tickers = MEGA_CAP_TECH_TICKERS;

  function connect(): void {
    const socket = new WebSocket(WS_URL);

    function onOpen(): void {
      console.log(`News WebSocket connected — subscribing to ${tickers.length} symbols`);
      subscribeAll(socket, tickers);
    }

    function onMessage(event: MessageEvent): void {
      handleMessage(typeof event.data === "string" ? event.data : String(event.data));
    }

    function onError(): void {
      console.error("News WebSocket error");
    }

    function onClose(): void {
      console.warn(`News WebSocket closed — reconnecting in ${RECONNECT_DELAY_MS / 1000}s`);
      setTimeout(connect, RECONNECT_DELAY_MS);
    }

    socket.onopen = onOpen;
    socket.onmessage = onMessage;
    socket.onerror = onError;
    socket.onclose = onClose;
  }

  connect();
}
