/**
 * Shared builders for Overview edit-drawer prefills (detail answers + benchmark).
 * Used by dedicated drawer routes and by the Overview GET so the page can open
 * forms without a second round-trip.
 */
import "server-only";
import {
  BENCHMARK_DRAWER_FIELDS,
  emptyBenchmarkDrawerValues,
  formatBenchmarkInputValue,
  type BenchmarkDrawerValues,
} from "@/lib/overview/benchmark-drawer-fields";
import type { OverviewCohortListEntry } from "@/lib/overview/cohort-pick";
import {
  currentPeriod,
  getForPeriod,
  getLatestSubmittedForCompany,
} from "@/lib/portfolio-updates";
import type { PortfolioUpdate } from "@/db/schema";
import type { BenchmarkRow } from "./score";

export type BenchmarkDrawerFieldPayload = {
  key: (typeof BENCHMARK_DRAWER_FIELDS)[number]["key"];
  label: string;
  placeholder: string;
  unit: string;
  lowerIsBetter: boolean;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type BenchmarkDrawerPayload = {
  period: string;
  cohortKey: string | null;
  values: BenchmarkDrawerValues;
  fields: BenchmarkDrawerFieldPayload[];
  allCohorts: OverviewCohortListEntry[];
};

export function trimDetailAnswers(
  answers: Record<string, string | null | undefined>,
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (value?.trim()) merged[id] = value.trim();
  }
  return merged;
}

export function valuesFromPortfolioUpdate(
  update: PortfolioUpdate | null | undefined,
): BenchmarkDrawerValues {
  const out = emptyBenchmarkDrawerValues();
  if (!update) return out;
  for (const field of BENCHMARK_DRAWER_FIELDS) {
    const raw = update[field.column];
    out[field.key] = formatBenchmarkInputValue(
      typeof raw === "number" ? raw : null,
      field.unit,
    );
  }
  return out;
}

/** Prefer current-period submitted row; else latest submitted; else current draft. */
export function pickBenchmarkSource(opts: {
  latestSubmitted: PortfolioUpdate | null | undefined;
  currentPeriodRow: PortfolioUpdate | null | undefined;
}): PortfolioUpdate | null {
  const { latestSubmitted, currentPeriodRow } = opts;
  if (currentPeriodRow?.status === "submitted") return currentPeriodRow;
  return latestSubmitted ?? currentPeriodRow ?? null;
}

export function buildBenchmarkDrawerFields(
  benchmarkRows: BenchmarkRow[],
): BenchmarkDrawerFieldPayload[] {
  const byMetric = new Map(benchmarkRows.map((r) => [r.metric, r]));
  return BENCHMARK_DRAWER_FIELDS.map((field) => {
    const cohort = byMetric.get(field.metric);
    return {
      key: field.key,
      label: field.label,
      placeholder: field.placeholder,
      unit: field.unit,
      lowerIsBetter: field.lowerIsBetter === true || cohort?.invertedGood === true,
      p25: cohort?.p25 ?? field.fallback.p25,
      p50: cohort?.p50 ?? field.fallback.p50,
      p75: cohort?.p75 ?? field.fallback.p75,
      p90: cohort?.p90 ?? field.fallback.p90,
    };
  });
}

export async function loadBenchmarkDrawerPayload(opts: {
  accountId: string;
  companyUuid: string;
  cohortKey: string | null;
  benchmarkRows: BenchmarkRow[];
  allCohorts?: OverviewCohortListEntry[];
}): Promise<BenchmarkDrawerPayload> {
  const period = currentPeriod();
  const [latestSubmitted, currentPeriodRow] = await Promise.all([
    getLatestSubmittedForCompany({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
    }),
    getForPeriod({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      period,
    }),
  ]);

  const source = pickBenchmarkSource({ latestSubmitted, currentPeriodRow });

  return {
    period,
    cohortKey: opts.cohortKey,
    values: valuesFromPortfolioUpdate(source),
    fields: buildBenchmarkDrawerFields(opts.benchmarkRows),
    allCohorts: opts.allCohorts ?? [],
  };
}
