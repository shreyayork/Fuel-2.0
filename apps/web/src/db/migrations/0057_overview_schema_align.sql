-- Repair drift from an earlier overview prototype (F20A-81): tables were
-- created with legacy names/columns before 0051 ran with CREATE IF NOT EXISTS.

ALTER TABLE "overview_snapshots" ADD COLUMN IF NOT EXISTS "agent_run_id" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "overview_snapshots"
    ADD CONSTRAINT "overview_snapshots_agent_run_id_fk"
    FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.category_scores') IS NOT NULL
     AND to_regclass('public.overview_category_scores') IS NULL THEN
    ALTER TABLE "category_scores" RENAME TO "overview_category_scores";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "company_detail_answers" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'overview';
--> statement-breakpoint
UPDATE "company_detail_answers" SET "source" = 'overview' WHERE "source" IS NULL;
--> statement-breakpoint
ALTER TABLE "company_detail_answers" ALTER COLUMN "source" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "overview_snapshots_company_unique"
  ON "overview_snapshots" ("account_id", "company_uuid");
