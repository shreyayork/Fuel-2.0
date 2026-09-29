"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardCard, OnboardBody, OnboardHeading } from "../layout";
import { onboardPrimaryButton } from "../styles";
import { SIGNAL } from "@/lib/theme";
import type { OnboardCta } from "./types";

export const SIGNALS_LOADING_STEP_INTERVAL_MS = 550;

export function signalsLoadingStepCount(isYorkClient: boolean): number {
  // +1 for Fuel 1.0 watchlist fetch step (always shown on claim overlay).
  return (isYorkClient ? 4 : 3) + 1;
}

export function signalsLoadingMinDwellMs(isYorkClient: boolean): number {
  return signalsLoadingStepCount(isYorkClient) * SIGNALS_LOADING_STEP_INTERVAL_MS;
}

const LEGACY_WATCHLISTS_STEP =
  "We're automatically fetching your watchlists from Fuel 1.0…";

const SIGNALS_STEPS_BASE = [
  "Company profile prepared",
  "Benchmark range identified",
  "Signal timeline generated",
] as const;

const SIGNALS_YORK_STEP = "York IE project context applied";

const WORKSPACE_STEPS_BASE = [
  "Workspace created",
  "Company snapshot loaded",
  "Overview ready",
] as const;

const WORKSPACE_YORK_STEP = "York IE context linked";

function buildSignalsSteps(isYorkClient: boolean): string[] {
  const base = !isYorkClient
    ? [...SIGNALS_STEPS_BASE]
    : [SIGNALS_STEPS_BASE[0], SIGNALS_STEPS_BASE[1], SIGNALS_YORK_STEP, SIGNALS_STEPS_BASE[2]];
  return [...base, LEGACY_WATCHLISTS_STEP];
}

function buildWorkspaceSteps(isYorkClient: boolean): string[] {
  const base = !isYorkClient
    ? [...WORKSPACE_STEPS_BASE]
    : [WORKSPACE_STEPS_BASE[0], WORKSPACE_STEPS_BASE[1], WORKSPACE_YORK_STEP, WORKSPACE_STEPS_BASE[2]];
  return [...base, LEGACY_WATCHLISTS_STEP];
}

function claimOverlayCopy(
  cta: OnboardCta,
  isYorkClient: boolean,
  companyName?: string,
): { eyebrow: string; title: string; explanation: string; steps: string[] } {
  const possessive = companyName ? `${companyName}'s` : "your";
  const companyRef = companyName ?? "your company";

  if (cta === "benchmark") {
    return {
      eyebrow: "Generating signals",
      title: "Generating your signals based on your profile.",
      explanation: isYorkClient
        ? `Fuel is combining your company profile, benchmark cohort, and York IE project context to prepare ${possessive} first signal view.`
        : `Fuel is combining your company profile and benchmark cohort to prepare ${possessive} first signal view.`,
      steps: buildSignalsSteps(isYorkClient),
    };
  }

  if (cta === "pitch-deck") {
    return {
      eyebrow: "Preparing workspace",
      title: "Setting up your company workspace.",
      explanation: `Fuel is claiming ${companyRef}'s workspace and loading what we already know so you can run your first playbook.`,
      steps: buildWorkspaceSteps(isYorkClient),
    };
  }

  return {
    eyebrow: "Preparing your workspace",
    title: "Building Overview, Intelligence, and Initiatives",
    explanation: isYorkClient
      ? `Fuel combines your onboarding and profile. You'll land on Overview while Fuel builds scores and intelligence — a quick tour will be ready when it's done.`
      : `Fuel combines your onboarding and profile. You'll land on Overview while Fuel builds scores and intelligence — take a quick tour when it's ready.`,
    steps: [
      "Reading your onboarding",
      "Scoring R&D, GTM, and G&A tracks",
      "Drafting intelligence",
      "Preparing initiative suggestions",
      ...(isYorkClient ? ["York IE context linked"] : []),
      LEGACY_WATCHLISTS_STEP,
    ],
  };
}

export function OnboardingClaimingOverlay({
  cta,
  isYorkClient,
  companyName,
}: {
  cta: OnboardCta;
  isYorkClient: boolean;
  companyName?: string;
}) {
  const copy = useMemo(
    () => claimOverlayCopy(cta, isYorkClient, companyName),
    [cta, companyName, isYorkClient],
  );
  const [completedIndex, setCompletedIndex] = useState(-1);

  useEffect(() => {
    setCompletedIndex(-1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    copy.steps.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setCompletedIndex(i);
        }, (i + 1) * SIGNALS_LOADING_STEP_INTERVAL_MS),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [copy.steps]);

  return (
    <div
      className="fuel-signals-loading-page"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        background: SIGNAL.shell,
        color: SIGNAL.ink,
        fontFamily: SIGNAL.sans,
      }}
    >
      <div className="fuel-signals-loading-card">
        <div className="fuel-signals-loading-orb" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="fuel-signals-loading-eyebrow">{copy.eyebrow}</span>
        <h2 className="fuel-signals-loading-title">{copy.title}</h2>
        <p className="fuel-signals-loading-explanation">{copy.explanation}</p>
        <div className="fuel-signals-loading-steps">
          {copy.steps.map((label, i) => {
            const done = i <= completedIndex;
            return (
              <div
                key={label}
                className={`fuel-signals-loading-step${done ? " fuel-signals-loading-step--done" : ""}`}
              >
                <i aria-hidden>{done ? "✓" : "○"}</i>
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function OnboardingClaimError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <OnboardCard style={{ maxWidth: 480, margin: "48px auto" }}>
      <OnboardHeading eyebrow="Setup">Something went wrong</OnboardHeading>
      <OnboardBody>
        <p>We couldn&apos;t finish creating your workspace ({error}).</p>
        <div style={{ marginTop: 24 }}>
          <button type="button" onClick={onRetry} style={onboardPrimaryButton()}>
            Try again
          </button>
        </div>
      </OnboardBody>
    </OnboardCard>
  );
}
