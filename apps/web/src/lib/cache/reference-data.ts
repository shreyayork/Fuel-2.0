import "server-only";
import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { benchmarkCohorts } from "@/db/schema";
import { getCohortBenchmarks, listCohorts } from "@/lib/benchmarks";
import { listGlobalSignals } from "@/lib/signals";

export const REFERENCE_CACHE_SECONDS = 300;

export const CACHE_TAG_GLOBAL_SIGNALS = "global-signals";
export const CACHE_TAG_BENCHMARK_COHORTS = "benchmark-cohorts";

/** Global signal catalog — admin-seeded, account-agnostic. */
export const getCachedGlobalSignals = unstable_cache(
  async () => listGlobalSignals(),
  ["global-signals"],
  { revalidate: REFERENCE_CACHE_SECONDS, tags: [CACHE_TAG_GLOBAL_SIGNALS] },
);

/** Cohort index derived from benchmark_cohorts rows. */
export const getCachedCohorts = unstable_cache(
  async () => listCohorts(),
  ["benchmark-cohorts-index"],
  { revalidate: REFERENCE_CACHE_SECONDS, tags: [CACHE_TAG_BENCHMARK_COHORTS] },
);

/** Full benchmark_cohorts table — powers BenchmarksExplorer drill-down. */
export const getCachedAllBenchmarkRows = unstable_cache(
  async () => {
    const db = await getDb();
    return db.select().from(benchmarkCohorts).orderBy(asc(benchmarkCohorts.cohortKey));
  },
  ["benchmark-cohorts-all-rows"],
  { revalidate: REFERENCE_CACHE_SECONDS, tags: [CACHE_TAG_BENCHMARK_COHORTS] },
);

/** Percentile rows for one cohort + period. */
export function getCachedCohortBenchmarks(cohortKey: string, period: string) {
  return unstable_cache(
    async () => getCohortBenchmarks({ cohortKey, period }),
    ["cohort-benchmarks", cohortKey, period],
    {
      revalidate: REFERENCE_CACHE_SECONDS,
      tags: [CACHE_TAG_BENCHMARK_COHORTS, `cohort:${cohortKey}`],
    },
  )();
}
