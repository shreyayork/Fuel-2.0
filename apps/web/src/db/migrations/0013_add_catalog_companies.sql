CREATE TABLE "catalog_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"website" text,
	"short_description" text,
	"long_description" text,
	"logo_url" text,
	"industry" text,
	"categories" jsonb,
	"location_city" text,
	"location_state" text,
	"location_country" text,
	"employee_count" text,
	"founded_on" text,
	"total_funding_usd" real,
	"num_funding_rounds" integer,
	"linkedin_url" text,
	"crunchbase_url" text,
	"twitter_url" text,
	"sources" jsonb,
	"created_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_companies" ADD CONSTRAINT "catalog_companies_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_companies_account_domain_unique" ON "catalog_companies" ("account_id", "domain") WHERE "domain" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_companies_account_name_idx" ON "catalog_companies" ("account_id", "name");
