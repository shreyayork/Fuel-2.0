CREATE TYPE "public"."watchlist_kind" AS ENUM('portfolio', 'watchlist');--> statement-breakpoint
ALTER TABLE "watchlists" ADD COLUMN "kind" "watchlist_kind" DEFAULT 'watchlist' NOT NULL;--> statement-breakpoint
ALTER TABLE "watchlists" ADD COLUMN "fund_name" text;