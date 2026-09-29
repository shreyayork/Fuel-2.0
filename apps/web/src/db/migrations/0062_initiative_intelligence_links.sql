ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "intelligence_links" jsonb NOT NULL DEFAULT '[]'::jsonb;
