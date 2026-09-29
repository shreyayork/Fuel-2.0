ALTER TABLE "billing_invoices" ADD COLUMN "fuel_pdf_generated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "fuel_invoice_email_sent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "fuel_invoice_email_message_id" text;
