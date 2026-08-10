import type { OnboardingBenchmarkInput } from "./PatriotPayJourney";
import type { OnboardingFlowAnswers } from "./OnboardingFlow";

export const WORKSPACE_SESSION_KEY = "fuel-workspace-session-v1";
export const RELOAD_LANDING_ACTIVE_KEY = "fuel-reload-landing-active";
export const ACTIVE_PAGE_KEY = "fuel-workspace-active-page-v1";
export const SIGNED_OUT_KEY = "fuel-signed-out";

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
  "company-profile",
]);

const INVESTOR_ACTIVE_PAGES = new Set([
  "investor-portfolios",
  "investor-pipeline",
  "investor-watchlists",
  "investor-home",
  "account",
  "connectors",
]);

export function isValidActivePage(page: string, persona: WorkspacePersona): boolean {
  const allowed = persona === "investor" ? INVESTOR_ACTIVE_PAGES : FOUNDER_ACTIVE_PAGES;
  return allowed.has(page);
}

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

/** Clear stale reload-landing flags from prior builds — refresh no longer uses module-first reset. */
export function clearStaleReloadLandingFlag(): void {
  clearReloadLandingActive();
}

/** @deprecated Refresh no longer wipes workspace progress. Kept for call-site compatibility. */
export function resetWorkspaceStorage(companyKey: string): void {
  void companyKey;
}

/** @deprecated Refresh no longer resets workspace state. Kept for call-site compatibility. */
export function applyBrowserReloadReset(companyKey: string): void {
  void companyKey;
  clearStaleReloadLandingFlag();
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
