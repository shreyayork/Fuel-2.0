ALTER TABLE "accounts" ADD COLUMN "plan_tier" text NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "monthly_token_limit" integer;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "cost_tokens" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "agent_skill_invocations" ADD COLUMN "cost_tokens" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE INDEX "agent_runs_account_started_idx" ON "agent_runs" ("account_id", "started_at");--> statement-breakpoint
CREATE INDEX "agent_runs_user_started_idx" ON "agent_runs" ("user_email", "started_at");
