"use client";

import type { CohortFilter } from "@/lib/benchmarks-shared";
import { latestFundingTypeFromRounds } from "@/lib/onboard/funding-rounds";
import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";

export type OnboardCohortListEntry = {
  cohortKey: string;
  dimensions: CohortFilter;
  sampleSize: number | null;
};

export type OnboardCohortResolution = {
  cohortKey: string | null;
  inferred: CohortFilter;
  benchmarkRows: OnboardBenchmarkRow[];
  sampleSize: number | null;
  allCohorts: OnboardCohortListEntry[];
};

export type FetchOnboardCohortInput = {
  industry?: string | null;
  locationCountry?: string | null;
  lastFundingType?: string | null;
  fundingRounds?: Array<{ type: string; date: string }>;
  cohortKeyOverride?: string | null;
};

export async function fetchOnboardCohort(
  input: FetchOnboardCohortInput,
): Promise<OnboardCohortResolution | null> {
  try {
    const res = await fetch("/api/onboard/cohort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry: input.industry ?? null,
        locationCountry: input.locationCountry ?? null,
        lastFundingType:
          input.lastFundingType ??
          latestFundingTypeFromRounds(input.fundingRounds ?? []) ??
          null,
        fundingRoundTypes: input.fundingRounds?.map((r) => r.type) ?? [],
        cohortKeyOverride: input.cohortKeyOverride ?? null,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as OnboardCohortResolution;
  } catch {
    return null;
  }
}
