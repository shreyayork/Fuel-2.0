/**
 * Profile completion grants the same credits founders spend on chat, uploads, and playbooks.
 *
 * New users start at 0. Company 50, R&D 50, GTM 50, G&A 50, Benchmark 50 (250 total on Free).
 * Company unlocks on the three mandatory fields. Track modules unlock when that track’s
 * onboarding questions are fully answered. Benchmark +50 only when every cohort metric is filled.
 */
export type ProfileModuleId = "company" | "dev" | "gtm" | "rev";

export type ProfileCreditMilestone = ProfileModuleId | "benchmark" | "intelligenceSources";

export const PROFILE_STARTING_CREDITS = 0;

/** Profile wizard modules — 200 credits total. */
export const PROFILE_MODULE_REWARDS: Record<ProfileModuleId, number> = {
  /** Mandatory company identity — company, what they do, industry. */
  company: 50,
  /** R&D track — product stage, delivery constraints. */
  dev: 50,
  /** GTM track — revenue motion and pipeline context. */
  gtm: 50,
  /** G&A track — runway, finance, and capital priorities. */
  rev: 50,
};

/** All cohort metrics submitted. */
export const BENCHMARK_REWARD_CREDITS = 50;

/** Intelligence sources no longer award profile credits. */
export const INTELLIGENCE_SOURCES_REWARD_CREDITS = 0;

export const PROFILE_MODULE_EARNABLE_TOTAL = Object.values(PROFILE_MODULE_REWARDS).reduce(
  (sum, value) => sum + value,
  0,
);

export const PROFILE_EARNABLE_CREDITS = PROFILE_MODULE_EARNABLE_TOTAL + BENCHMARK_REWARD_CREDITS;
export const PROFILE_TOTAL_CREDITS = PROFILE_STARTING_CREDITS + PROFILE_EARNABLE_CREDITS;

export const PROFILE_TRACK_MODULE_REWARDS_TOTAL =
  PROFILE_MODULE_REWARDS.dev + PROFILE_MODULE_REWARDS.gtm + PROFILE_MODULE_REWARDS.rev;

export const PROFILE_CREDIT_BREAKDOWN = [
  {
    id: "profile",
    label: "Complete Profile",
    credits: PROFILE_MODULE_REWARDS.company,
    detail: "Company, what they do, and industry",
  },
  {
    id: "dev",
    label: "R&D",
    credits: PROFILE_MODULE_REWARDS.dev,
    detail: "Product stage, type, and delivery constraints",
  },
  {
    id: "gtm",
    label: "GTM",
    credits: PROFILE_MODULE_REWARDS.gtm,
    detail: "Revenue motion, ICP, and pipeline context",
  },
  {
    id: "rev",
    label: "G&A",
    credits: PROFILE_MODULE_REWARDS.rev,
    detail: "Runway, finance, and capital priorities",
  },
  {
    id: "benchmark",
    label: "Benchmark",
    credits: BENCHMARK_REWARD_CREDITS,
    detail: "All cohort metrics for peer comparisons",
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
  return Math.min(PROFILE_EARNABLE_CREDITS, total);
}

export function remainingBenchmarkRewardCredits(earned?: EarnedProfileCredits): number {
  if (earned?.benchmark && earned.benchmarkViaSubmit) return 0;
  return BENCHMARK_REWARD_CREDITS;
}

export function remainingIntelligenceRewardCredits(_earned?: EarnedProfileCredits): number {
  return 0;
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

export type ProfileCreditRewardKind = "benchmark" | "intelligenceSources" | "module";

export type ProfileCreditReward = {
  kind: ProfileCreditRewardKind;
  amount: number;
  balance: number;
  headline: string;
  message: string;
  module?: ProfileModuleId;
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

/** Marks module credits once — returns a reward payload only on first earn. */
export function tryMarkModuleEarned(
  module: ProfileModuleId,
  companyKey = "default",
  headline: string,
  message: string,
): {
  earned: EarnedProfileCredits;
  reward: ProfileCreditReward | null;
} {
  const current = loadEarnedProfileCredits(companyKey);
  if (current.modules.includes(module)) {
    return { earned: current, reward: null };
  }
  const earned = markModuleEarned(module, companyKey);
  return {
    earned,
    reward: {
      kind: "module",
      module,
      amount: PROFILE_MODULE_REWARDS[module],
      balance: computeCreditBalance(earned),
      headline,
      message,
    },
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

/** Replace stored credits with what this onboarding session actually earned. */
export function resetAndAwardOnboardingCredits(
  modules: ProfileModuleId[],
  benchmarkSubmitted: boolean,
  companyKey = "default",
): EarnedProfileCredits {
  const next: EarnedProfileCredits = {
    modules: [...new Set(modules)],
    benchmark: benchmarkSubmitted,
    intelligenceSources: false,
    benchmarkViaSubmit: benchmarkSubmitted,
  };
  saveEarnedProfileCredits(next, companyKey);
  return loadEarnedProfileCredits(companyKey);
}

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
    default:
      return "Credits unlocked";
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
    default:
      return "Keep going below for a sharper score. Extra answers don't add credits.";
  }
}
