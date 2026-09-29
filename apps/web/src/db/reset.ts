import "dotenv/config";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { execSync } from "node:child_process";
import { getDb, getPool } from "./client";

async function main() {
  const db = await getDb();
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  // Drizzle stores migration history in its own schema; clearing it forces a
  // full replay so all public tables are recreated from scratch.
  await db.execute(sql`DELETE FROM drizzle.__drizzle_migrations WHERE true`);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  const pool = await getPool();
  await pool.end();
  execSync("npm run db:seed", { stdio: "inherit" });
  console.log("database reset");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
