import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

export const symbols = pgTable("symbols", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull().unique(),
  exchange: varchar("exchange", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  score: integer("score"),
  messageHash: varchar("message_hash", { length: 64 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const alertState = pgTable("alert_state", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  setupType: varchar("setup_type", { length: 50 }).notNull(),
  lastAlertedAt: timestamp("last_alerted_at").notNull(),
  lastScore: integer("last_score"),
  lastState: varchar("last_state", { length: 20 }),
});

export const scanSnapshots = pgTable("scan_snapshots", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  scanDate: timestamp("scan_date").notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  triggersJson: jsonb("triggers_json"),
  relativeVolume: real("relative_volume"),
  price: real("price"),
});
