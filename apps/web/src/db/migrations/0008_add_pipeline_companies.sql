CREATE TABLE "pipeline_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"pipeline_config_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"provider_deal_id" text NOT NULL,
	"provider_company_id" text,
	"provider_pipeline_id" text NOT NULL,
	"provider_pipeline_stage_id" text,
	"company_name" text,
	"company_domain" text,
	"company_industry" text,
	"company_city" text,
	"company_country" text,
	"company_employees" text,
	"deal_name" text,
	"deal_amount" real,
	"deal_close_date" timestamp,
	"fuel_data_uuid" text,
	"raw_deal" jsonb,
	"raw_company" jsonb,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_companies" ADD CONSTRAINT "pipeline_companies_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_companies" ADD CONSTRAINT "pipeline_companies_pipeline_config_id_integration_pipeline_configs_id_fk" FOREIGN KEY ("pipeline_config_id") REFERENCES "public"."integration_pipeline_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_companies_deal_unique" ON "pipeline_companies" ("pipeline_config_id", "provider_deal_id");--> statement-breakpoint
CREATE INDEX "pipeline_companies_account_provider_idx" ON "pipeline_companies" ("account_id", "provider");
