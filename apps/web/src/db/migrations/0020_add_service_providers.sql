CREATE TYPE "public"."service_provider_category" AS ENUM(
	'legal',
	'accounting',
	'banking',
	'debt',
	'cap_table',
	'payroll',
	'benefits',
	'cloud',
	'data_infra',
	'ai_platform',
	'crm',
	'marketing',
	'recruiting',
	'insurance',
	'other'
);--> statement-breakpoint

CREATE TYPE "public"."service_provider_visibility" AS ENUM('global', 'internal');--> statement-breakpoint

CREATE TABLE "service_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "service_provider_category" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain" text,
	"website" text,
	"logo_url" text,
	"linkedin_url" text,
	"notes" text,
	"visibility" "service_provider_visibility" DEFAULT 'global' NOT NULL,
	"tags" jsonb,
	"curated_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "service_providers_category_idx" ON "service_providers" ("category");--> statement-breakpoint
CREATE INDEX "service_providers_visibility_idx" ON "service_providers" ("visibility");
