CREATE TABLE "alert_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"setup_type" varchar(50) NOT NULL,
	"last_alerted_at" timestamp NOT NULL,
	"last_score" integer,
	"last_state" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"score" integer,
	"message_hash" varchar(64) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"scan_date" timestamp NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"triggers_json" jsonb,
	"relative_volume" real,
	"price" real
);
--> statement-breakpoint
CREATE TABLE "symbols" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"exchange" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "symbols_ticker_unique" UNIQUE("ticker")
);
