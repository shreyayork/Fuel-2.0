import { useMemo, useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  isOnboardingBenchmarkComplete,
  type FuelEntryPersona,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import LandingPage from "./LandingPage.tsx";
import { requestPortfolioBuild } from "./investor/InvestorDashboard.tsx";
import { resetAndAwardOnboardingCredits } from "./profileCredits.ts";
import { completedOnboardingModules } from "./trackQuestions.ts";
import {
  clearStoredDetailAnswers,
  resetProfileCompletionPromptForNewLogin,
} from "./profileCompletionPromptStorage.ts";

type EntryPhase = "landing" | "onboarding" | "workspace";

/**
 * Single product entry: landing → onboarding → workspace.
 * `?persona=investor` seeds OnboardingFlow (York IE / Investment firm).
 */
function readEntryPersona(): FuelEntryPersona {
  if (typeof window === "undefined") return "founder";
  try {
    return new URLSearchParams(window.location.search).get("persona") === "investor"
      ? "investor"
      : "founder";
  } catch {
    return "founder";
  }
}

export default function FuelEntry() {
  const entryPersona = useMemo(() => readEntryPersona(), []);
  const [phase, setPhase] = useState<EntryPhase>("landing");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);

  if (phase === "workspace" && onboardingAnswers) {
    const isInvestor = isInvestorPersona(onboardingAnswers);
    return (
      <PatriotPayJourney
        initialPage={isInvestor ? "investor-watchlists" : "overview-building"}
        initialBenchmark={onboardingBenchmark}
        initialOnboardingAnswers={onboardingAnswers}
        persona={isInvestor ? "investor" : "founder"}
      />
    );
  }

  if (phase === "onboarding") {
    return (
      <OnboardingFlow
        entryPersona={entryPersona}
        onComplete={answers => {
          clearStoredDetailAnswers(answers.profileCompany, "Patriot Pay", "patriotpay");
          requestPortfolioBuild(answers.profileCompany || "Your fund");
          setOnboardingBenchmark(answersToOnboardingBenchmark(answers));
          setOnboardingAnswers(answers);
          resetAndAwardOnboardingCredits(
            completedOnboardingModules(answers),
            isOnboardingBenchmarkComplete(answers),
            "patriotpay",
          );
          resetProfileCompletionPromptForNewLogin("patriotpay");
          setPhase("workspace");
        }}
      />
    );
  }

  return <LandingPage onSignIn={() => setPhase("onboarding")} />;
}
