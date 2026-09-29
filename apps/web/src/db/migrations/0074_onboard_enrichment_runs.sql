CREATE TABLE "onboard_enrichment_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "cognito_sub" text NOT NULL,
  "user_email" text NOT NULL,
  "domain" text NOT NULL,
  "fuel_data_company_id" text,
  "target_source" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "enrichment_payload" jsonb,
  "extracted_payload" jsonb,
  "benchmark_hints" jsonb,
  "error_message" text,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "account_id" text,
  "catalog_company_id" text,
  "claimed_at" timestamp,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboard_enrichment_runs"
  ADD CONSTRAINT "onboard_enrichment_runs_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "onboard_enrichment_runs"
  ADD CONSTRAINT "onboard_enrichment_runs_catalog_company_id_catalog_companies_id_fk"
  FOREIGN KEY ("catalog_company_id") REFERENCES "public"."catalog_companies"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "onboard_enrichment_runs_active_unique"
  ON "onboard_enrichment_runs" USING btree ("cognito_sub", "domain")
  WHERE "onboard_enrichment_runs"."status" in ('pending', 'queued', 'running');
--> statement-breakpoint
CREATE INDEX "onboard_enrichment_runs_user_idx"
  ON "onboard_enrichment_runs" USING btree ("cognito_sub", "started_at");
--> statement-breakpoint
CREATE INDEX "onboard_enrichment_runs_account_idx"
  ON "onboard_enrichment_runs" USING btree ("account_id", "catalog_company_id");
