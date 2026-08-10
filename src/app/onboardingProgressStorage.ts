import type { OnboardingTrackAnswers } from "./trackQuestions.ts";

export const ONBOARDING_PROGRESS_KEY = "fuel-onboarding-progress:v1";
export const ONBOARDING_BUSINESS_TYPE_KEY = "fuel-onboarding-business-type:v1";
export const ONBOARDING_COMPANY_KEY = "patriotpay";

export type OnboardingSearchState = "idle" | "searching" | "review" | "ready";

/** Entry routing — determines which onboarding flow runs. */
export type OnboardingBusinessType = "product" | "service" | "investment";

export const BUSINESS_TYPE_MODEL: Record<OnboardingBusinessType, string> = {
  product: "Product",
  service: "Services or Agency",
  investment: "Investment",
};

export function modelToBusinessType(model: string | undefined): OnboardingBusinessType | null {
  if (model === "Product") return "product";
  if (model === "Services or Agency") return "service";
  if (model === "Investment") return "investment";
  return null;
}

export function loadSavedBusinessType(): OnboardingBusinessType | null {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_BUSINESS_TYPE_KEY);
    if (raw === "product" || raw === "service" || raw === "investment") return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveBusinessType(type: OnboardingBusinessType) {
  try {
    window.localStorage.setItem(ONBOARDING_BUSINESS_TYPE_KEY, type);
  } catch {
    /* ignore quota */
  }
}

export function clearBusinessType() {
  try {
    window.localStorage.removeItem(ONBOARDING_BUSINESS_TYPE_KEY);
  } catch {
    /* ignore */
  }
}

export type SavedOnboardingProgress = {
  businessType: OnboardingBusinessType;
  stepIndex: number;
  searchState: OnboardingSearchState;
  companyQuery: string;
  profileForm: {
    company: string;
    whatTheyDo: string;
    businessModel: string;
    industry: string;
    founded: string;
    city: string;
    stateRegion: string;
    country: string;
    website: string;
    linkedin: string;
    additionalContext: string;
    productDescription: string;
    approxHeadcount: string;
  };
  fundingRounds: { id: string; type: string; amount: string; date: string; investors: string }[];
  answers: OnboardingTrackAnswers & Record<string, string | string[] | boolean | undefined>;
};

export function loadOnboardingProgress(): SavedOnboardingProgress | null {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedOnboardingProgress;
    if (!parsed.businessType) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOnboardingProgress(state: SavedOnboardingProgress) {
  try {
    window.localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(state));
    saveBusinessType(state.businessType);
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingProgress() {
  try {
    window.localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}
