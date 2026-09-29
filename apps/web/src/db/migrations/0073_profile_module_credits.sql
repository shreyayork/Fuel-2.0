ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "earned_modules" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "benchmark_earned" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "setup_incomplete" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspace_credit_ledger" ADD COLUMN IF NOT EXISTS "profile_prompt_dismissed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Grandfather existing Free workspaces as fully earned so we do not yank live 250 balances.
UPDATE "workspace_credit_ledger"
SET
  "earned_modules" = '["company","dev","gtm","rev"]'::jsonb,
  "benchmark_earned" = true
WHERE "plan_slug" = 'free';
