import { useEffect, useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import { EMPTY_EARNED_PROFILE_CREDITS, saveEarnedProfileCredits } from "./profileCredits.ts";
// Short onboarding lands in workspace with analytics locked until profile completion.
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";
import { applyFuelTheme, readFuelTheme } from "./fuelTheme";
import "./PatriotPayJourney.css";
import "./responsive.css";

type View = "onboarding" | "integrations" | "workspace";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);

  useEffect(() => {
    applyFuelTheme(readFuelTheme());
  }, []);

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
        setOnboardingBenchmark(answersToOnboardingBenchmark(answers));
        setOnboardingAnswers(answers);
        saveEarnedProfileCredits(EMPTY_EARNED_PROFILE_CREDITS, "patriotpay");
        setView("workspace");
      }}
    />
  );
}