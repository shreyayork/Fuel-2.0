import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, getPool } from "./client";
import { seedPlaybooksAndBenchmarks } from "./seed-playbooks";
import { seedSignalCatalog } from "./seed-signals";
import { seedFaqDefaults } from "./seed-faq";

async function main() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  // Match the migrations Lambda: idempotently seed platform libraries so
  // local dev has signal FK targets before anyone submits portfolio updates.
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

  const pool = await getPool();
  await pool.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
