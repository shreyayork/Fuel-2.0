import "dotenv/config";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, getPool } from "../client";
import { contextItems } from "../schema";
import { onContextItemCreated } from "../../lib/context/extract";

/**
 * One-shot retro-extraction: iterates every context_item that has a
 * company_uuid and re-runs the signal extraction hook. Idempotent — the
 * hook deletes prior observations for an item before inserting new ones.
 *
 * Usage:
 *   npx tsx src/db/scripts/retro-extract-observations.ts [--account=<id>]
 *
 * Prints progress every 25 items and a final tally. Safe to abort mid-run
 * and restart — already-extracted items will just be re-extracted.
 */
async function main() {
  const accountFlag = process.argv.find((a) => a.startsWith("--account="));
  const scopeAccountId = accountFlag?.split("=")[1];

  const db = await getDb();
  const rows = await db
    .select()
    .from(contextItems)
    .where(
      scopeAccountId
        ? and(isNotNull(contextItems.companyUuid), eq(contextItems.accountId, scopeAccountId))
        : isNotNull(contextItems.companyUuid),
    );

  console.log(`[retro-extract] ${rows.length} context items to re-extract${scopeAccountId ? ` (account=${scopeAccountId})` : ""}`);

  let extracted = 0;
  let skipped = 0;
  let errors = 0;
  let observations = 0;

  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    try {
      const res = await onContextItemCreated(item);
      if (res.error) {
        if (res.error === "too_short" || res.error === "no_company" || res.error === "no_signals") {
          skipped++;
        } else {
          errors++;
          console.warn(`[retro-extract] ${item.id} error: ${res.error}`);
        }
      } else {
        extracted++;
        observations += res.observations;
      }
    } catch (e) {
      errors++;
      console.warn(`[retro-extract] ${item.id} threw: ${(e as Error).message?.slice(0, 200)}`);
    }
    if ((i + 1) % 25 === 0) {
      console.log(
        `[retro-extract] ${i + 1}/${rows.length} — extracted=${extracted} skipped=${skipped} errors=${errors} observations=${observations}`,
      );
    }
  }

  console.log(
    `[retro-extract] DONE — ${rows.length} items, extracted=${extracted} skipped=${skipped} errors=${errors} observations=${observations}`,
  );

  const pool = await getPool();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
