CREATE TABLE "credit_plans" (
  "slug" text PRIMARY KEY NOT NULL,
  "display_name" text NOT NULL,
  "monthly_limit" integer NOT NULL,
  "daily_limit" integer NOT NULL,
  "block_duration_ms" integer NOT NULL,
  "stripe_monthly_price_id" text,
  "stripe_annual_price_id" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_action_costs" (
  "action_slug" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "cost" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topup_packs" (
  "slug" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "credits" integer NOT NULL,
  "price_cents" integer NOT NULL,
  "blurb" text NOT NULL,
  "discount" text,
  "popular" boolean DEFAULT false NOT NULL,
  "stripe_price_id" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_credit_ledger" (
  "account_id" text PRIMARY KEY NOT NULL,
  "plan_slug" text NOT NULL,
  "monthly_used" integer DEFAULT 0 NOT NULL,
  "daily_used" integer DEFAULT 0 NOT NULL,
  "top_up_balance" integer DEFAULT 0 NOT NULL,
  "block_until" timestamp,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "monthly_low_toast_shown" boolean DEFAULT false NOT NULL,
  "stats" jsonb DEFAULT '{"signals":0,"docs":0,"messages":0}'::jsonb NOT NULL,
  "stripe_subscription_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "action_slug" text,
  "amount" integer NOT NULL,
  "source" text NOT NULL,
  "reference_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_credit_ledger" ADD CONSTRAINT "workspace_credit_ledger_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_credit_ledger" ADD CONSTRAINT "workspace_credit_ledger_plan_slug_credit_plans_slug_fk" FOREIGN KEY ("plan_slug") REFERENCES "public"."credit_plans"("slug") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "credit_transactions_account_idx" ON "credit_transactions" USING btree ("account_id","created_at");
--> statement-breakpoint
INSERT INTO "credit_plans" ("slug", "display_name", "monthly_limit", "daily_limit", "block_duration_ms", "active", "created_at", "updated_at")
VALUES
  ('free', 'Free', 250, 75, 86400000, true, now(), now()),
  ('pro', 'Pro', 2000, 200, 21600000, true, now(), now());
--> statement-breakpoint
INSERT INTO "credit_action_costs" ("action_slug", "label", "cost", "active", "updated_at")
VALUES
  ('docUpload', 'Doc upload + signal', 20, true, now()),
  ('aiChat', 'AI chat message', 3, true, now()),
  ('generateSource', 'Generate source', 8, true, now()),
  ('playbookRun', 'Playbook run', 40, true, now()),
  ('crunchbaseEnrichment', 'Crunchbase enrichment', 5, false, now());
--> statement-breakpoint
INSERT INTO "topup_packs" ("slug", "label", "credits", "price_cents", "blurb", "discount", "popular", "sort_order", "active", "updated_at")
VALUES
  ('sprint', 'Sprint', 1000, 1200, 'A focused session — fundraising prep, board deck review, or a deep dive on one company.', NULL, false, 1, true, now()),
  ('builder', 'Builder', 2000, 2000, 'A strong week — multiple document uploads, several playbook runs, and ongoing AI research.', 'Save 17%', false, 2, true, now()),
  ('growth', 'Growth', 5000, 4800, 'A heavy month — full document library, deep playbook runs, and AI research across your whole portfolio.', 'Save 20%', true, 3, true, now()),
  ('scale', 'Scale', 8000, 7700, 'A full fundraising sprint or due diligence cycle — maximum intelligence generation across many sources.', 'Save 20%', false, 4, true, now());
--> statement-breakpoint
INSERT INTO "workspace_credit_ledger" ("account_id", "plan_slug", "monthly_used", "daily_used", "top_up_balance", "stats", "created_at", "updated_at")
SELECT
  a.id,
  'free',
  0,
  0,
  0,
  '{"signals":0,"docs":0,"messages":0}'::jsonb,
  now(),
  now()
FROM "accounts" a
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_credit_ledger" w WHERE w.account_id = a.id
);
