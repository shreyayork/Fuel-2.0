ALTER TABLE "credit_plans" ADD COLUMN "list_price_cents" integer;
--> statement-breakpoint
ALTER TABLE "credit_plans" ADD COLUMN "annual_list_price_cents" integer;
--> statement-breakpoint
ALTER TABLE "topup_packs" ADD COLUMN "list_price_cents" integer;
