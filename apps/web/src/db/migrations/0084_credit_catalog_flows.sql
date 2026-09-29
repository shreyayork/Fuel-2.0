-- Founder and Investor credit catalogs share the existing tables.
-- Legacy rows stay founder. Investor Free is granted in full (not earned).
-- Idempotent so a database that already applied an earlier draft of this
-- change (flow columns, composite keys) can move forward with 0083 list prices.

ALTER TABLE "credit_plans" ADD COLUMN IF NOT EXISTS "flow" text DEFAULT 'founder' NOT NULL;
ALTER TABLE "credit_action_costs" ADD COLUMN IF NOT EXISTS "flow" text DEFAULT 'founder' NOT NULL;
ALTER TABLE "topup_packs" ADD COLUMN IF NOT EXISTS "flow" text DEFAULT 'founder' NOT NULL;
ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "flow" text DEFAULT 'founder' NOT NULL;

ALTER TABLE "credit_plans" DROP COLUMN IF EXISTS "compare_at_monthly_cents";
ALTER TABLE "credit_plans" DROP COLUMN IF EXISTS "compare_at_annual_cents";

ALTER TABLE "workspace_credit_ledger" DROP CONSTRAINT IF EXISTS "workspace_credit_ledger_plan_slug_credit_plans_slug_fk";

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"credit_plans"'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) LIKE '%flow%'
  ) THEN
    ALTER TABLE "credit_plans" DROP CONSTRAINT "credit_plans_pkey";
    ALTER TABLE "credit_plans" ADD CONSTRAINT "credit_plans_pkey" PRIMARY KEY ("flow", "slug");
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "credit_plans" ADD CONSTRAINT "credit_plans_flow_check" CHECK ("flow" IN ('founder', 'investor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"credit_action_costs"'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) LIKE '%flow%'
  ) THEN
    ALTER TABLE "credit_action_costs" DROP CONSTRAINT "credit_action_costs_pkey";
    ALTER TABLE "credit_action_costs" ADD CONSTRAINT "credit_action_costs_pkey" PRIMARY KEY ("flow", "action_slug");
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "credit_action_costs" ADD CONSTRAINT "credit_action_costs_flow_check" CHECK ("flow" IN ('founder', 'investor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"topup_packs"'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) LIKE '%flow%'
  ) THEN
    ALTER TABLE "topup_packs" DROP CONSTRAINT "topup_packs_pkey";
    ALTER TABLE "topup_packs" ADD CONSTRAINT "topup_packs_pkey" PRIMARY KEY ("flow", "slug");
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "topup_packs" ADD CONSTRAINT "topup_packs_flow_check" CHECK ("flow" IN ('founder', 'investor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_credit_ledger" ADD CONSTRAINT "workspace_credit_ledger_flow_check" CHECK ("flow" IN ('founder', 'investor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "credit_plans" (
  "flow", "slug", "display_name", "monthly_limit", "daily_limit", "block_duration_ms",
  "monthly_price_cents", "annual_price_cents", "active", "created_at", "updated_at"
) VALUES
  ('investor', 'free', 'Free', 1000, 200, 86400000, NULL, NULL, true, now(), now()),
  ('investor', 'pro', 'Pro', 5000, 500, 21600000, 9900, 99000, true, now(), now())
ON CONFLICT ("flow", "slug") DO NOTHING;

INSERT INTO "credit_action_costs" ("flow", "action_slug", "label", "cost", "active", "updated_at")
VALUES
  ('investor', 'docUpload', 'Doc upload + signal', 40, true, now()),
  ('investor', 'aiChat', 'AI chat message', 6, true, now()),
  ('investor', 'generateSource', 'Generate source', 16, true, now()),
  ('investor', 'playbookRun', 'Playbook run', 80, true, now()),
  ('investor', 'crunchbaseEnrichment', 'Crunchbase enrichment', 10, false, now()),
  ('investor', 'hubspotSync', 'HubSpot sync', 0, true, now()),
  ('investor', 'granolaSync', 'Granola sync', 0, true, now()),
  ('investor', 'slackSync', 'Slack sync', 0, true, now())
ON CONFLICT ("flow", "action_slug") DO NOTHING;

INSERT INTO "topup_packs" (
  "flow", "slug", "label", "credits", "price_cents", "blurb", "discount", "popular", "sort_order", "active", "updated_at"
) VALUES
  ('investor', 'sprint', 'Sprint', 2000, 2400, 'A focused session — fundraising prep, board deck review, or a deep dive on one company.', NULL, false, 1, true, now()),
  ('investor', 'builder', 'Builder', 4000, 4000, 'A strong week — multiple document uploads, several playbook runs, and ongoing AI research.', 'Save 17%', false, 2, true, now()),
  ('investor', 'growth', 'Growth', 10000, 9600, 'A heavy month — full document library, deep playbook runs, and AI research across your whole portfolio.', 'Save 20%', true, 3, true, now()),
  ('investor', 'scale', 'Scale', 16000, 15400, 'A full fundraising sprint or due diligence cycle — maximum intelligence generation across many sources.', 'Save 20%', false, 4, true, now())
ON CONFLICT ("flow", "slug") DO NOTHING;

-- Existing investor workspaces (same predicate as 0080) use the Investor catalog.
-- Usage and top-up balance stay. Founder earn-module flags are cleared.
UPDATE "workspace_credit_ledger" AS l
SET
  "flow" = 'investor',
  "earned_modules" = '[]'::jsonb,
  "benchmark_earned" = false,
  "updated_at" = now()
FROM "accounts" AS a
WHERE l."account_id" = a."id"
  AND a."portfolio_manager_enabled" = true
  AND a."primary_company_uuid" IS NULL
  AND l."flow" IS DISTINCT FROM 'investor';

DO $$ BEGIN
  ALTER TABLE "workspace_credit_ledger"
    ADD CONSTRAINT "workspace_credit_ledger_flow_plan_fk"
    FOREIGN KEY ("flow", "plan_slug") REFERENCES "credit_plans"("flow", "slug");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
