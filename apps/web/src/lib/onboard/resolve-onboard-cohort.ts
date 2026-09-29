import "server-only";

import type { BenchmarkCohort } from "@/db/schema";
import {
  getCohortBenchmarks,
  inferCohortFilterFromCompany,
  listCohorts,
  resolveCohort,
  type CohortFilter,
} from "@/lib/benchmarks";
import { stripContinentFromCountry } from "@/lib/benchmarks-shared";
import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";

export type OnboardCohortListEntry = {
  cohortKey: string;
  dimensions: CohortFilter;
  sampleSize: number | null;
};

export type ResolveOnboardCohortInput = {
  industry?: string | null;
  locationCountry?: string | null;
  lastFundingType?: string | null;
  fundingRoundTypes?: string[];
  cohortKeyOverride?: string | null;
};

export type ResolveOnboardCohortResult = {
  cohortKey: string | null;
  inferred: CohortFilter;
  benchmarkRows: OnboardBenchmarkRow[];
  sampleSize: number | null;
  allCohorts: OnboardCohortListEntry[];
};

function mapBenchmarkRows(rows: BenchmarkCohort[]): OnboardBenchmarkRow[] {
  return rows.map((r) => ({
    metric: r.metric,
    p25: r.p25,
    p50: r.p50,
    p75: r.p75,
    p90: r.p90,
    unit: r.unit,
    invertedGood: r.invertedGood,
    sampleSize: r.sampleSize,
  }));
}

function deriveLastFundingType(input: ResolveOnboardCohortInput): string | null {
  if (input.lastFundingType?.trim()) return input.lastFundingType.trim();
  const types = input.fundingRoundTypes?.filter((t) => t.trim()) ?? [];
  if (!types.length) return null;
  return types[types.length - 1] ?? null;
}

export async function resolveOnboardCohort(
  input: ResolveOnboardCohortInput,
): Promise<ResolveOnboardCohortResult> {
  const allCohorts = await listCohorts();
  const allCohortEntries: OnboardCohortListEntry[] = allCohorts.map((c) => ({
    cohortKey: c.cohortKey,
    dimensions: c.dimensions,
    sampleSize: c.sampleSize,
  }));

  const country = stripContinentFromCountry((input.locationCountry ?? "").trim());
  const lastFundingType = deriveLastFundingType(input);

  const inferred = inferCohortFilterFromCompany({
    categories: input.industry?.trim() ? [input.industry.trim()] : [],
    lastFundingType,
    locationCountry: country || null,
  });

  let cohortKey: string | null = null;
  const override = input.cohortKeyOverride?.trim();
  if (override && allCohortEntries.some((c) => c.cohortKey === override)) {
    cohortKey = override;
  } else {
    cohortKey = await resolveCohort(inferred);
  }

  const dbRows = cohortKey ? await getCohortBenchmarks({ cohortKey }) : [];
  const benchmarkRows = mapBenchmarkRows(dbRows);
  const sampleSize =
    benchmarkRows.find((r) => r.sampleSize != null)?.sampleSize ??
    allCohortEntries.find((c) => c.cohortKey === cohortKey)?.sampleSize ??
    null;

  return {
    cohortKey,
    inferred,
    benchmarkRows,
    sampleSize,
    allCohorts: allCohortEntries,
  };
}
