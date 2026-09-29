/**
 * Investor onboarding step matrix — HubSpot appended only when pipeline = HubSpot.
 * Pure helpers for tests + OnboardingFlow.
 */

export const INVESTOR_BASE_STEPS = ["profile", "investment"] as const;

export type InvestorStepId = "profile" | "investment" | "hubspot";

export function resolveInvestorSteps(investPipeline: string): InvestorStepId[] {
  const base: InvestorStepId[] = [...INVESTOR_BASE_STEPS];
  if (investPipeline.trim() === "HubSpot") {
    base.push("hubspot");
  }
  return base;
}

export function investorCtaLabel(opts: {
  isLastVisibleStep: boolean;
}): "Continue" | "Start my journey" {
  return opts.isLastVisibleStep ? "Start my journey" : "Continue";
}

/** HubSpot hint only when HubSpot is the selected pipeline answer. */
export function showHubSpotPipelineHint(investPipeline: string): boolean {
  return investPipeline.trim() === "HubSpot";
}
