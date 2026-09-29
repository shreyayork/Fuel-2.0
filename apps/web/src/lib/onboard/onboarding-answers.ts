import type { buildClaimProfile } from "./claim-profile";
import type { ClaimFundingRound } from "./claim-profile";

/** Operating-company onboarding answers (R&D / GTM / G&A). */
export interface OnboardingAnswers {
  productStage: string;
  productType: string;
  productChallenge: string;
  salesMotion: string;
  funnelBreakdown: string;
  icpClarity: string;
  revenueTracking: string;
  runway: string;
  financeManagement: string;
  capitalPriority: string;
  /** @deprecated Prefer productStage; retained for older snapshots. */
  aiCore?: string;
  /** @deprecated Prefer capitalPriority; retained for older snapshots. */
  investorIntros?: string;
  /** @deprecated Prefer revenueTracking; retained for older snapshots. */
  pipelineTool?: string;
  /** @deprecated Prefer revenueTracking; retained for older snapshots. */
  salesProcess?: string;
}

/** Investor onboarding answers (fund thesis & deal flow). */
export interface InvestorAnswers {
  stages: string[];
  sectors: string[];
  checkSize: string;
  geography: string;
  pipeline: string;
}

export type ConnectStatus = "pending" | "connecting" | "connected";

export type OnboardingFlowType = "operating" | "investor";

export type OnboardingProfileFormSnapshot = {
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
  /** Selected company OpenSearch / CDN logo when available. */
  logoUrl?: string | null;
};

export type RawBenchmarkInputs = {
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  grossMargin: string;
  cacPayback: string;
  burnMultiple: string;
  ruleOf40: string;
  monthlyBurn: string;
  cashOnHand: string;
  headcount: string;
  payingCustomers: string;
};

export type WizardClaimPayload = {
  profile: ReturnType<typeof buildClaimProfile>;
  enrichmentRunId?: string | null;
  metrics: {
    arrUsd?: number | null;
    arrGrowthYoyPct?: number | null;
    nrrPct?: number | null;
    logoRetentionPct?: number | null;
    monthlyBurnUsd?: number | null;
    cashOnHandUsd?: number | null;
    grossMarginPct?: number | null;
    cacPaybackMonths?: number | null;
    burnMultiple?: number | null;
    ruleOf40Pct?: number | null;
    fteCount?: number | null;
    paidCustomerCount?: number | null;
    notableCustomers?: string | null;
    challenges?: string | null;
  } | null;
  cohortKey?: string | null;
  flowType?: OnboardingFlowType;
  answers?: OnboardingAnswers;
  investorAnswers?: InvestorAnswers;
  profileForm?: OnboardingProfileFormSnapshot;
  fundingRounds?: ClaimFundingRound[];
  rawBenchmarkInputs?: RawBenchmarkInputs;
  setupIncomplete?: boolean;
};

export function emptyOnboardingAnswers(): OnboardingAnswers {
  return {
    productStage: "",
    productType: "",
    productChallenge: "",
    salesMotion: "",
    funnelBreakdown: "",
    icpClarity: "",
    revenueTracking: "",
    runway: "",
    financeManagement: "",
    capitalPriority: "",
  };
}

export function emptyInvestorAnswers(): InvestorAnswers {
  return {
    stages: [],
    sectors: [],
    checkSize: "",
    geography: "",
    pipeline: "",
  };
}
