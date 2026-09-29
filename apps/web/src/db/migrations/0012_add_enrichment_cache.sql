CREATE TABLE "enrichment_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"subject_key" text NOT NULL,
	"response" jsonb,
	"error" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"cost_tokens" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX "enrichment_cache_source_subject_unique" ON "enrichment_cache" ("source", "subject_key");--> statement-breakpoint
CREATE INDEX "enrichment_cache_expires_idx" ON "enrichment_cache" ("expires_at");
