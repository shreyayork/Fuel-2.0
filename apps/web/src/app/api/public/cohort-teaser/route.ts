import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { benchmarkCohorts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public teaser endpoint for the marketing landing's "enter your vertical +
 * stage" widget. Returns ONE p50 datapoint for a known metric — no LLM
 * inference, no PII, no row enumeration risk. CDN-cacheable.
 *
 * Inputs are enum-bound to keep the surface tight: arbitrary stage/vertical
 * strings get a 400.
 */
// Long-form metric ids (migration 0042 retired the short forms in favor of
// catalog-canonical names — keep the enum here in lockstep with the seeder).
const Query = z.object({
  metric: z
    .enum(["arr_growth_yoy_pct", "nrr_pct", "gross_margin_pct"])
    .default("arr_growth_yoy_pct"),
  stage: z.enum(["seed", "series_a", "growth"]),
  vertical: z.enum(["b2b_saas", "dev_tools"]),
});

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    metric: url.searchParams.get("metric") ?? undefined,
    stage: url.searchParams.get("stage") ?? undefined,
    vertical: url.searchParams.get("vertical") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", detail: parsed.error.message },
      { status: 400 },
    );
  }
  const { metric, stage, vertical } = parsed.data;
  const requestedCohortKey = `${vertical}:${stage}:us`;
  // Fallback chain: exact (vertical+stage), then stage only against b2b_saas
  // (most common cohort, has data for every stage we expose). The widget
  // surfaces whichever cohort actually matched.
  const fallbackCohortKey = `b2b_saas:${stage}:us`;
  const candidates =
    requestedCohortKey === fallbackCohortKey
      ? [requestedCohortKey]
      : [requestedCohortKey, fallbackCohortKey];

  const db = await getDb();
  const [row] = await db
    .select({
      metric: benchmarkCohorts.metric,
      cohortKey: benchmarkCohorts.cohortKey,
      p25: benchmarkCohorts.p25,
      p50: benchmarkCohorts.p50,
      p75: benchmarkCohorts.p75,
      p90: benchmarkCohorts.p90,
      sampleSize: benchmarkCohorts.sampleSize,
      period: benchmarkCohorts.period,
      unit: benchmarkCohorts.unit,
    })
    .from(benchmarkCohorts)
    .where(
      and(
        eq(benchmarkCohorts.metric, metric),
        inArray(benchmarkCohorts.cohortKey, candidates),
      ),
    )
    // Prefer the exact-match cohort over the fallback by sorting on the
    // requested key first, then most recent period.
    .orderBy(
      sql`(case when ${benchmarkCohorts.cohortKey} = ${requestedCohortKey} then 0 else 1 end)`,
      desc(benchmarkCohorts.period),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "no_cohort", cohortKey: requestedCohortKey, metric },
      { status: 404 },
    );
  }
  const matchedFallback = row.cohortKey !== requestedCohortKey;

  return NextResponse.json(
    {
      metric: row.metric,
      requestedCohortKey,
      cohortKey: row.cohortKey,
      matchedFallback,
      p25: row.p25,
      p50: row.p50,
      p75: row.p75,
      p90: row.p90,
      sampleSize: row.sampleSize,
      period: row.period,
      unit: row.unit,
    },
    {
      headers: {
        // 5-minute edge cache; the underlying cohort updates quarterly, so
        // this is generous from a freshness perspective and absorbs any
        // landing-page traffic burst.
        "cache-control": "public, s-maxage=300, max-age=300",
      },
    },
  );
}
