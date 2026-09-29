CREATE TYPE "public"."portfolio_update_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "portfolio_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"company_uuid" text NOT NULL,
	"period" text NOT NULL,
	"as_of" text,
	"fte_count" integer,
	"paid_customer_count" integer,
	"arr_usd" real,
	"arr_growth_yoy_pct" real,
	"nrr_pct" real,
	"logo_retention_pct" real,
	"gross_margin_pct" real,
	"cac_payback_months" real,
	"burn_multiple" real,
	"rule_of_40_pct" real,
	"cash_on_hand_usd" real,
	"monthly_burn_usd" real,
	"notable_customers" text,
	"notable_hires" text,
	"other_updates" text,
	"challenges" text,
	"banking_partner" text,
	"legal_counsel" text,
	"cloud_provider" text,
	"cap_table_platform" text,
	"do_insurance_provider" text,
	"crm_platform" text,
	"open_to_investor_intros" boolean DEFAULT false NOT NULL,
	"submitted_by_email" text NOT NULL,
	"status" "portfolio_update_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_updates" ADD CONSTRAINT "portfolio_updates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_updates_account_company_period_unique" ON "portfolio_updates" ("account_id", "company_uuid", "period");--> statement-breakpoint
CREATE INDEX "portfolio_updates_company_idx" ON "portfolio_updates" ("account_id", "company_uuid");
