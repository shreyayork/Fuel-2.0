/**
 * Remove demo pipeline seed data (`demo_pipeline_*` ids).
 *
 * Run:
 *   npm run db:unseed:pipeline-demo --workspace=apps/web
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb, getPool } from "./client";
import { DEMO_CONNECTION_ID } from "./pipeline-demo-fixture";
import { integrationConnections } from "./schema";

async function main() {
  const db = await getDb();
  const deleted = await db
    .delete(integrationConnections)
    .where(eq(integrationConnections.id, DEMO_CONNECTION_ID))
    .returning({ id: integrationConnections.id });

  const pool = await getPool();
  await pool.end();

  if (deleted.length === 0) {
    console.log("No demo pipeline data found (already removed).");
    return;
  }

  console.log(
    `Removed demo pipeline connection ${DEMO_CONNECTION_ID} (config + deals cascade-deleted).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
