import { useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import FuelOnboardingChat, { type OnboardingBenchmarkValues } from "./FuelOnboardingChat.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";

type View = "onboarding" | "integrations" | "journey" | "signals" | "tour" | "overview";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);

  if (view === "journey") return <PatriotPayJourney />;
  if (view === "overview") {
    return (
      <PatriotPayJourney
        initialPage="overview-loading"
        initialBenchmark={onboardingBenchmark}
      />
    );
  }
  if (view === "signals") {
    return (
      <PatriotPayJourney
        initialPage="signals-loading-tour"
        initialBenchmark={onboardingBenchmark}
      />
    );
  }
  if (view === "tour") return <PatriotPayJourney initialPage="guided-tour" />;
  if (view === "integrations")
    return (
      <IntegrationSetupPage
        onComplete={() => setView("journey")}
      />
    );
  return (
    <FuelOnboardingChat
      onComplete={(benchmark: OnboardingBenchmarkValues | null) => {
        setOnboardingBenchmark(benchmark);
        setView("overview");
      }}
      onManual={() => setView("tour")}
    />
  );
}