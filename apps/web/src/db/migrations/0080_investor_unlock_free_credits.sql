-- Unlock Free credits for existing investor workspaces. Investors never fill
-- founder profile/benchmark earn fields, so they should receive the full Super
-- Admin Free monthly limit (same earn state as new investor provision).
UPDATE "workspace_credit_ledger" AS l
SET
  "earned_modules" = '["company","dev","gtm","rev"]'::jsonb,
  "benchmark_earned" = true,
  "setup_incomplete" = false,
  "updated_at" = now()
FROM "accounts" AS a
WHERE l."account_id" = a."id"
  AND l."plan_slug" = 'free'
  AND a."portfolio_manager_enabled" = true
  AND a."primary_company_uuid" IS NULL;
