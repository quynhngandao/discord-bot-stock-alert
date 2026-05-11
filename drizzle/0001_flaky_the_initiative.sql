CREATE TABLE "fundamentals_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"data" jsonb NOT NULL,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fundamentals_cache_ticker_unique" UNIQUE("ticker")
);
