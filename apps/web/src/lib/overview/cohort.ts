import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { catalogCompanies } from "@/db/schema";
import { inferCohortFilterFromCompany, resolveCohort } from "@/lib/benchmarks";
import { getCachedCohortBenchmarks, getCachedCohorts } from "@/lib/cache/reference-data";
import { getCatalogCompany } from "@/lib/catalog";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import { currentPeriod } from "@/lib/portfolio-updates";
import {
  pickOverviewCohortKey,
  type OverviewCohortListEntry,
} from "./cohort-pick";
import type { BenchmarkRow } from "./score";

export type { OverviewCohortListEntry } from "./cohort-pick";
export { pickOverviewCohortKey } from "./cohort-pick";

export type OverviewCohortContext = {
  cohortKey: string | null;
  rows: Awaited<ReturnType<typeof getCachedCohortBenchmarks>>;
  benchmarkRows: BenchmarkRow[];
  allCohorts: OverviewCohortListEntry[];
};

function savedCohortFromCatalog(
  catalog: Awaited<ReturnType<typeof getCatalogCompany>>,
): string | null {
  if (!catalog?.sources) return null;
  const onboarding = (catalog.sources as Record<string, unknown>).onboarding as
    | CatalogOnboardingSnapshot
    | undefined;
  const key = onboarding?.cohortKey?.trim();
  return key || null;
}

function mapCohortEntries(
  cohorts: Awaited<ReturnType<typeof getCachedCohorts>>,
): OverviewCohortListEntry[] {
  return cohorts.map((c) => ({
    cohortKey: c.cohortKey,
    dimensions: c.dimensions,
    sampleSize: c.sampleSize,
  }));
}

/** Resolve cohort key + cached benchmark bands for a company. */
export async function loadOverviewCohortContext(
  companyUuid: string,
  opts?: { cohortKeyOverride?: string | null },
): Promise<OverviewCohortContext> {
  const [catalog, cohorts] = await Promise.all([
    getCatalogCompany(companyUuid),
    getCachedCohorts(),
  ]);
  const allCohorts = mapCohortEntries(cohorts);
  const validKeys = allCohorts.map((c) => c.cohortKey);

  const filter = catalog
    ? inferCohortFilterFromCompany({
        categories: catalog.industry ? [{ name: catalog.industry }] : [],
        locationCountry: catalog.locationCountry,
      })
    : { stage: "seed" as const };
  const inferred = await resolveCohort(filter);
  const cohortKey = pickOverviewCohortKey({
    override: opts?.cohortKeyOverride,
    saved: savedCohortFromCatalog(catalog),
    inferred,
    validKeys,
  });

  const rows = cohortKey
    ? await getCachedCohortBenchmarks(cohortKey, currentPeriod())
    : [];
  const benchmarkRows: BenchmarkRow[] = rows.map((b) => ({
    metric: b.metric,
    p25: b.p25,
    p50: b.p50,
    p75: b.p75,
    p90: b.p90,
    invertedGood: b.invertedGood,
  }));
  return { cohortKey, rows, benchmarkRows, allCohorts };
}

/** Persist founder-selected cohort into catalog_companies.sources.onboarding.cohortKey. */
export async function persistOverviewCohortKey(opts: {
  accountId: string;
  companyUuid: string;
  cohortKey: string;
}): Promise<void> {
  const key = opts.cohortKey.trim();
  if (!key) return;

  const db = await getDb();
  const [catalog] = await db
    .select()
    .from(catalogCompanies)
    .where(
      and(
        eq(catalogCompanies.id, opts.companyUuid),
        eq(catalogCompanies.accountId, opts.accountId),
      ),
    )
    .limit(1);
  if (!catalog) return;

  const sources = { ...((catalog.sources ?? {}) as Record<string, unknown>) };
  const onboarding = {
    ...((sources.onboarding ?? {}) as CatalogOnboardingSnapshot),
    cohortKey: key,
  };
  sources.onboarding = onboarding;

  await db
    .update(catalogCompanies)
    .set({ sources, updatedAt: new Date() })
    .where(
      and(
        eq(catalogCompanies.id, opts.companyUuid),
        eq(catalogCompanies.accountId, opts.accountId),
      ),
    );
}
