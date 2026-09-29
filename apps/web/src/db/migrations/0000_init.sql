CREATE TYPE "public"."company_investment_type" AS ENUM('investment', 'operating');--> statement-breakpoint
CREATE TYPE "public"."company_list" AS ENUM('portfolio', 'pipeline');--> statement-breakpoint
CREATE TYPE "public"."engagement_kind" AS ENUM('continuous', 'onetime');--> statement-breakpoint
CREATE TYPE "public"."team_type" AS ENUM('investment', 'operating', 'external');--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric" text NOT NULL,
	"p25" text NOT NULL,
	"p50" text NOT NULL,
	"p75" text NOT NULL,
	"you" text NOT NULL,
	"you_idx" real NOT NULL,
	"invert" boolean DEFAULT false NOT NULL,
	CONSTRAINT "benchmarks_metric_unique" UNIQUE("metric")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text NOT NULL,
	"stage" text NOT NULL,
	"industry" text NOT NULL,
	"list" "company_list" NOT NULL,
	"type" "company_investment_type" NOT NULL,
	"arr" real NOT NULL,
	"arr_growth" real NOT NULL,
	"burn" real,
	"runway" integer,
	"nrr" real NOT NULL,
	"fit_score" integer NOT NULL,
	"hq" text,
	"founded" integer,
	"employees" integer,
	"raising" boolean DEFAULT false NOT NULL,
	"target_round" text,
	"hubspot_stage" text,
	"hubspot_id" text,
	"hubspot_owner" text
);
--> statement-breakpoint
CREATE TABLE "engagement_team" (
	"engagement_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	CONSTRAINT "engagement_team_engagement_id_person_id_pk" PRIMARY KEY("engagement_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"kind" "engagement_kind" NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"health" text,
	"automation" integer,
	"since" text,
	"value" text,
	"signal" jsonb,
	"pct" integer,
	"due" text,
	"owner_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"role" text NOT NULL,
	"team" "team_type" NOT NULL,
	"focus" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"at" text NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagement_team" ADD CONSTRAINT "engagement_team_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_team" ADD CONSTRAINT "engagement_team_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;