import type { CohortFilter } from "@/lib/benchmarks-shared";

export type OverviewCohortListEntry = {
  cohortKey: string;
  dimensions: CohortFilter;
  sampleSize: number | null;
};

/** Pure pick order: override → saved → inferred (override/saved must exist in configured cohorts). */
export function pickOverviewCohortKey(opts: {
  override?: string | null;
  saved?: string | null;
  inferred: string | null;
  validKeys: Iterable<string>;
}): string | null {
  const valid = opts.validKeys instanceof Set ? opts.validKeys : new Set(opts.validKeys);
  const override = opts.override?.trim();
  if (override && valid.has(override)) return override;
  const saved = opts.saved?.trim();
  if (saved && valid.has(saved)) return saved;
  return opts.inferred;
}
