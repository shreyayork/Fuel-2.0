/**
 * Intelligence unlock credits — separate from monthly AI action credits in `credits/`.
 *
 * New users start with 50 after onboarding. Up to 200 more are earned by completing
 * profile modules, submitting benchmarks, and reviewing intelligence sources (250 total).
 *
 * Weighting reflects impact on Fuel's recommendations and cohort comparisons.
 */
export type ProfileModuleId = "company" | "dev" | "gtm" | "rev";

export type ProfileCreditMilestone = ProfileModuleId | "benchmark" | "intelligenceSources";

export const PROFILE_STARTING_CREDITS = 50;
export const PROFILE_EARNABLE_CREDITS = 200;
export const PROFILE_TOTAL_CREDITS = PROFILE_STARTING_CREDITS + PROFILE_EARNABLE_CREDITS;

/** Profile wizard modules — 120 credits total (60% of earnable). */
export const PROFILE_MODULE_REWARDS: Record<ProfileModuleId, number> = {
  /** Company identity — unlocks peer cohort matching and ICP alignment. */
  company: 40,
  /** R&D track — product stage, delivery constraints. */
  dev: 25,
  /** GTM track — revenue motion and pipeline context. */
  gtm: 30,
  /** G&A track — runway, finance, and capital priorities. */
  rev: 25,
};

/** First benchmark submission — 50 credits (25% of earnable). */
export const BENCHMARK_REWARD_CREDITS = 50;

/** Review or add intelligence sources — 30 credits (15% of earnable). */
export const INTELLIGENCE_SOURCES_REWARD_CREDITS = 30;

export const PROFILE_MODULE_EARNABLE_TOTAL = Object.values(PROFILE_MODULE_REWARDS).reduce(
  (sum, value) => sum + value,
  0,
);

export const PROFILE_TRACK_MODULE_REWARDS_TOTAL =
  PROFILE_MODULE_REWARDS.dev + PROFILE_MODULE_REWARDS.gtm + PROFILE_MODULE_REWARDS.rev;

export const PROFILE_CREDIT_BREAKDOWN = [
  {
    id: "modules",
    label: "Profile · R&D · GTM · G&A",
    credits: PROFILE_MODULE_EARNABLE_TOTAL,
    detail: "40 + 25 + 30 + 25 across the four profile modules",
  },
  {
    id: "benchmark",
    label: "Benchmark",
    credits: BENCHMARK_REWARD_CREDITS,
    detail: "Submit cohort metrics for peer comparisons",
  },
  {
    id: "sources",
    label: "Intelligence sources",
    credits: INTELLIGENCE_SOURCES_REWARD_CREDITS,
    detail: "Review or add meetings, decks, and news",
  },
] as const;

export type EarnedProfileCredits = {
  modules: ProfileModuleId[];
  benchmark: boolean;
  intelligenceSources: boolean;
  /** Set when user submits benchmark through the form — ignores legacy auto-marked benchmark flags. */
  benchmarkViaSubmit?: boolean;
  /** Set when user uploads or adds intelligence sources. */
  intelligenceViaAction?: boolean;
};

export const EMPTY_EARNED_PROFILE_CREDITS: EarnedProfileCredits = {
  modules: [],
  benchmark: false,
  intelligenceSources: false,
};

const STORAGE_PREFIX = "fuel-profile-credits-earned:";

function storageKey(companyKey: string) {
  return `${STORAGE_PREFIX}${companyKey.trim().toLowerCase() || "default"}`;
}

export function getModuleReward(module: ProfileModuleId): number {
  return PROFILE_MODULE_REWARDS[module];
}

export function sumModuleRewards(modules: readonly ProfileModuleId[]): number {
  return modules.reduce((sum, id) => sum + PROFILE_MODULE_REWARDS[id], 0);
}

export function computeEarnedCredits(earned: EarnedProfileCredits): number {
  let total = sumModuleRewards(earned.modules);
  if (earned.benchmark && earned.benchmarkViaSubmit) total += BENCHMARK_REWARD_CREDITS;
  if (earned.intelligenceSources && earned.intelligenceViaAction) total += INTELLIGENCE_SOURCES_REWARD_CREDITS;
  return Math.min(PROFILE_EARNABLE_CREDITS, total);
}

export function remainingBenchmarkRewardCredits(earned?: EarnedProfileCredits): number {
  if (earned?.benchmark && earned.benchmarkViaSubmit) return 0;
  return BENCHMARK_REWARD_CREDITS;
}

export function remainingIntelligenceRewardCredits(earned?: EarnedProfileCredits): number {
  if (earned?.intelligenceSources && earned.intelligenceViaAction) return 0;
  return INTELLIGENCE_SOURCES_REWARD_CREDITS;
}

const PROFILE_MODULE_IDS: ProfileModuleId[] = ["company", "dev", "gtm", "rev"];

/** Credits still earnable from Profile · R&D · GTM · G&A modules. */
export function remainingProfileModuleCredits(earned?: EarnedProfileCredits): number {
  const earnedModules = earned?.modules ?? [];
  return PROFILE_MODULE_IDS
    .filter(id => !earnedModules.includes(id))
    .reduce((sum, id) => sum + PROFILE_MODULE_REWARDS[id], 0);
}

export function computeCreditBalance(earned: EarnedProfileCredits): number {
  return PROFILE_STARTING_CREDITS + computeEarnedCredits(earned);
}

export function remainingEarnableCredits(earned: EarnedProfileCredits): number {
  return Math.max(0, PROFILE_EARNABLE_CREDITS - computeEarnedCredits(earned));
}

