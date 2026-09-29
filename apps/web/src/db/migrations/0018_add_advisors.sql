CREATE TYPE "public"."advisor_status" AS ENUM('active', 'archived');--> statement-breakpoint

CREATE TABLE "advisors" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"fuel_data_person_id" text,
	"name" text NOT NULL,
	"title" text,
	"company" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"photo_url" text,
	"bio" text,
	"expertise" jsonb,
	"focus_industries" jsonb,
	"location" text,
	"public_card" boolean DEFAULT false NOT NULL,
	"private_notes" text,
	"linkedin_data" jsonb,
	"linkedin_fetched_at" timestamp,
	"curated_by_email" text NOT NULL,
	"status" "advisor_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "company_advisors" (
	"account_id" text NOT NULL,
	"company_uuid" text NOT NULL,
	"advisor_id" text NOT NULL,
	"role" text,
	"added_by_email" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_advisors_account_id_company_uuid_advisor_id_pk" PRIMARY KEY("account_id","company_uuid","advisor_id")
);--> statement-breakpoint

ALTER TABLE "advisors" ADD CONSTRAINT "advisors_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_advisors" ADD CONSTRAINT "company_advisors_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_advisors" ADD CONSTRAINT "company_advisors_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "advisors_account_id_idx" ON "advisors" ("account_id");--> statement-breakpoint
CREATE INDEX "advisors_public_card_idx" ON "advisors" ("public_card") WHERE "public_card" = true;--> statement-breakpoint
CREATE INDEX "company_advisors_company_uuid_idx" ON "company_advisors" ("account_id","company_uuid");
