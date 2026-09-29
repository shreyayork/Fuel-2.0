ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "source_documents" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "source_rationale" text;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "priority" text;
