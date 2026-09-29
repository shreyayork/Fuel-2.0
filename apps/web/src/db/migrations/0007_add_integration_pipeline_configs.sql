CREATE TABLE "integration_pipeline_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"provider_pipeline_id" text NOT NULL,
	"provider_pipeline_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_sync_at" timestamp,
	"sync_state" jsonb
);
--> statement-breakpoint
ALTER TABLE "integration_pipeline_configs" ADD CONSTRAINT "integration_pipeline_configs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_pipeline_configs" ADD CONSTRAINT "integration_pipeline_configs_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_pipeline_configs_unique" ON "integration_pipeline_configs" ("account_id", "provider", "provider_pipeline_id");
