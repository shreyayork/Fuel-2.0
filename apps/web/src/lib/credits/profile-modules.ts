/**
 * Founder Free-tier earnable pool: start at 0, earn once per module.
 * Each of 5 blocks (4 profile modules + benchmark) awards floor(planMonthlyLimit / 5).
 * Extra Overview questions never award credits.
 *
 * Existing founder Free ledgers were grandfathered as fully earned in migration 0073.
 * Investor Free is a full catalog grant and does not use this earn ladder.
 */

export type ProfileModuleId = "company" | "dev" | "gtm" | "rev";

export const PROFILE_MODULE_IDS: readonly ProfileModuleId[] = [
  "company",
  "dev",
  "gtm",
  "rev",
] as const;

/** 4 profile modules + benchmark. */
export const PROFILE_EARN_BLOCK_COUNT = 5;

/** Seeded Free plan monthly limit; empty-snapshot / pre-load fallback only. */
export const DEFAULT_FREE_MONTHLY_LIMIT = 250;

export type ProfileEarnState = {
  modules: ProfileModuleId[];
  benchmark: boolean;
  setupIncomplete: boolean;
  profilePromptDismissed: boolean;
};

export function creditsPerBlock(planMonthlyLimit: number): number {
  return Math.floor(Math.max(0, planMonthlyLimit) / PROFILE_EARN_BLOCK_COUNT);
}

export function earnableBlockCredits(planMonthlyLimit: number): number {
  return creditsPerBlock(planMonthlyLimit) * PROFILE_EARN_BLOCK_COUNT;
}

export const EMPTY_SNAPSHOT_EARN = {
  profileModules: [] as ProfileModuleId[],
  benchmarkEarned: false,
  setupIncomplete: false,
  profilePromptDismissed: false,
  remainingEarnable: earnableBlockCredits(DEFAULT_FREE_MONTHLY_LIMIT),
  qualifiedForRefill: false,
  planMonthlyLimit: DEFAULT_FREE_MONTHLY_LIMIT,
  creditsPerBlock: creditsPerBlock(DEFAULT_FREE_MONTHLY_LIMIT),
};

export function isProfileModuleId(value: string): value is ProfileModuleId {
  return (PROFILE_MODULE_IDS as readonly string[]).includes(value);
}

export function parseEarnedModules(raw: unknown): ProfileModuleId[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is ProfileModuleId => typeof id === "string" && isProfileModuleId(id)))];
}

export function computeEarnedCredits(
  state: Pick<ProfileEarnState, "modules" | "benchmark">,
  planMonthlyLimit: number,
): number {
  const per = creditsPerBlock(planMonthlyLimit);
  const earnedBlocks = state.modules.length + (state.benchmark ? 1 : 0);
  return Math.min(earnableBlockCredits(planMonthlyLimit), earnedBlocks * per);
}

export function remainingEarnableCredits(
  state: Pick<ProfileEarnState, "modules" | "benchmark">,
  planMonthlyLimit: number,
): number {
  return Math.max(0, earnableBlockCredits(planMonthlyLimit) - computeEarnedCredits(state, planMonthlyLimit));
}

export function isQualifiedForRefill(state: Pick<ProfileEarnState, "modules" | "benchmark">): boolean {
  return PROFILE_MODULE_IDS.every((id) => state.modules.includes(id)) && state.benchmark;
}

/**
 * Founder Free is the earned pool, capped by the plan monthly limit.
 * Investor Free is the catalog monthly pool itself — modules do not add credits.
 */
export function spendableFreeMonthlyLimit(opts: {
  flow: "founder" | "investor";
  planMonthlyLimit: number;
  state: Pick<ProfileEarnState, "modules" | "benchmark">;
}): number {
  if (opts.flow === "investor") return Math.max(0, opts.planMonthlyLimit);
  return freeSpendableMonthlyLimit(opts.planMonthlyLimit, opts.state);
}

/** Free spendable monthly cap: earned pool until qualified, then the plan monthly limit. */
export function freeSpendableMonthlyLimit(
  planMonthlyLimit: number,
  state: Pick<ProfileEarnState, "modules" | "benchmark">,
): number {
  if (isQualifiedForRefill(state)) return planMonthlyLimit;
  return computeEarnedCredits(state, planMonthlyLimit);
}

export function shouldResetFreeMonthlyUsage(opts: {
  planSlug: string;
  monthAnchorStale: boolean;
  qualified: boolean;
}): boolean {
  if (opts.planSlug !== "free") return false;
  if (!opts.monthAnchorStale) return false;
  return opts.qualified;
}

export type ProfileCreditReward = {
  kind: "module" | "benchmark";
  amount: number;
  balance: number;
  headline: string;
  message: string;
  module?: ProfileModuleId;
};

export function moduleCreditsHeadline(module: ProfileModuleId): string {
  switch (module) {
    case "company":
      return "Profile credits unlocked";
    case "dev":
      return "R&D credits unlocked";
    case "gtm":
      return "GTM credits unlocked";
    case "rev":
      return "G&A credits unlocked";
  }
}

export function moduleCreditsMessage(module: ProfileModuleId): string {
  switch (module) {
    case "company":
      return "Give more company answers below for a sharper Overview. Those don't add credits.";
    case "dev":
      return "Give more R&D answers below for a sharper product score. Those don't add credits.";
    case "gtm":
      return "Give more go-to-market answers below for a sharper score. Those don't add credits.";
    case "rev":
      return "Give more finance answers below for a sharper score. Those don't add credits.";
  }
}

export function buildModuleReward(
  module: ProfileModuleId,
  earned: Pick<ProfileEarnState, "modules" | "benchmark">,
  planMonthlyLimit: number,
): ProfileCreditReward {
  return {
    kind: "module",
    module,
    amount: creditsPerBlock(planMonthlyLimit),
    balance: computeEarnedCredits(earned, planMonthlyLimit),
    headline: moduleCreditsHeadline(module),
    message: moduleCreditsMessage(module),
  };
}

export function buildBenchmarkReward(
  earned: Pick<ProfileEarnState, "modules" | "benchmark">,
  planMonthlyLimit: number,
): ProfileCreditReward {
  return {
    kind: "benchmark",
    amount: creditsPerBlock(planMonthlyLimit),
    balance: computeEarnedCredits(earned, planMonthlyLimit),
    headline: "Benchmark saved",
    message: "Peer comparisons and track intelligence just got sharper.",
  };
}

export function mergeEarnedModules(
  current: ProfileModuleId[],
  add: readonly ProfileModuleId[],
): ProfileModuleId[] {
  return [...new Set([...current, ...add])];
}
