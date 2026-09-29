-- Data Room: versioned private documents per company workspace.
-- One current file per document type (pitch_deck, financial_model, custom:*).
-- Replacing a type archives the previous row (is_current = false).
CREATE TABLE "data_room_document_versions" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "company_uuid" text NOT NULL,
  "type_id" text NOT NULL,
  "type_label" text NOT NULL,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "byte_size" integer NOT NULL,
  "storage_key" text NOT NULL,
  "source" text DEFAULT 'data_room' NOT NULL,
  "uploaded_at" timestamp NOT NULL,
  "uploaded_by_email" text NOT NULL,
  "is_current" boolean DEFAULT true NOT NULL,
  "superseded_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "data_room_document_versions" ADD CONSTRAINT "data_room_document_versions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "data_room_versions_company_type_idx" ON "data_room_document_versions" USING btree ("account_id","company_uuid","type_id");
--> statement-breakpoint
CREATE INDEX "data_room_versions_current_idx" ON "data_room_document_versions" USING btree ("account_id","company_uuid","is_current");
