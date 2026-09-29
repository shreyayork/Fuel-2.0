ALTER TABLE "credit_plans" ADD COLUMN "monthly_price_cents" integer;
--> statement-breakpoint
ALTER TABLE "credit_plans" ADD COLUMN "annual_price_cents" integer;
--> statement-breakpoint
UPDATE "credit_plans"
SET
  "monthly_price_cents" = 3000,
  "annual_price_cents" = 30000,
  "updated_at" = now()
WHERE "slug" = 'pro';
