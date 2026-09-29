/**
 * Pure decisions for investor auto-build. Kept out of the server module
 * so race / empty-shell behavior can be tested without Neptune or Postgres.
 */

export type KeyedAutoList = {
  id: string;
  companyCount: number;
};

export type AutoBuildReason = "already_built" | "no_firm" | "ok";

/** Populated keyed lists skip the fetch. `force` does not wipe them. */
export function skipPopulatedAutoLists(opts: {
  force: boolean;
  keyedLists: KeyedAutoList[];
}): { skip: true; portfolioIds: string[]; holdingCount: number } | { skip: false } {
  const holdingCount = opts.keyedLists.reduce((n, w) => n + w.companyCount, 0);
  if (opts.keyedLists.length > 0 && !opts.force && holdingCount > 0) {
    return {
      skip: true,
      portfolioIds: opts.keyedLists.map((w) => w.id),
      holdingCount,
    };
  }
  return { skip: false };
}

/**
 * Empty keyed shells are deleted only when holdings exist to refill them.
 * Lists with companies are never deleted, including when `force` is set.
 * Zero holdings + only empty shells → keep them (no delete/rebuild loop).
 */
export function emptyShellPlan(opts: {
  keyedLists: KeyedAutoList[];
  mergedCount: number;
}):
  | { action: "keep"; portfolioIds: string[] }
  | { action: "fill"; deleteIds: string[] } {
  const emptyIds = opts.keyedLists
    .filter((w) => w.companyCount === 0)
    .map((w) => w.id);
  const populated = opts.keyedLists.some((w) => w.companyCount > 0);
  if (emptyIds.length > 0 && opts.mergedCount === 0 && !populated) {
    return { action: "keep", portfolioIds: emptyIds };
  }
  return {
    action: "fill",
    deleteIds: opts.mergedCount > 0 ? emptyIds : [],
  };
}

/**
 * Race loser reuses the winner's list and must still seed it.
 * `addCompanyToWatchlist` is idempotent, so a second writer is safe.
 */
export function companiesToAdd<T>(holdings: readonly T[], reused: boolean): readonly T[] {
  void reused;
  return holdings;
}

export type AutoBuildStageCounts = {
  invested_in_edges: number | null;
  backed_count: number;
  merged_count: number;
  persisted_count: number;
  reason: AutoBuildReason;
};

/** Warn when a build finished with nothing stored, or empty shells were kept. */
export function shouldWarnAutoBuild(counts: AutoBuildStageCounts): boolean {
  if (counts.reason === "no_firm") return false;
  if (counts.reason === "already_built" && counts.persisted_count > 0) return false;
  return counts.persisted_count === 0;
}
