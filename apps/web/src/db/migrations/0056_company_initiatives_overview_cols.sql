-- 0051 was applied before overview_snapshot_id / suggested_from_weakness_id
-- were added to that migration file; add them idempotently here.
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "overview_snapshot_id" text;
--> statement-breakpoint
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "suggested_from_weakness_id" text;
