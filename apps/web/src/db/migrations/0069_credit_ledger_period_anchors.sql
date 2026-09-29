ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "daily_period_start" timestamp;
--> statement-breakpoint
ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "monthly_period_start" timestamp;
--> statement-breakpoint
UPDATE "workspace_credit_ledger"
SET "daily_period_start" = date_trunc('day', (now() AT TIME ZONE 'UTC'))
WHERE "daily_period_start" IS NULL;
--> statement-breakpoint
UPDATE "workspace_credit_ledger"
SET "monthly_period_start" = date_trunc('month', (now() AT TIME ZONE 'UTC'))
WHERE "monthly_period_start" IS NULL;
