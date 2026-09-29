-- Link vault versions to context_items for signal extraction + intelligence counts.
ALTER TABLE "data_room_document_versions" ADD COLUMN "context_item_id" text;
--> statement-breakpoint
ALTER TABLE "data_room_document_versions" ADD CONSTRAINT "data_room_document_versions_context_item_id_context_items_id_fk" FOREIGN KEY ("context_item_id") REFERENCES "public"."context_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "data_room_versions_one_current_per_type" ON "data_room_document_versions" ("account_id","company_uuid","type_id") WHERE "is_current" = true;
