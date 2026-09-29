-- Repair overview_playbook_suggestions: earlier prototype created the table
-- without category_id/rank, and 0051's CREATE IF NOT EXISTS never added them.

ALTER TABLE "overview_playbook_suggestions"
  ADD COLUMN IF NOT EXISTS "category_id" text;
--> statement-breakpoint
ALTER TABLE "overview_playbook_suggestions"
  ADD COLUMN IF NOT EXISTS "rank" integer DEFAULT 0 NOT NULL;
