import { eq } from "drizzle-orm";
import { env } from "../../config/env.js";
import { db } from "../db/client.js";
import { symbols } from "../db/schema.js";

const WS_URL = `wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`;
const MAX_NEWS_PER_TICKER = 20;
const RECONNECT_DELAY_MS = 5_000;

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
    const existing = newsStore.get(item.related) ?? [];
    newsStore.set(
      item.related,
      [
        { headline: item.headline, source: item.source, datetime: item.datetime, url: item.url },
        ...existing,
      ].slice(0, MAX_NEWS_PER_TICKER)
    );
  }
}

async function getActiveTickers(): Promise<string[]> {
  const rows = await db.select().from(symbols).where(eq(symbols.isActive, true));
  return rows.map((r): string => r.ticker);
}

export async function startNewsWebSocket(): Promise<void> {
  const tickers = await getActiveTickers();

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
