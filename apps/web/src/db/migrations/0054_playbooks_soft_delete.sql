ALTER TABLE "playbooks" ADD COLUMN "deleted_at" timestamptz;
--> statement-breakpoint
CREATE INDEX "playbooks_active_global_idx" ON "playbooks" ("category", "subcategory")
  WHERE "deleted_at" IS NULL AND "account_id" IS NULL;
