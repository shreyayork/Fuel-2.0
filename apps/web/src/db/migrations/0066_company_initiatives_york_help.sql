ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "york_help" jsonb;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "york_help_status" text NOT NULL DEFAULT 'idle';
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "york_help_content_hash" text;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "york_help_dismissed_until" timestamp;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "york_help_dismiss_forever" boolean NOT NULL DEFAULT false;
