import { useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";

type View = "onboarding" | "integrations" | "workspace";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);

  if (view === "workspace") {
    return (
      <PatriotPayJourney
        initialPage="scorecard-v2"
        initialBenchmark={onboardingBenchmark}
        initialOnboardingAnswers={onboardingAnswers}
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