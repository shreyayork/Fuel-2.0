"use client";

import { useCallback, useEffect, useState } from "react";
import { checkIsYorkClient } from "@/lib/onboard/york-client";
import { fetchCompanyHintBundle } from "@/lib/onboard/company-hint-client";
import type { CompanyHintBundle } from "@/lib/onboard/map-company-hit";
import type { OnboardCompanyOption } from "@/lib/onboard/map-company-hit";
import type { OnboardCta, OnboardingUserData } from "@/components/onboard/chat/types";
import {
  OnboardingClaimError,
  OnboardingClaimingOverlay,
} from "@/components/onboard/chat/OnboardingClaimStatus";
import { useOnboardClaim } from "@/components/onboard/chat/useOnboardClaim";
import { onboardV2LoadingScreen } from "@/components/onboard/styles";
import OnboardingFlow, { type OnboardingFlowCompletePayload } from "./OnboardingFlow";
import {
  isInvestorFlowPayload,
  mapFlowAnswersToOnboardingAnswers,
  mapFlowBenchmarkMetrics,
  mapFlowFundingRounds,
  mapFlowInvestorAnswers,
  mapFlowPayloadToClaimProfile,
  mapFlowProfileFormSnapshot,
  mapFlowRawBenchmarkInputs,
  mapFlowType,
} from "./map-onboarding-flow-claim";

export function OnboardingFlowExperience({
  email,
  cta,
  domain,
  initialCompanyBundle,
  designPreview = false,
}: {
  email: string;
  cta: OnboardCta;
  domain: string;
  initialCompanyBundle?: CompanyHintBundle;
  /** Local design folder — skip long claim dwell / enrichment waits. */
  designPreview?: boolean;
}) {
  const isYorkClient = checkIsYorkClient(email);
  const { claiming, claimingCta, claimError, finishOnboarding, clearError } =
    useOnboardClaim(cta, { designPreview });
  const [companyCandidates, setCompanyCandidates] = useState<OnboardCompanyOption[]>(
    initialCompanyBundle?.candidates ?? [],
  );
  const [companyHintName, setCompanyHintName] = useState<string | null>(
    initialCompanyBundle?.hint.name ?? null,
  );
  const [hintLoading, setHintLoading] = useState(!initialCompanyBundle);

  useEffect(() => {
    if (initialCompanyBundle) return;
    let cancelled = false;
    void (async () => {
      const bundle = await fetchCompanyHintBundle();
      if (cancelled) return;
      setCompanyCandidates(bundle?.candidates ?? []);
      setCompanyHintName(bundle?.hint.name ?? null);
      setHintLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCompanyBundle]);

  const buildUserData = useCallback(
    (payload: OnboardingFlowCompletePayload): OnboardingUserData => ({
      email,
      isYorkClient,
      companyName: payload.profileForm.company,
      teamSize: "",
      domain,
      verifiedDomain: domain,
      businessModel: null,
      profileNotes: payload.profileForm.additionalContext,
      linkedinUrl: payload.profileForm.linkedin,
      fundingRounds: payload.fundingRounds.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        date: r.date,
        investors: r.investors,
      })),
      locationCity: payload.profileForm.city,
      locationState: payload.profileForm.stateRegion,
      locationCountry: payload.profileForm.country,
      crunchbaseData: null,
      enrichment: null,
      extracted: null,
      fieldSources: {},
      fieldConfidence: {},
      benchmarkHints: null,
      confirmedProfile: null,
      benchmarkInputs: null,
      cohortKey: payload.cohortKey,
      cohortSampleSize: null,
      cohortBenchmarkRows: [],
      cohortInferred: null,
      allCohorts: [],
    }),
    [domain, email, isYorkClient],
  );

  const handleComplete = useCallback(
    (payload: OnboardingFlowCompletePayload) => {
      const isInvestor = isInvestorFlowPayload(payload);
      const profile = mapFlowPayloadToClaimProfile(payload, domain);
      const metrics = mapFlowBenchmarkMetrics(payload);
      void finishOnboarding(buildUserData(payload), {
        ctaOverride: "explore",
        wizardPayload: {
          profile,
          enrichmentRunId: payload.enrichmentRunId,
          metrics,
          cohortKey: payload.cohortKey,
          flowType: mapFlowType(payload),
          profileForm: mapFlowProfileFormSnapshot(payload),
          fundingRounds: mapFlowFundingRounds(payload),
          rawBenchmarkInputs: isInvestor ? undefined : mapFlowRawBenchmarkInputs(payload),
          setupIncomplete: payload.setupIncomplete,
          ...(isInvestor
            ? { investorAnswers: mapFlowInvestorAnswers(payload) }
            : { answers: mapFlowAnswersToOnboardingAnswers(payload) }),
        },
      });
    },
    [buildUserData, domain, finishOnboarding],
  );

  if (claimError) {
    return (
      <OnboardingClaimError
        error={claimError}
        onRetry={() => clearError()}
      />
    );
  }

  if (claiming && claimingCta) {
    return (
      <OnboardingClaimingOverlay
        cta={claimingCta}
        isYorkClient={isYorkClient}
        companyName={undefined}
      />
    );
  }

  if (hintLoading) {
    return <div style={onboardV2LoadingScreen()}>Loading company…</div>;
  }

  return (
    <OnboardingFlow
      onComplete={handleComplete}
      initialCompanyCandidates={companyCandidates}
      emailDomain={domain}
      initialCompanyHintName={companyHintName}
    />
  );
}
