"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { OnboardCard, OnboardBody, OnboardHeading } from "../layout";
import { OnboardingChatView } from "./OnboardingChatView";
import {
  OnboardingClaimError,
  OnboardingClaimingOverlay,
} from "./OnboardingClaimStatus";
import { useOnboardClaim } from "./useOnboardClaim";
import { useOnboardingChat } from "./useOnboardingChat";
import type { OnboardCta, OnboardingUserData } from "./types";
import type { OnboardStreamError } from "@/lib/onboard/stream-client";
import { SIGNAL, onAccentText } from "@/lib/theme";

export type { OnboardCta } from "./types";

export interface OnboardingExperienceProps {
  email: string;
  cta: OnboardCta;
}

function EnrichmentErrorScreen({
  email,
  error,
}: {
  email: string;
  error: OnboardStreamError;
}) {
  if (error.kind === "blocked_provider") {
    return (
      <OnboardCard>
        <OnboardHeading eyebrow="Sign-up paused">
          Use your work email so your numbers count.
        </OnboardHeading>
        <OnboardBody>
          You signed in as <strong>{email}</strong>. Personal webmail addresses
          can&apos;t verify a company domain — sign back in with your work email to continue.
        </OnboardBody>
      </OnboardCard>
    );
  }
  if (error.kind === "already_has_account") {
    return (
      <OnboardCard>
        <OnboardHeading eyebrow="Welcome back">
          You already have a Fuel account.
        </OnboardHeading>
        <OnboardBody>
          <p>
            We found an existing membership for <strong>{email}</strong>.
            Continue to your workspace.
          </p>
          <Link
            href="/dashboard"
            style={{
              marginTop: 16,
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 8,
              background: SIGNAL.accent,
              color: onAccentText(),
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to my workspace
          </Link>
        </OnboardBody>
      </OnboardCard>
    );
  }
  return null;
}

export function OnboardingExperience({ email, cta }: OnboardingExperienceProps) {
  const [userData, setUserData] = useState<OnboardingUserData | null>(null);
  const [enrichmentError, setEnrichmentError] = useState<OnboardStreamError | null>(null);
  const { claiming, claimingCta, claimError, finishOnboarding, exploreLater, clearError } =
    useOnboardClaim(cta);

  const handleChatComplete = useCallback(
    (data: OnboardingUserData) => {
      setUserData(data);
      void finishOnboarding(data);
    },
    [finishOnboarding],
  );

  const flow = useOnboardingChat(email, handleChatComplete, setEnrichmentError);

  const handleManual = useCallback(() => {
    void exploreLater(userData ?? flow.userData);
  }, [exploreLater, flow.userData, userData]);

  if (enrichmentError?.kind === "blocked_provider" || enrichmentError?.kind === "already_has_account") {
    return <EnrichmentErrorScreen email={email} error={enrichmentError} />;
  }

  if (claimError) {
    return (
      <OnboardingClaimError
        error={claimError}
        onRetry={() => {
          clearError();
          void finishOnboarding(userData ?? flow.userData);
        }}
      />
    );
  }

  if (claiming && claimingCta) {
    const data = userData ?? flow.userData;
    return (
      <OnboardingClaimingOverlay
        cta={claimingCta}
        isYorkClient={data.isYorkClient}
        companyName={data.companyName || undefined}
      />
    );
  }

  return <OnboardingChatView flow={flow} onManual={handleManual} />;
}
