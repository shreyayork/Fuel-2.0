import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, getPool } from "../client";
import { artifacts, portfolioUpdates } from "../schema";

/**
 * One-shot cleanup: re-tags AI-generated "benchmark" artifacts that the
 * old dashboard banner was mis-attributing as "user-completed benchmarks".
 *
 * Background: before guided-mode landed, any agent run with a title like
 * "KPI Benchmark — Acme" produced a `kind='playbook_run'` artifact. The
 * `BenchmarkStatusBanner` regex-matched that title and flipped to "FRESH"
 * — even though no `portfolio_updates(status='submitted')` row existed
 * for the company. Real user-verified benchmarks now exclusively come
 * through the guided wizard, so these phantom artifacts are noise.
 *
 * This script finds every `playbook_run` artifact that LOOKS like a
 * benchmark / assessment (title regex) but has NO sibling submitted
 * portfolio_update for the same (account, company). Re-tags them as
 * `kind='ai_draft'` so dashboards stop counting them.
 *
 * Idempotent: re-running skips already-retagged rows. Safe to run as
 * many times as needed.
 *
 * Usage:
 *   npx tsx src/db/scripts/retag-phantom-benchmarks.ts [--dry-run]
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = await getDb();

  // Pull candidate artifacts: kind='playbook_run' with benchmark/assessment-
  // ish titles. Note artifacts.subjects is jsonb-ARRAY of {type, uuid}.
  const candidates = await db
    .select()
    .from(artifacts)
    .where(
      and(
        eq(artifacts.kind, "playbook_run"),
        sql`${artifacts.title} ~* 'benchmark|assessment'`,
      ),
    );

  console.log(`[retag-phantom-benchmarks] ${candidates.length} candidate artifacts`);

  // For each candidate, check whether any company subject has a sibling
  // submitted portfolio_update in the same account. If yes, leave it
  // alone (real benchmark on file). If no, retag.
  let retagged = 0;
  let kept = 0;
  for (const a of candidates) {
    const subjects = (a.subjects ?? []) as Array<{ type: string; uuid?: string }>;
    const companyUuids = subjects
      .filter((s) => s.type === "company" && typeof s.uuid === "string")
      .map((s) => s.uuid as string);

    if (companyUuids.length === 0) {
      // No company subject — can't be a benchmark artifact at all. Retag.
      if (!dryRun) {
        await db
          .update(artifacts)
          .set({ kind: "ai_draft" })
          .where(eq(artifacts.id, a.id));
      }
      retagged += 1;
      continue;
    }

    const verified = await db
      .select({ id: portfolioUpdates.id })
      .from(portfolioUpdates)
      .where(
        and(
          eq(portfolioUpdates.accountId, a.accountId),
          inArray(portfolioUpdates.companyUuid, companyUuids),
          eq(portfolioUpdates.status, "submitted"),
        ),
      )
      .limit(1);

    if (verified.length > 0) {
      kept += 1;
      continue;
    }

    if (!dryRun) {
      await db
        .update(artifacts)
        .set({ kind: "ai_draft" })
        .where(eq(artifacts.id, a.id));
    }
    retagged += 1;
  }

  console.log(
    `[retag-phantom-benchmarks] ${retagged} retagged → ai_draft${dryRun ? " (dry-run)" : ""}; ${kept} kept (have submitted portfolio_update)`,
  );

  const pool = await getPool();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
