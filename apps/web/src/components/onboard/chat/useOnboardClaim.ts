"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { hasAnyBenchmarkInput } from "@/lib/onboard/benchmark-fields";
import { domainFromEmail } from "@/lib/onboard/company-from-email";
import { signalsLoadingMinDwellMs } from "./OnboardingClaimStatus";
import type { WizardClaimPayload } from "@/lib/onboard/onboarding-answers";
import { buildClaimProfileFromUserData } from "./map-profile";
import type { OnboardCta, OnboardingUserData } from "./types";

function minLoadingDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postClaim(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/onboard/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useOnboardClaim(cta: OnboardCta) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [claimingCta, setClaimingCta] = useState<OnboardCta | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const claimingRef = useRef(false);

  const finishOnboarding = useCallback(
    async (
      data: OnboardingUserData,
      opts?: { ctaOverride?: OnboardCta; wizardPayload?: WizardClaimPayload },
    ) => {
      // State updates are asynchronous; the ref closes the same-tick window in
      // which a double click could otherwise issue two claim requests.
      if (claimingRef.current) return;
      claimingRef.current = true;

      const domain = data.verifiedDomain || domainFromEmail(data.email);
      const profile = opts?.wizardPayload?.profile ?? buildClaimProfileFromUserData(data, domain);
      const effectiveCta = opts?.ctaOverride ?? cta;

      setClaiming(true);
      setClaimingCta(effectiveCta);
      setClaimError(null);

      const metrics =
        opts?.wizardPayload?.metrics ??
        (data.benchmarkInputs && hasAnyBenchmarkInput(data.benchmarkInputs)
          ? {
              arrUsd: data.benchmarkInputs.arrUsd,
              arrGrowthYoyPct: data.benchmarkInputs.arrGrowthYoyPct,
              nrrPct: data.benchmarkInputs.nrrPct,
              logoRetentionPct: data.benchmarkInputs.logoRetentionPct,
              monthlyBurnUsd: data.benchmarkInputs.monthlyBurnUsd,
              cashOnHandUsd: data.benchmarkInputs.cashOnHandUsd,
              grossMarginPct: data.benchmarkInputs.grossMarginPct,
              fteCount: data.benchmarkInputs.fteCount,
              paidCustomerCount: data.benchmarkInputs.paidCustomerCount,
              notableCustomers: data.benchmarkInputs.notableCustomers,
              challenges: data.benchmarkInputs.challenges,
            }
          : null);

      const claimBody: Record<string, unknown> = {
        cta: effectiveCta,
        profile,
        metrics,
        cohortKey: opts?.wizardPayload?.cohortKey ?? data.cohortKey,
      };
      const wp = opts?.wizardPayload;
      if (wp?.enrichmentRunId) claimBody.enrichmentRunId = wp.enrichmentRunId;
      if (wp?.flowType) claimBody.flowType = wp.flowType;
      if (wp?.answers) claimBody.answers = wp.answers;
      if (wp?.investorAnswers) claimBody.investorAnswers = wp.investorAnswers;
      if (wp?.profileForm) claimBody.profileForm = wp.profileForm;
      if (wp?.fundingRounds) claimBody.fundingRounds = wp.fundingRounds;
      if (wp?.rawBenchmarkInputs) claimBody.rawBenchmarkInputs = wp.rawBenchmarkInputs;
      if (wp?.setupIncomplete) claimBody.setupIncomplete = true;

      const minDwell = minLoadingDelay(signalsLoadingMinDwellMs(data.isYorkClient));

      try {
        const [res] = await Promise.all([postClaim(claimBody), minDwell]);
        const body = (await res.json()) as {
          redirect?: string;
          error?: string;
          detail?: string;
        };
        if (!res.ok) {
          if (body.error === "already_has_account") {
            router.push("/");
            return;
          }
          const msg = body.detail
            ? `${body.error ?? "claim_failed"}: ${body.detail}`
            : (body.error ?? "claim_failed");
          setClaimError(msg);
          claimingRef.current = false;
          setClaiming(false);
          setClaimingCta(null);
          return;
        }
        if (body.redirect) {
          router.push(body.redirect);
          return;
        }
        router.push("/");
      } catch {
        setClaimError("network_error");
        claimingRef.current = false;
        setClaiming(false);
        setClaimingCta(null);
      }
    },
    [cta, router],
  );

  const exploreLater = useCallback(
    async (data: OnboardingUserData, opts?: { wizardPayload?: WizardClaimPayload }) => {
      await finishOnboarding(data, {
        ctaOverride: "explore",
        wizardPayload: opts?.wizardPayload,
      });
    },
    [finishOnboarding],
  );

  const clearError = useCallback(() => setClaimError(null), []);

  return { claiming, claimingCta, claimError, finishOnboarding, exploreLater, clearError };
}
