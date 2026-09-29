CREATE TABLE IF NOT EXISTS "faq_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"footnote" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"curated_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_sort_order_idx" ON "faq_entries" USING btree ("sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_published_idx" ON "faq_entries" USING btree ("published");
