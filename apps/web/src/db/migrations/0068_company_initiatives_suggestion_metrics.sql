ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "baseline_metric" text;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "target_metric" text;
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "benchmark_cohort" text;
