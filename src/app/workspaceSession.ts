import type { OnboardingBenchmarkInput } from "./PatriotPayJourney";
import type { OnboardingFlowAnswers } from "./OnboardingFlow";
import { EMPTY_EARNED_PROFILE_CREDITS, saveEarnedProfileCredits } from "./profileCredits";

export const WORKSPACE_SESSION_KEY = "fuel-workspace-session-v1";
export const RELOAD_LANDING_ACTIVE_KEY = "fuel-reload-landing-active";
export const ACTIVE_PAGE_KEY = "fuel-workspace-active-page-v1";
export const SIGNED_OUT_KEY = "fuel-signed-out";
/** Marks Ask Fuel AI to start with an empty thread after a hard refresh. */
export const ASK_FUEL_FRESH_KEY = "fuel-ask-fuel-fresh";

export type WorkspacePersona = "founder" | "investor";

export type StoredWorkspaceSession = {
  onboardingAnswers: OnboardingFlowAnswers;
  onboardingBenchmark: OnboardingBenchmarkInput;
};

const FOUNDER_ACTIVE_PAGES = new Set([
  "scorecard-v2",
  "signals",
  "context-feed",
  "initiatives",
  "overview",
  "data-room",
  "signals-loading",
  "journey",
  "development",
  "marketing",
  "development-setup",
  "marketing-setup",
  "connectors",
  "account",
  "help",
  "company-profile",
]);

const INVESTOR_ACTIVE_PAGES = new Set([
  "investor-portfolios",
  "investor-pipeline",
  "investor-watchlists",
  "investor-home",
  "account",
  "help",
  "connectors",
]);

export function isValidActivePage(page: string, persona: WorkspacePersona): boolean {
  const allowed = persona === "investor" ? INVESTOR_ACTIVE_PAGES : FOUNDER_ACTIVE_PAGES;
  return allowed.has(page);
}

export function isBrowserReload(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "reload") return true;
  // Legacy Navigation Timing (some embeds / older browsers)
  const legacy = (performance as unknown as { navigation?: { type?: number } }).navigation;
  return legacy?.type === 1;
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

/** Clear stale reload-landing flags when this load is not a hard refresh. */
export function clearStaleReloadLandingFlag(): void {
  clearReloadLandingActive();
  try {
    sessionStorage.removeItem(ASK_FUEL_FRESH_KEY);
  } catch {
    /* ignore */
  }
}

/** Wipe persisted workspace / Ask Fuel related local data for a clean hard-refresh start. */
export function resetWorkspaceStorage(companyKey: string): void {
  const key = companyKey.trim() || "patriotpay";
  const normalizedKey = key.toLowerCase() || "default";
  try {
    localStorage.removeItem(`fuel-details-${key}`);
    localStorage.removeItem(`fuel-profile-credits-earned:${normalizedKey}`);
    localStorage.removeItem(`fuel-profile-credit-toast-seen:${normalizedKey}`);
    localStorage.removeItem(`fuel-overview-built-${key}`);
    localStorage.removeItem(`fuel-profile-completion-prompt-dismissed:v2:${normalizedKey}`);
    localStorage.removeItem(`fuel-crunchbase-profile-notice-dismissed:v1:${normalizedKey}`);
    localStorage.removeItem("fuel-benchmark-submission");
    localStorage.removeItem("fuelTourPromptSnoozedUntil");
    localStorage.removeItem("fuelWorkspaceTourTakenAt");
    localStorage.removeItem("fuelWorkspaceTourTaken");
    localStorage.removeItem("fuel-investor-hubspot-connected");
    localStorage.removeItem("fuel-rec-actions-tip-Patriot Pay");
    localStorage.removeItem(`fuel-rec-actions-tip-${key}`);
    sessionStorage.removeItem("fuel-rec-actions-tip-pending-Patriot Pay");
    sessionStorage.removeItem(`fuel-rec-actions-tip-pending-${key}`);
    sessionStorage.setItem(ASK_FUEL_FRESH_KEY, "1");
    saveEarnedProfileCredits({ ...EMPTY_EARNED_PROFILE_CREDITS, modules: [] }, key);
  } catch {
    /* ignore quota / private mode */
  }
}

let reloadResetAppliedThisLoad = false;

/** Run once per hard refresh — clears stored progress and marks a fresh landing + Ask Fuel thread. */
export function applyBrowserReloadReset(companyKey: string): void {
  if (typeof window === "undefined") return;
  if (!isBrowserReload()) return;
  if (reloadResetAppliedThisLoad) return;
  reloadResetAppliedThisLoad = true;
  resetWorkspaceStorage(companyKey);
  markReloadLandingActive();
}

export function consumeAskFuelFreshStart(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(ASK_FUEL_FRESH_KEY) !== "1") return false;
    sessionStorage.removeItem(ASK_FUEL_FRESH_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveWorkspaceSession(session: StoredWorkspaceSession): void {
  try {
    const payload = JSON.stringify(session);
    localStorage.setItem(WORKSPACE_SESSION_KEY, payload);
    sessionStorage.setItem(WORKSPACE_SESSION_KEY, payload);
  } catch {
    /* ignore quota / private mode */
  }
}

function readWorkspaceSessionRaw(): string | null {
  try {
    const fromLocal = localStorage.getItem(WORKSPACE_SESSION_KEY);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    if (fromSession) {
      localStorage.setItem(WORKSPACE_SESSION_KEY, fromSession);
      return fromSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadWorkspaceSession(): StoredWorkspaceSession | null {
  try {
    const raw = readWorkspaceSessionRaw();
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
    localStorage.removeItem(WORKSPACE_SESSION_KEY);
    sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
    localStorage.removeItem(ACTIVE_PAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function markSignedOut(): void {
  try {
    sessionStorage.setItem(SIGNED_OUT_KEY, "1");
  } catch {
    /* ignore */
  }
  clearWorkspaceSession();
  clearStaleReloadLandingFlag();
  try {
    localStorage.removeItem("fuel-profile-completion-prompt-dismissed:v2:patriotpay");
  } catch {
    /* ignore */
  }
}

export function clearSignedOut(): void {
  try {
    sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    /* ignore */
  }
}

export function isSignedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveActivePage(page: string, persona: WorkspacePersona): void {
  if (!isValidActivePage(page, persona)) return;
  try {
    localStorage.setItem(ACTIVE_PAGE_KEY, JSON.stringify({ page, persona }));
  } catch {
    /* ignore */
  }
}

export function loadActivePage(persona: WorkspacePersona): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { page?: string; persona?: WorkspacePersona };
    if (parsed.persona !== persona || !parsed.page) return null;
    if (!isValidActivePage(parsed.page, persona)) return null;
    return parsed.page;
  } catch {
    return null;
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
