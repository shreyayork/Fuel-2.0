import { BenchmarksExplorer } from "@/components/views/BenchmarksExplorer";
import { getCachedAllBenchmarkRows, getCachedCohorts } from "@/lib/cache/reference-data";
import { METRICS } from "@/lib/benchmarks";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const sp = await searchParams;
  const [cohorts, allRows] = await Promise.all([getCachedCohorts(), getCachedAllBenchmarkRows()]);
  const activeCohortKey = sp.cohort ?? cohorts[0]?.cohortKey ?? null;

  return (
    <BenchmarksExplorer
      cohorts={cohorts.map((c) => ({
        cohortKey: c.cohortKey,
        dimensions: c.dimensions,
        metricCount: c.metrics.length,
        sampleSize: c.sampleSize,
      }))}
      activeCohortKey={activeCohortKey}
      allRows={allRows.map((r) => ({
        cohortKey: r.cohortKey,
        metric: r.metric,
        period: r.period,
        p25: r.p25,
        p50: r.p50,
        p75: r.p75,
        p90: r.p90,
        sampleSize: r.sampleSize,
        unit: r.unit,
        invertedGood: r.invertedGood,
      }))}
      metricDefs={METRICS}
    />
  );
}
