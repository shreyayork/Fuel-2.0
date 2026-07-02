import { useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, { answersToOnboardingBenchmark } from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";

type View = "onboarding" | "integrations" | "workspace";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);

  if (view === "workspace") {
    return (
      <PatriotPayJourney
        initialPage="scorecard-v2"
        initialBenchmark={onboardingBenchmark}
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
        setView("workspace");
      }}
    />
  );
}