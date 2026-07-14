import { useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";

type View = "onboarding" | "integrations" | "workspace";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);

  if (view === "workspace") {
    const isInvestor = isInvestorPersona(onboardingAnswers);
    return (
      <PatriotPayJourney
        initialPage={isInvestor ? "investor-home" : "overview-building"}
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
        setOnboardingBenchmark(answersToOnboardingBenchmark(answers));
        setOnboardingAnswers(answers);
        setView("workspace");
      }}
    />
  );
}