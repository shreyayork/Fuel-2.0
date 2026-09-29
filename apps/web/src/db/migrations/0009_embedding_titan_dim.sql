-- Titan v2 emits 1024-dim embeddings. Our initial schema used 1536 (OpenAI
-- default); since nothing is populated yet, drop and recreate at the new dim.
ALTER TABLE "context_items" DROP COLUMN IF EXISTS "embedding";--> statement-breakpoint
ALTER TABLE "context_items" ADD COLUMN "embedding" vector(1024);
