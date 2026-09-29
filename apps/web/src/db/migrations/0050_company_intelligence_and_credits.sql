-- Intelligence items generated from documents and manual founder entries.
CREATE TABLE "company_intelligence" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "company_uuid" text NOT NULL,
  "category" text NOT NULL,
  "headline" text NOT NULL,
  "key_detail" text,
  "summary" text NOT NULL,
  "confidence" real NOT NULL,
  "source" text NOT NULL,
  "generation_path" text,
  "period" text,
  "context_item_id" text,
  "document_version_id" text,
  "raw_snippet" text,
  "metadata" jsonb,
  "is_benchmark" boolean DEFAULT false NOT NULL,
  "dismissed_at" timestamp,
  "author_email" text,
  "agent_run_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_context_item_id_context_items_id_fk" FOREIGN KEY ("context_item_id") REFERENCES "public"."context_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_document_version_id_data_room_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."data_room_document_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "company_intelligence_company_idx" ON "company_intelligence" USING btree ("account_id","company_uuid","created_at");
--> statement-breakpoint
CREATE INDEX "company_intelligence_context_idx" ON "company_intelligence" USING btree ("context_item_id");
--> statement-breakpoint
CREATE INDEX "company_intelligence_document_idx" ON "company_intelligence" USING btree ("document_version_id");
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "credit_balance" integer DEFAULT 100 NOT NULL;
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "amount" integer NOT NULL,
  "reason" text NOT NULL,
  "reference_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "credit_ledger_account_idx" ON "credit_ledger" USING btree ("account_id","created_at");
