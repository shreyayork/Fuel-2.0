ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "source_suggestion_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_initiatives_artifact_suggestion_uidx"
  ON "company_initiatives" ("account_id", "source_artifact_id", "source_suggestion_key")
  WHERE "source_artifact_id" IS NOT NULL AND "source_suggestion_key" IS NOT NULL;
