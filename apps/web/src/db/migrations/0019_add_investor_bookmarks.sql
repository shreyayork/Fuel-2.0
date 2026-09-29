CREATE TABLE "investor_bookmarks" (
	"account_id" text NOT NULL,
	"investor_id" text NOT NULL,
	"investor_name" text NOT NULL,
	"added_by_email" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "investor_bookmarks_account_id_investor_id_pk" PRIMARY KEY("account_id","investor_id")
);--> statement-breakpoint

ALTER TABLE "investor_bookmarks" ADD CONSTRAINT "investor_bookmarks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "investor_bookmarks_account_idx" ON "investor_bookmarks" ("account_id");
