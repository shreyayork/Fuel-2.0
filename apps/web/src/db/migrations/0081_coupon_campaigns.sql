CREATE TYPE "public"."coupon_campaign_benefit_type" AS ENUM('percent_off', 'amount_off');--> statement-breakpoint
CREATE TYPE "public"."coupon_campaign_duration" AS ENUM('once', 'repeating', 'forever');--> statement-breakpoint
CREATE TYPE "public"."coupon_campaign_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."coupon_recipient_send_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"stripe_coupon_id" text NOT NULL,
	"benefit_type" "coupon_campaign_benefit_type" NOT NULL,
	"percent_off" integer,
	"amount_off_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"duration" "coupon_campaign_duration" NOT NULL,
	"duration_in_months" integer,
	"redeem_by" timestamp,
	"applies_to_price_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"code_prefix" text DEFAULT 'FUEL1' NOT NULL,
	"status" "coupon_campaign_status" DEFAULT 'active' NOT NULL,
	"created_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_campaigns_stripe_coupon_id_unique" UNIQUE("stripe_coupon_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"email" text NOT NULL,
	"promotion_code" text NOT NULL,
	"stripe_promotion_code_id" text NOT NULL,
	"send_status" "coupon_recipient_send_status" DEFAULT 'pending' NOT NULL,
	"send_error" text,
	"sent_at" timestamp,
	"redeemed_at" timestamp,
	"redeemed_account_id" text,
	"redeemed_checkout_session_id" text,
	"amount_discount_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_recipients" ADD CONSTRAINT "coupon_recipients_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_campaigns_status_idx" ON "coupon_campaigns" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_recipients_campaign_email_uidx" ON "coupon_recipients" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_recipients_stripe_promo_uidx" ON "coupon_recipients" USING btree ("stripe_promotion_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_recipients_code_uidx" ON "coupon_recipients" USING btree ("promotion_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_recipients_campaign_idx" ON "coupon_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_recipients_email_idx" ON "coupon_recipients" USING btree ("email");
