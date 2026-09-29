CREATE TABLE IF NOT EXISTS "york_chip_headlines" (
  "id" text PRIMARY KEY NOT NULL,
  "category" text NOT NULL,
  "chip_label" text NOT NULL,
  "headline" text NOT NULL,
  "updated_by_email" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "york_chip_headlines_cat_label" ON "york_chip_headlines" USING btree ("category","chip_label");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "york_chip_headlines_category_idx" ON "york_chip_headlines" USING btree ("category");
