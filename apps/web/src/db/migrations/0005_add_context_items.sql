CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."context_item_kind" AS ENUM('note', 'email', 'slack_message', 'meeting_transcript', 'hubspot_activity', 'funding_event', 'signal', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('hubspot', 'granola', 'slack', 'email');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"user_email" text NOT NULL,
	"kind" text NOT NULL,
	"subject_company_uuid" text,
	"prompt" text,
	"output" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_skill_invocations" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"status" text DEFAULT 'ok' NOT NULL,
	"latency_ms" integer,
	"error_message" text,
	"invoked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_items" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"company_uuid" text,
	"kind" "context_item_kind" NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"author_email" text,
	"source" text NOT NULL,
	"source_external_id" text,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"installed_by_email" text NOT NULL,
	"scope" text,
	"status" "integration_status" DEFAULT 'connected' NOT NULL,
	"credentials" jsonb NOT NULL,
	"account_external_id" text,
	"metadata" jsonb,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_sync_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skill_invocations" ADD CONSTRAINT "agent_skill_invocations_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_items" ADD CONSTRAINT "context_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;