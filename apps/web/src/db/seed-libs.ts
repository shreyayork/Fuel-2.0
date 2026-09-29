// Local-dev counterpart to the library-seed step that the migrations Lambda
// runs in deployed envs. Idempotent — already-seeded rows are skipped by
// slug / (metric, cohortKey, period) / signal id. Safe to re-run any time.
//
// Run: `npm run db:seed:libs --workspace=apps/web`
//
// Note: the seeder calls Titan v2 via Bedrock to embed each new playbook.
// If your local AWS creds can't reach Bedrock, the embed step logs a
// warning and continues — the row is upserted with a null embedding. Run
// `npx tsx src/db/backfill-embeddings.ts` later to backfill.
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "./client";
import { seedPlaybooksAndBenchmarks } from "./seed-playbooks";
import { seedSignalCatalog } from "./seed-signals";
import { seedFaqDefaults } from "./seed-faq";

async function main() {
  // Seeder helpers take an un-typed NodePgDatabase (same shape as the
  // migration Lambda's `drizzle(pool)`). The app's `getDb` returns the
  // schema-typed handle which the seeders don't accept, so build a plain
  // drizzle instance off the same pool here.
  const pool = await getPool();
  const db = drizzle(pool);
  try {
    const libs = await seedPlaybooksAndBenchmarks(db);
    console.log("seeded libraries", libs);
  } catch (e) {
    console.warn("library seed failed (non-fatal):", (e as Error).message);
  }
  try {
    const sigs = await seedSignalCatalog(db);
    console.log("seeded signal catalog", sigs);
  } catch (e) {
    console.warn("signal catalog seed failed (non-fatal):", (e as Error).message);
  }
  try {
    const faqs = await seedFaqDefaults(db);
    console.log("seeded FAQ defaults", faqs);
  } catch (e) {
    console.warn("FAQ seed failed (non-fatal):", (e as Error).message);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
