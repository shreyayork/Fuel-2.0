import "server-only";
import { desc, eq, and, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { contextItems, type ContextItem } from "@/db/schema";
import { embedText } from "./enrichment/embeddings";
import { onContextItemCreated } from "./context/extract";

export async function listContextForCompany(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
}): Promise<ContextItem[]> {
  const db = await getDb();
  return db
    .select()
    .from(contextItems)
    .where(
      and(
        eq(contextItems.accountId, opts.accountId),
        eq(contextItems.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(desc(contextItems.occurredAt))
    .limit(opts.limit ?? 100);
}

export async function addContextItem(opts: {
  accountId: string;
  companyUuid?: string | null;
  kind: ContextItem["kind"];
  title?: string;
  content: string;
  authorEmail?: string;
  source: string;
  sourceExternalId?: string;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
  /** When true, skip the Claude extraction hook. Used by retro jobs that
   *  run extraction separately, and by code paths that insert items which
   *  aren't worth extracting against (e.g. placeholders). */
  skipExtraction?: boolean;
}): Promise<ContextItem> {
  const db = await getDb();
  const id = randomUUID();
  // Embed on insert — fast (~200-400ms for Titan v2 at 1024-dim). We embed
  // title + content so short title-only items still have a useful vector.
  const embedInput = [opts.title, opts.content].filter(Boolean).join("\n\n");
  const embedding = await embedText(embedInput);
  const [row] = await db
    .insert(contextItems)
    .values({
      id,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid ?? null,
      kind: opts.kind,
      title: opts.title,
      content: opts.content,
      authorEmail: opts.authorEmail,
      source: opts.source,
      sourceExternalId: opts.sourceExternalId,
      occurredAt: opts.occurredAt ?? new Date(),
      metadata: opts.metadata,
      embedding: embedding ?? undefined,
    })
    .returning();

  if (!opts.skipExtraction) {
    // Awaited so the footnote can render on the next page load. Failures
    // are swallowed inside the hook — extraction errors never abort ingest.
    await onContextItemCreated(row);
  }

  return row;
}

export async function deleteContextItem(opts: { accountId: string; id: string }): Promise<void> {
  const db = await getDb();
  await db
    .delete(contextItems)
    .where(and(eq(contextItems.id, opts.id), eq(contextItems.accountId, opts.accountId)));
}

/** Similarity search — requires embeddings. Returns [] until the embedder worker runs. */
export async function findSimilarContext(opts: {
  accountId: string;
  embedding: number[];
  limit?: number;
}): Promise<ContextItem[]> {
  const db = await getDb();
  const vec = `[${opts.embedding.join(",")}]`;
  const limit = opts.limit ?? 10;
  const rows = await db.execute(sql`
    SELECT * FROM context_items
    WHERE account_id = ${opts.accountId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
  return rows.rows as unknown as ContextItem[];
}
