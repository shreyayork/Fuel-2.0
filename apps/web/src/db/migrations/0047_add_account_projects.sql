-- Hub integration: York IE project assignments per Fuel account (many-to-many).
CREATE TABLE "account_projects" (
  "account_id" text NOT NULL,
  "project_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "account_projects_account_id_project_id_pk" PRIMARY KEY("account_id", "project_id")
);
--> statement-breakpoint
ALTER TABLE "account_projects" ADD CONSTRAINT "account_projects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
