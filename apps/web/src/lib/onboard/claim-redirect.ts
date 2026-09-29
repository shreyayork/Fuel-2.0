import type { OnboardingFlowType } from "@/lib/onboard/onboarding-answers";

export type OnboardClaimCta = "benchmark" | "pitch-deck" | "explore";

export function resolveOnboardClaimRedirect(opts: {
  flowType: OnboardingFlowType;
  cta: OnboardClaimCta;
  companyUuid: string;
  cohortKey?: string | null;
  /** Operating overview only — open the profile-completion dialog after Set up later. */
  setupIncomplete?: boolean;
}): string {
  const cohortParam = opts.cohortKey?.trim();

  if (opts.flowType === "investor") {
    return `/portfolio?${new URLSearchParams({
      first: "1",
      tour: "prompt",
      ...(cohortParam ? { cohort: cohortParam } : {}),
    }).toString()}`;
  }

  if (opts.cta === "benchmark") {
    return `/company/${opts.companyUuid}?${new URLSearchParams({
      tab: "intelligence",
      first: "1",
      tour: "prompt",
      ...(cohortParam ? { cohort: cohortParam } : {}),
    }).toString()}`;
  }

  return `/company/${opts.companyUuid}?${new URLSearchParams({
    tab: "overview",
    cta: opts.cta,
    first: "1",
    tour: "prompt",
    ...(opts.setupIncomplete ? { profilePrompt: "1" } : {}),
    ...(cohortParam ? { cohort: cohortParam } : {}),
  }).toString()}`;
}