export function loadEarnedProfileCredits(companyKey = "default"): EarnedProfileCredits {
  try {
    const raw = window.localStorage.getItem(storageKey(companyKey));
    if (!raw) return { ...EMPTY_EARNED_PROFILE_CREDITS, modules: [] };
    const parsed = JSON.parse(raw) as Partial<EarnedProfileCredits>;
    const modules = Array.isArray(parsed.modules)
      ? parsed.modules.filter((id): id is ProfileModuleId =>
          id === "company" || id === "dev" || id === "gtm" || id === "rev")
      : [];
    return {
      modules: [...new Set(modules)],
      // Legacy auto-mark only set benchmark:true — ignore unless explicitly submitted
      benchmark: Boolean(parsed.benchmarkViaSubmit && parsed.benchmark),
      intelligenceSources: Boolean(parsed.intelligenceViaAction && parsed.intelligenceSources),
      benchmarkViaSubmit: Boolean(parsed.benchmarkViaSubmit),
      intelligenceViaAction: Boolean(parsed.intelligenceViaAction),
    };
  } catch {
    return { modules: [], benchmark: false, intelligenceSources: false };
  }
}

export function saveEarnedProfileCredits(earned: EarnedProfileCredits, companyKey = "default") {
  try {
    window.localStorage.setItem(storageKey(companyKey), JSON.stringify(earned));
  } catch {
    /* ignore quota errors in preview */
  }
}

function mergeEarned(
  current: EarnedProfileCredits,
  patch: Partial<EarnedProfileCredits>,
): EarnedProfileCredits {
  return {
    modules: patch.modules
      ? [...new Set(patch.modules)]
      : current.modules,
    benchmark: patch.benchmark ?? current.benchmark,
    intelligenceSources: patch.intelligenceSources ?? current.intelligenceSources,
    benchmarkViaSubmit: patch.benchmarkViaSubmit ?? current.benchmarkViaSubmit,
    intelligenceViaAction: patch.intelligenceViaAction ?? current.intelligenceViaAction,
  };
}

export function markModuleEarned(
  module: ProfileModuleId,
  companyKey = "default",
): EarnedProfileCredits {
  const current = loadEarnedProfileCredits(companyKey);
  if (current.modules.includes(module)) return current;
  const next = mergeEarned(current, { modules: [...current.modules, module] });
  saveEarnedProfileCredits(next, companyKey);
  return next;
}

export function markModulesEarned(
  modules: ProfileModuleId[],
  companyKey = "default",
): EarnedProfileCredits {
  const current = loadEarnedProfileCredits(companyKey);
  const next = mergeEarned(current, {
    modules: [...new Set([...current.modules, ...modules])],
  });
  saveEarnedProfileCredits(next, companyKey);
  return next;
}

export function markBenchmarkEarned(companyKey = "default"): EarnedProfileCredits {
  const current = loadEarnedProfileCredits(companyKey);
  if (current.benchmark && current.benchmarkViaSubmit) return current;
  const next = mergeEarned(current, { benchmark: true, benchmarkViaSubmit: true });
  saveEarnedProfileCredits(next, companyKey);
  return next;
}

export function markIntelligenceSourcesEarned(companyKey = "default"): EarnedProfileCredits {
  const current = loadEarnedProfileCredits(companyKey);
  if (current.intelligenceSources && current.intelligenceViaAction) return current;
  const next = mergeEarned(current, { intelligenceSources: true, intelligenceViaAction: true });
  saveEarnedProfileCredits(next, companyKey);
  return next;
}

export type ProfileCreditRewardKind = "benchmark" | "intelligenceSources";

export type ProfileCreditReward = {
  kind: ProfileCreditRewardKind;
  amount: number;
  balance: number;
  headline: string;
  message: string;
};

function buildProfileCreditReward(
  kind: ProfileCreditRewardKind,
  amount: number,
  earned: EarnedProfileCredits,
): ProfileCreditReward {
  const balance = computeCreditBalance(earned);
  if (kind === "benchmark") {
    return {
      kind,
      amount,
      balance,
      headline: "Benchmark saved",
      message: "Peer comparisons and track intelligence just got sharper.",
    };
  }
  return {
    kind,
    amount,
    balance,
    headline: "Intelligence sources reviewed",
    message: "Fuel can now weave meetings, decks, and news into your advisor.",
  };
}

/** Marks benchmark credits once — returns a reward payload only on first earn. */
export function tryMarkBenchmarkEarned(companyKey = "default"): {
  earned: EarnedProfileCredits;
  reward: ProfileCreditReward | null;
} {
  const current = loadEarnedProfileCredits(companyKey);
  if (current.benchmark && current.benchmarkViaSubmit) {
    return { earned: current, reward: null };
  }
  const earned = markBenchmarkEarned(companyKey);
  return {
    earned,
    reward: buildProfileCreditReward("benchmark", BENCHMARK_REWARD_CREDITS, earned),
  };
}

/** Marks intelligence-source credits once — returns a reward payload only on first earn. */
export function tryMarkIntelligenceSourcesEarned(companyKey = "default"): {
  earned: EarnedProfileCredits;
  reward: ProfileCreditReward | null;
} {
  const current = loadEarnedProfileCredits(companyKey);
  if (current.intelligenceSources && current.intelligenceViaAction) {
    return { earned: current, reward: null };
  }
  const earned = markIntelligenceSourcesEarned(companyKey);
  return {
    earned,
    reward: buildProfileCreditReward("intelligenceSources", INTELLIGENCE_SOURCES_REWARD_CREDITS, earned),
  };
}

export function formatCreditBalance(earned: EarnedProfileCredits): string {
  return `${computeCreditBalance(earned)} / ${PROFILE_TOTAL_CREDITS}`;
}
