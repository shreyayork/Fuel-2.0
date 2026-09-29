CREATE TYPE "public"."artifact_visibility" AS ENUM('private', 'account', 'team');--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sections" jsonb,
	"subjects" jsonb NOT NULL,
	"agent_run_id" text,
	"author_email" text NOT NULL,
	"visibility" "artifact_visibility" DEFAULT 'account' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_account_kind_idx" ON "artifacts" ("account_id", "kind");--> statement-breakpoint
CREATE INDEX "artifacts_subjects_gin_idx" ON "artifacts" USING GIN ("subjects" jsonb_path_ops);
