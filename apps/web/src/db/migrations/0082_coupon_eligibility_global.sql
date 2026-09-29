CREATE TYPE "public"."coupon_campaign_audience" AS ENUM('targeted', 'global');--> statement-breakpoint
ALTER TYPE "public"."coupon_campaign_status" ADD VALUE IF NOT EXISTS 'inactive';--> statement-breakpoint
ALTER TABLE "coupon_campaigns" ADD COLUMN IF NOT EXISTS "audience" "coupon_campaign_audience" DEFAULT 'targeted' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_campaigns" ADD COLUMN IF NOT EXISTS "global_promotion_code" text;--> statement-breakpoint
ALTER TABLE "coupon_campaigns" ADD COLUMN IF NOT EXISTS "global_stripe_promotion_code_id" text;--> statement-breakpoint
ALTER TABLE "coupon_campaigns" ADD COLUMN IF NOT EXISTS "max_redemptions" integer;--> statement-breakpoint
ALTER TABLE "coupon_recipients" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" text;--> statement-breakpoint
ALTER TABLE "coupon_recipients" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;--> statement-breakpoint
DROP INDEX IF EXISTS "coupon_recipients_stripe_promo_uidx";--> statement-breakpoint
DROP INDEX IF EXISTS "coupon_recipients_code_uidx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_recipients_stripe_promo_idx" ON "coupon_recipients" USING btree ("stripe_promotion_code_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_recipients_code_idx" ON "coupon_recipients" USING btree ("promotion_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_recipients_stripe_invoice_idx" ON "coupon_recipients" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_campaigns_global_code_uidx" ON "coupon_campaigns" USING btree ("global_promotion_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_campaigns_global_stripe_promo_uidx" ON "coupon_campaigns" USING btree ("global_stripe_promotion_code_id");
