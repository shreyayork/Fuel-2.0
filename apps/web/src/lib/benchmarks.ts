import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { benchmarkCohorts, type BenchmarkCohort } from "@/db/schema";

export {
  METRICS,
  cohortKeyFor,
  getMetricInfo,
  inferCohortFilterFromCompany,
  type CohortFilter,
  type MetricInfo,
} from "@/lib/benchmarks-shared";

import type { CohortFilter } from "@/lib/benchmarks-shared";

export async function listCohorts(): Promise<
  Array<{
    cohortKey: string;
    dimensions: CohortFilter;
    metrics: string[];
    sampleSize: number | null;
  }>
> {
  const db = await getDb();
  const rows = await db.select().from(benchmarkCohorts).orderBy(asc(benchmarkCohorts.cohortKey));
  const byKey = new Map<
    string,
    {
      cohortKey: string;
      dimensions: CohortFilter;
      metrics: Set<string>;
      sampleSize: number | null;
    }
  >();
  for (const r of rows) {
    const existing = byKey.get(r.cohortKey);
    if (existing) {
      existing.metrics.add(r.metric);
      if ((r.sampleSize ?? 0) > (existing.sampleSize ?? 0)) {
        existing.sampleSize = r.sampleSize;
      }
    } else {
      byKey.set(r.cohortKey, {
        cohortKey: r.cohortKey,
        dimensions: (r.dimensions ?? {}) as CohortFilter,
        metrics: new Set([r.metric]),
        sampleSize: r.sampleSize ?? null,
      });
    }
  }
  return Array.from(byKey.values()).map((v) => ({
    cohortKey: v.cohortKey,
    dimensions: v.dimensions,
    metrics: Array.from(v.metrics),
    sampleSize: v.sampleSize,
  }));
}

export async function getCohortBenchmarks(opts: {
  cohortKey: string;
  period?: string;
}): Promise<BenchmarkCohort[]> {
  const db = await getDb();
  const period = opts.period ?? "2026-q1";
  const exact = await db
    .select()
    .from(benchmarkCohorts)
    .where(
      and(
        eq(benchmarkCohorts.cohortKey, opts.cohortKey),
        eq(benchmarkCohorts.period, period),
      ),
    );
  if (exact.length > 0) return exact;
  // Fall back to the most recent period we have for this cohort — benchmarks
  // are seeded per-quarter and a deploy ahead of the seed will otherwise show
  // an empty overlay.
  const latestPeriodRow = await db
    .select({ period: benchmarkCohorts.period })
    .from(benchmarkCohorts)
    .where(eq(benchmarkCohorts.cohortKey, opts.cohortKey))
    .orderBy(sql`${benchmarkCohorts.period} DESC`)
    .limit(1);
  const latestPeriod = latestPeriodRow[0]?.period;
  if (!latestPeriod) return [];
  return db
    .select()
    .from(benchmarkCohorts)
    .where(
      and(
        eq(benchmarkCohorts.cohortKey, opts.cohortKey),
        eq(benchmarkCohorts.period, latestPeriod),
      ),
    );
}

/** Pick the best-fit cohort given a set of filters, with graceful fallback. */
export async function resolveCohort(filter: CohortFilter): Promise<string | null> {
  const db = await getDb();
  // Try most-specific first: vertical+stage+geo → businessModel+stage+geo → stage only → any.
  const candidates: string[] = [];
  if (filter.vertical && filter.stage) {
    candidates.push(`${filter.vertical}:${filter.stage}:${filter.geo ?? "us"}`);
  }
  if (filter.businessModel && filter.stage) {
    candidates.push(`${filter.businessModel}:${filter.stage}:${filter.geo ?? "us"}`);
  }
  if (filter.stage) {
    candidates.push(`b2b_saas:${filter.stage}:us`);
  }
  for (const c of candidates) {
    const [row] = await db
      .select()
      .from(benchmarkCohorts)
      .where(eq(benchmarkCohorts.cohortKey, c))
      .limit(1);
    if (row) return c;
  }
  return null;
}

/**
 * Figure out which percentile a value falls in for a cohort metric.
 * Returns 25/50/75/90/95 (approx) based on where the value lands among
 * the four reference percentiles we store. `invertedGood=true` flips the
 * interpretation so a low value scores high.
 */
export function percentileFor(
  value: number,
  bench: BenchmarkCohort,
): { label: string; percentile: number } {
  const { p25, p50, p75, p90, invertedGood } = bench;
  if (p25 == null || p50 == null || p75 == null || p90 == null) {
    return { label: "—", percentile: 50 };
  }
  // For inverted metrics (lower=better), reverse the comparison.
  const cmp = invertedGood
    ? (a: number, b: number) => a <= b
    : (a: number, b: number) => a >= b;

  let pct: number;
  if (cmp(value, p90)) pct = 95;
  else if (cmp(value, p75)) pct = 85;
  else if (cmp(value, p50)) pct = 62;
  else if (cmp(value, p25)) pct = 37;
  else pct = 15;
  return { label: `p${pct}`, percentile: pct };
}

// ---------------------------------------------------------------------------
// Admin CRUD — used by /super-admin/cohorts to seed / edit / retire rows.
// Same account guard as the signals admin: every call site hits
// isSuperAdmin() before reaching here.
// ---------------------------------------------------------------------------

export async function listAllCohortRows(): Promise<BenchmarkCohort[]> {
  const db = await getDb();
  return db
    .select()
    .from(benchmarkCohorts)
    .orderBy(
      asc(benchmarkCohorts.cohortKey),
      asc(benchmarkCohorts.metric),
      desc(benchmarkCohorts.period),
    );
}

export interface CohortUpsert {
  id?: string;
  metric: string;
  cohortKey: string;
  dimensions: {
    businessModel?: string | null;
    stage?: string | null;
    vertical?: string | null;
    geo?: string | null;
  };
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sampleSize: number | null;
  period: string;
  source: string;
  invertedGood?: boolean;
  unit: string | null;
}

/**
 * Idempotent upsert of a benchmark row. The natural key is
 * `${cohortKey}:${metric}:${period}` — that's also how the seed file
 * constructs ids, so replaying the seed after an admin edit lines up.
 */
export async function upsertCohortRow(input: CohortUpsert): Promise<BenchmarkCohort> {
  const db = await getDb();
  const id = input.id ?? `${input.cohortKey}:${input.metric}:${input.period}`;
  const values = {
    id,
    metric: input.metric,
    cohortKey: input.cohortKey,
    dimensions: input.dimensions,
    p25: input.p25,
    p50: input.p50,
    p75: input.p75,
    p90: input.p90,
    sampleSize: input.sampleSize,
    period: input.period,
    source: input.source,
    invertedGood: input.invertedGood ?? false,
    unit: input.unit,
  };
  const [existing] = await db
    .select({ id: benchmarkCohorts.id })
    .from(benchmarkCohorts)
    .where(eq(benchmarkCohorts.id, id))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(benchmarkCohorts)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(benchmarkCohorts.id, id))
      .returning();
    return row;
  }
  const [row] = await db.insert(benchmarkCohorts).values(values).returning();
  return row;
}

export async function deleteCohortRow(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(benchmarkCohorts).where(eq(benchmarkCohorts.id, id));
}
