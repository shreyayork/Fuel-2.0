import { useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  isOnboardingBenchmarkComplete,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";
import { resetAndAwardOnboardingCredits } from "./profileCredits.ts";
import { completedOnboardingModules } from "./trackQuestions.ts";
import {
  clearStoredDetailAnswers,
  resetProfileCompletionPromptForNewLogin,
} from "./profileCompletionPromptStorage.ts";

type View = "onboarding" | "integrations" | "workspace";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);

  if (view === "workspace") {
    const isInvestor = isInvestorPersona(onboardingAnswers);
    return (
      <PatriotPayJourney
        initialPage={isInvestor ? "investor-portfolios" : "overview-building"}
        initialBenchmark={onboardingBenchmark}
        initialOnboardingAnswers={onboardingAnswers}
        persona={isInvestor ? "investor" : "founder"}
      />
    );
  }
  if (view === "integrations") {
    return (
      <IntegrationSetupPage
        onComplete={() => setView("workspace")}
      />
    );
  }
  return (
    <OnboardingFlow
      onComplete={answers => {
        clearStoredDetailAnswers(answers.profileCompany, "Patriot Pay", "patriotpay");
        setOnboardingBenchmark(answersToOnboardingBenchmark(answers));
        setOnboardingAnswers(answers);
        resetAndAwardOnboardingCredits(
          completedOnboardingModules(answers),
          isOnboardingBenchmarkComplete(answers),
          "patriotpay",
        );
        resetProfileCompletionPromptForNewLogin("patriotpay");
        setView("workspace");
      }}
    />
  );
}