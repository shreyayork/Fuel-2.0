/**
 * One-off backfill: generate Titan v2 embeddings for every context_items row
 * that doesn't have one yet. Run via:
 *   tsx apps/web/src/db/backfill-embeddings.ts
 *
 * Idempotent — skips rows that already have an embedding.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { isNull, sql } from "drizzle-orm";

config({ path: resolve(__dirname, "..", "..", ".env") });

async function main() {
  const { getDb, getPool } = await import("./client");
  const { contextItems } = await import("./schema");
  const { embedText } = await import("../lib/enrichment/embeddings");

  const db = await getDb();
  const rows = await db
    .select({
      id: contextItems.id,
      title: contextItems.title,
      content: contextItems.content,
    })
    .from(contextItems)
    .where(isNull(contextItems.embedding));

  console.log(`Found ${rows.length} rows without embeddings.`);
  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const text = [row.title, row.content].filter(Boolean).join("\n\n");
    const emb = await embedText(text);
    if (!emb) {
      failed += 1;
      console.warn(`[skip] ${row.id} — embed failed`);
      continue;
    }
    const vec = `[${emb.join(",")}]`;
    await db.execute(sql`
      UPDATE context_items SET embedding = ${vec}::vector WHERE id = ${row.id}
    `);
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${rows.length}`);
  }

  console.log(`Done. embedded=${done} failed=${failed}`);
  const pool = await getPool();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
