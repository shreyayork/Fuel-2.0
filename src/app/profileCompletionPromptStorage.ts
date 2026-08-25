import type { OnboardingFlowAnswers } from "./OnboardingFlow";
import { mapOnboardingToDetailAnswers } from "./OnboardingFlow";
import type { ProfileModuleId } from "./profileCredits";
import {
  countSectionAnswers,
  DETAIL_SECTIONS,
  getVisibleQuestions,
  type DetailAnswers,
  type DetailSectionId,
} from "./trackQuestions";

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

function loadStoredDetailAnswers(companyName: string): DetailAnswers {
  try {
    const raw = window.localStorage.getItem(`fuel-details-${companyName}`);
    return raw ? JSON.parse(raw) as DetailAnswers : {};
  } catch {
    return {};
  }
}

/** Drop leftover Overview answers so a skipped onboarding does not inherit prior R&D/GTM/G&A credits. */
export function clearStoredDetailAnswers(...companyNames: string[]) {
  try {
    const names = new Set(companyNames.map(name => name.trim()).filter(Boolean));
    names.forEach(name => {
      window.localStorage.removeItem(`fuel-details-${name}`);
      window.localStorage.removeItem(`fuel-details-q-${name}`);
    });
  } catch {
    /* ignore */
  }
}

function sectionIdForModule(moduleId: ProfileModuleId): DetailSectionId {
  if (moduleId === "company") return "profile";
  if (moduleId === "gtm") return "mkt";
  return moduleId;
}

function isModuleFullyComplete(moduleId: ProfileModuleId, answers: DetailAnswers): boolean {
  const section = DETAIL_SECTIONS.find(item => item.id === sectionIdForModule(moduleId));
  if (!section) return false;
  const total = getVisibleQuestions(section, answers).length;
  const answered = countSectionAnswers(section, answers);
  return total > 0 && answered >= total;
}

/** Merge onboarding seed data with saved workspace profile answers. */
export function mergeWorkspaceDetailAnswers(
  companyKey: string,
  companyName: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): DetailAnswers {
  const seeded = onboardingAnswers ? mapOnboardingToDetailAnswers(onboardingAnswers) : {};
  return {
    ...seeded,
    ...loadStoredDetailAnswers(companyKey),
    ...loadStoredDetailAnswers(companyName),
  };
}

/** True when any Product Phase profile module is still incomplete. */
export function isWorkspaceProfilePhaseIncomplete(
  companyKey: string,
  companyName: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): boolean {
  if (onboardingAnswers && onboardingAnswers.profileSetupComplete === false) return true;
  const answers = mergeWorkspaceDetailAnswers(companyKey, companyName, onboardingAnswers);
  return PROFILE_PHASE_MODULES.some(moduleId => !isModuleFullyComplete(moduleId, answers));
}

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
  companyName: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): boolean {
  if (!isWorkspaceProfilePhaseIncomplete(companyKey, companyName, onboardingAnswers)) return false;
  if (isProfileCompletionPromptDismissed(companyKey)) return false;
  return true;
}

export function shouldGateFounderProfilePrompt(
  persona: "founder" | "investor",
  companyKey: string,
  companyName: string,
  activePage: string,
  onboardingAnswers?: OnboardingFlowAnswers | null,
): boolean {
  if (persona === "investor") return false;
  if (!isFounderProfilePromptSurface(activePage)) return false;
  return isProfileCompletionPromptDue(companyKey, companyName, onboardingAnswers);
}

/** Fresh sign-in / onboarding — allow the profile prompt to appear again. */
export function resetProfileCompletionPromptForNewLogin(companyKey = "patriotpay") {
  clearProfileCompletionPromptDismissed(companyKey);
}
