ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "assignees" jsonb NOT NULL DEFAULT '[]'::jsonb;
