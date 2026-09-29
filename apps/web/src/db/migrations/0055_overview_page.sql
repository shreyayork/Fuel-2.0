ALTER TABLE "playbooks" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN IF NOT EXISTS "is_visible" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "source" text;
--> statement-breakpoint
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "overview_snapshot_id" text;
--> statement-breakpoint
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "overview_category_id" text;
--> statement-breakpoint
ALTER TABLE "company_initiatives" ADD COLUMN IF NOT EXISTS "suggested_from_weakness_id" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "overview_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "company_uuid" text NOT NULL,
  "advisor_summary" text NOT NULL,
  "signal_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "recommended_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "journey_stage" text,
  "journey_label" text,
  "context_completion_pct" integer DEFAULT 0,
  "playbook_id" text,
  "agent_run_id" text,
  "ai_model" text,
  "generated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "overview_snapshots"
  ADD CONSTRAINT "overview_snapshots_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "overview_snapshots"
  ADD CONSTRAINT "overview_snapshots_playbook_id_fk"
  FOREIGN KEY ("playbook_id") REFERENCES "playbooks"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "overview_snapshots"
  ADD CONSTRAINT "overview_snapshots_agent_run_id_fk"
  FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE set null;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "overview_snapshots_company_unique"
  ON "overview_snapshots" ("account_id", "company_uuid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "overview_snapshots_account_idx"
  ON "overview_snapshots" ("account_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "overview_category_scores" (
  "id" text PRIMARY KEY NOT NULL,
  "snapshot_id" text NOT NULL,
  "account_id" text NOT NULL,
  "company_uuid" text NOT NULL,
  "category_id" text NOT NULL,
  "label" text NOT NULL,
  "full_label" text NOT NULL,
  "score" integer DEFAULT 50 NOT NULL,
  "status_label" text NOT NULL,
  "status_tone" text NOT NULL,
  "confidence_level" text DEFAULT 'Medium' NOT NULL,
  "focus_narrative" text,
  "insight" text,
  "strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "benchmark_chips" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "score_contributors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "intelligence_count" integer DEFAULT 0,
  "initiative_count" integer DEFAULT 0,
  "playbook_count" integer DEFAULT 0,
  "detail_answered_count" integer DEFAULT 0,
  "detail_question_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "overview_category_scores"
  ADD CONSTRAINT "overview_category_scores_snapshot_id_fk"
  FOREIGN KEY ("snapshot_id") REFERENCES "overview_snapshots"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "overview_category_scores"
  ADD CONSTRAINT "overview_category_scores_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "overview_category_scores_snapshot_cat"
  ON "overview_category_scores" ("snapshot_id", "category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "overview_category_scores_company_idx"
  ON "overview_category_scores" ("account_id", "company_uuid");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_detail_answers" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "company_uuid" text NOT NULL,
  "question_id" text NOT NULL,
  "answer" text,
  "quarter_label" text,
  "source" text DEFAULT 'overview' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_detail_answers"
  ADD CONSTRAINT "company_detail_answers_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_detail_answers_unique"
  ON "company_detail_answers" ("account_id", "company_uuid", "question_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_detail_answers_company_idx"
  ON "company_detail_answers" ("account_id", "company_uuid");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "overview_playbook_suggestions" (
  "id" text PRIMARY KEY NOT NULL,
  "snapshot_id" text NOT NULL,
  "playbook_id" text NOT NULL,
  "category_id" text,
  "reason" text,
  "rank" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "overview_playbook_suggestions"
  ADD CONSTRAINT "overview_playbook_suggestions_snapshot_id_fk"
  FOREIGN KEY ("snapshot_id") REFERENCES "overview_snapshots"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "overview_playbook_suggestions"
  ADD CONSTRAINT "overview_playbook_suggestions_playbook_id_fk"
  FOREIGN KEY ("playbook_id") REFERENCES "playbooks"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "overview_playbook_suggestions_snapshot_idx"
  ON "overview_playbook_suggestions" ("snapshot_id");
