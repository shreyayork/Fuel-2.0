CREATE TYPE "public"."playbook_visibility" AS ENUM('global', 'account', 'team');--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text,
	"category" text NOT NULL,
	"subcategory" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"target_kind" text,
	"tags" jsonb,
	"visibility" "playbook_visibility" DEFAULT 'global' NOT NULL,
	"author_email" text,
	"embedding" vector(1024),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbooks_category_idx" ON "playbooks" ("category", "subcategory");--> statement-breakpoint
CREATE INDEX "playbooks_visibility_account_idx" ON "playbooks" ("visibility", "account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playbooks_slug_scope_unique" ON "playbooks" ("slug", "account_id");--> statement-breakpoint

CREATE TABLE "benchmark_cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"metric" text NOT NULL,
	"cohort_key" text NOT NULL,
	"dimensions" jsonb NOT NULL,
	"p25" real,
	"p50" real,
	"p75" real,
	"p90" real,
	"sample_size" integer,
	"period" text NOT NULL,
	"source" text NOT NULL,
	"inverted_good" boolean DEFAULT false NOT NULL,
	"unit" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "benchmark_cohorts_key_metric_period" ON "benchmark_cohorts" ("metric", "cohort_key", "period");--> statement-breakpoint
CREATE INDEX "benchmark_cohorts_cohort_idx" ON "benchmark_cohorts" ("cohort_key");
