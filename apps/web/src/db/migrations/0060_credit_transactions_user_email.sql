ALTER TABLE "credit_transactions" ADD COLUMN IF NOT EXISTS "user_email" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_account_user_idx" ON "credit_transactions" ("account_id","user_email","created_at");
