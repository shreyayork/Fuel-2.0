import type { OnboardingFlowAnswers } from "./OnboardingFlow";
import { mapOnboardingToDetailAnswers } from "./OnboardingFlow";
import type { ProfileModuleId } from "./profileCredits";
import { loadDetailAnswers } from "./profileDetailsStorage";
import { isModuleFullyComplete } from "./profileProgress";
import type { DetailAnswers } from "./trackQuestions";

const STORAGE_PREFIX = "fuel-profile-completion-prompt-dismissed:v2:";
const PROFILE_PHASE_MODULES: ProfileModuleId[] = ["company", "dev", "gtm", "rev"];

const PROFILE_PROMPT_BLOCKED_PAGES = new Set([
  "account",
  "connectors",
  "investor-portfolios",
  "investor-pipeline",
  "investor-watchlists",
  "investor-home",
  "development-setup",
  "marketing-setup",
]);

export function isFounderProfilePromptSurface(activePage: string): boolean {
  return !PROFILE_PROMPT_BLOCKED_PAGES.has(activePage);
}

function storageKey(companyKey: string) {
  return `${STORAGE_PREFIX}${companyKey.trim().toLowerCase() || "default"}`;
}

/** Merge onboarding seed data with saved workspace profile answers. */
export function mergeWorkspaceDetailAnswers(
  companyKey: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): DetailAnswers {
  const seeded = onboardingAnswers ? mapOnboardingToDetailAnswers(onboardingAnswers) : {};
  return { ...seeded, ...loadDetailAnswers(companyKey) };
}

/** True when any Product Phase profile module is still incomplete. */
export function isWorkspaceProfilePhaseIncomplete(
  companyKey: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): boolean {
  const answers = mergeWorkspaceDetailAnswers(companyKey, onboardingAnswers);
  return PROFILE_PHASE_MODULES.some(moduleId => !isModuleFullyComplete(moduleId, answers));
}

/** User chose "Continue to Overview" without completing profile. */
export function isProfileCompletionPromptDismissed(companyKey = "default"): boolean {
  try {
    return window.localStorage.getItem(storageKey(companyKey)) === "1";
  } catch {
    return false;
  }
}

export function markProfileCompletionPromptDismissed(companyKey = "default") {
  try {
    window.localStorage.setItem(storageKey(companyKey), "1");
  } catch {
    /* ignore quota errors in preview */
  }
}

export function clearProfileCompletionPromptDismissed(companyKey = "default") {
  try {
    window.localStorage.removeItem(storageKey(companyKey));
  } catch {
    /* ignore */
  }
}

/** Whether the first-time profile completion modal should appear for this company. */
export function isProfileCompletionPromptDue(
  companyKey: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): boolean {
  if (!isWorkspaceProfilePhaseIncomplete(companyKey, onboardingAnswers)) return false;
  if (isProfileCompletionPromptDismissed(companyKey)) return false;
  return true;
}

/** Founder workspace entry — show the modal before any other product UI. */
export function shouldGateFounderProfilePrompt(
  persona: "founder" | "investor",
  companyKey: string,
  activePage: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): boolean {
  if (persona === "investor") return false;
  if (!isFounderProfilePromptSurface(activePage)) return false;
  return isProfileCompletionPromptDue(companyKey, onboardingAnswers);
}

/** Fresh sign-in / onboarding — allow the profile prompt to appear again. */
export function resetProfileCompletionPromptForNewLogin(companyKey = "patriotpay") {
  clearProfileCompletionPromptDismissed(companyKey);
}
