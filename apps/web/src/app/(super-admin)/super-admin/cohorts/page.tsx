import { CohortAdminView } from "@/components/views/CohortAdminView";
import { listAllCohortRows, METRICS } from "@/lib/benchmarks";

export const dynamic = "force-dynamic";

export default async function SuperAdminCohortsPage() {
  const rows = await listAllCohortRows();
  return (
    <CohortAdminView
      rows={rows.map((r) => ({
        id: r.id,
        metric: r.metric,
        cohortKey: r.cohortKey,
        dimensions: r.dimensions ?? {},
        p25: r.p25,
        p50: r.p50,
        p75: r.p75,
        p90: r.p90,
        sampleSize: r.sampleSize,
        period: r.period,
        source: r.source,
        invertedGood: r.invertedGood,
        unit: r.unit,
        updatedAt: r.updatedAt.toISOString(),
      }))}
      metricCatalog={METRICS.map((m) => ({
        id: m.id,
        label: m.label,
        unit: m.unit,
        invertedGood: !!m.invertedGood,
        group: m.group,
      }))}
    />
  );
}
