/** Format benchmark_cohort values for display (shared by founder workspace + onboarding). */

import {
  cohortDimensionsLabel,
  cohortKeyToFilter,
  type CohortFilter,
} from "@/lib/benchmarks-shared";

export function formatBenchmarkUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function formatBenchmarkValue(v: number | null, unit: string | null): string {
  if (v == null) return "—";
  if (unit === "pct") return `${v.toFixed(0)}%`;
  if (unit === "usd") return formatBenchmarkUsd(v);
  if (unit === "x") return `${v.toFixed(1)}×`;
  if (unit === "months") return `${v.toFixed(0)}mo`;
  if (unit === "count") return Math.round(v).toString();
  return v.toString();
}

export function prettyCohortKey(cohortKey: string): string {
  return cohortDimensionsLabel(cohortKeyToFilter(cohortKey)) || cohortKey;
}

/** Label for a cohort list entry (dimensions + optional sample size). */
export function formatCohortOptionLabel(
  dimensions: CohortFilter,
  cohortKey: string,
  sampleSize?: number | null,
): string {
  const base = cohortDimensionsLabel(dimensions) || cohortKey;
  return sampleSize ? `${base} · n=${sampleSize}` : base;
}

export function cohortFilterLabel(filter: {
  businessModel?: string | null;
  stage?: string | null;
  vertical?: string | null;
  geo?: string | null;
}): string {
  const parts = [
    filter.vertical?.replaceAll("_", " ") ?? filter.businessModel?.replaceAll("_", " ") ?? "B2B SaaS",
    filter.stage?.replaceAll("_", " ") ?? "seed",
    filter.geo?.toUpperCase() ?? "US",
  ];
  return parts.join(" · ");
}
