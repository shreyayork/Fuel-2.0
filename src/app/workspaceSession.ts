import type { OnboardingBenchmarkInput } from "./PatriotPayJourney";
import type { OnboardingFlowAnswers } from "./OnboardingFlow";
import { EMPTY_EARNED_PROFILE_CREDITS, saveEarnedProfileCredits } from "./profileCredits";

export const WORKSPACE_SESSION_KEY = "fuel-workspace-session-v1";
export const RELOAD_LANDING_ACTIVE_KEY = "fuel-reload-landing-active";

export type StoredWorkspaceSession = {
  onboardingAnswers: OnboardingFlowAnswers;
  onboardingBenchmark: OnboardingBenchmarkInput;
};

let reloadResetAppliedThisLoad = false;

export function isBrowserReload(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

export function markReloadLandingActive(): void {
  try {
    sessionStorage.setItem(RELOAD_LANDING_ACTIVE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isReloadLandingActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(RELOAD_LANDING_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearReloadLandingActive(): void {
  try {
    sessionStorage.removeItem(RELOAD_LANDING_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Wipe persisted workspace progress so refresh lands in a clean module-first state. */
export function resetWorkspaceStorage(companyKey: string): void {
  const normalizedKey = companyKey.trim().toLowerCase() || "default";
  try {
    localStorage.removeItem(`fuel-details-${companyKey}`);
    localStorage.removeItem(`fuel-profile-credits-earned:${normalizedKey}`);
    localStorage.removeItem(`fuel-overview-built-${companyKey}`);
    localStorage.removeItem("fuel-benchmark-submission");
    localStorage.removeItem("fuelTourPromptSnoozedUntil");
    saveEarnedProfileCredits({ ...EMPTY_EARNED_PROFILE_CREDITS, modules: [] }, companyKey);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Run once per reload page load — clears storage and marks the landing session. */
export function applyBrowserReloadReset(companyKey: string): void {
  if (typeof window === "undefined") return;
  if (!isBrowserReload()) return;
  if (reloadResetAppliedThisLoad) return;
  reloadResetAppliedThisLoad = true;
  resetWorkspaceStorage(companyKey);
  markReloadLandingActive();
}

export function saveWorkspaceSession(session: StoredWorkspaceSession): void {
  try {
    sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadWorkspaceSession(): StoredWorkspaceSession | null {
  try {
    const raw = sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWorkspaceSession;
    if (!parsed?.onboardingAnswers || !parsed?.onboardingBenchmark) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWorkspaceSession(): void {
  try {
    sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Score ring / headline values — show 00 on fresh reload landing. */
export function landingDisplayScore(score: number, displayScoresZero: boolean): number {
  return displayScoresZero ? 0 : score;
}

export function landingDisplayScoreLabel(score: number, displayScoresZero: boolean): string {
  return landingDisplayScore(score, displayScoresZero).toString().padStart(2, "0");
}

export function landingDisplayPercent(percent: number, displayScoresZero: boolean): number {
  return displayScoresZero ? 0 : percent;
}
