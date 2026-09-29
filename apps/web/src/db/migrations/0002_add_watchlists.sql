CREATE TYPE "public"."watchlist_cadence" AS ENUM('off', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."watchlist_scope" AS ENUM('private', 'account', 'team');--> statement-breakpoint
CREATE TABLE "watchlist_companies" (
	"watchlist_id" text NOT NULL,
	"company_uuid" text NOT NULL,
	"name" text,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by_email" text,
	CONSTRAINT "watchlist_companies_watchlist_id_company_uuid_pk" PRIMARY KEY("watchlist_id","company_uuid")
);
--> statement-breakpoint
CREATE TABLE "watchlist_followers" (
	"watchlist_id" text NOT NULL,
	"user_email" text NOT NULL,
	"cadence" "watchlist_cadence" DEFAULT 'weekly' NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	CONSTRAINT "watchlist_followers_watchlist_id_user_email_pk" PRIMARY KEY("watchlist_id","user_email")
);
--> statement-breakpoint
CREATE TABLE "watchlist_shares" (
	"watchlist_id" text NOT NULL,
	"user_email" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "watchlist_shares_watchlist_id_user_email_pk" PRIMARY KEY("watchlist_id","user_email")
);
--> statement-breakpoint
CREATE TABLE "watchlist_teams" (
	"watchlist_id" text NOT NULL,
	"team_id" text NOT NULL,
	CONSTRAINT "watchlist_teams_watchlist_id_team_id_pk" PRIMARY KEY("watchlist_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "watchlist_scope" DEFAULT 'private' NOT NULL,
	"cadence" "watchlist_cadence" DEFAULT 'weekly' NOT NULL,
	"owner_email" text NOT NULL,
	"account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"legacy_id" text,
	CONSTRAINT "watchlists_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
ALTER TABLE "watchlist_companies" ADD CONSTRAINT "watchlist_companies_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_followers" ADD CONSTRAINT "watchlist_followers_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_shares" ADD CONSTRAINT "watchlist_shares_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_teams" ADD CONSTRAINT "watchlist_teams_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;