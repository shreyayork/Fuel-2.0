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
import DesignSystemPage from "./design-system/DesignSystemPage.tsx";
import { applyFuelTheme, readFuelTheme } from "./fuelTheme";
import {
  isBrowserReload,
  loadWorkspaceSession,
  saveWorkspaceSession,
} from "./workspaceSession";
import "./PatriotPayJourney.css";
import "./responsive.css";

type View = "onboarding" | "integrations" | "workspace";

function isDesignSystemPreview(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("design-system");
}

export default function App() {
  const restoredSession = loadWorkspaceSession();
  const [view, setView] = useState<View>(() => (restoredSession ? "workspace" : "onboarding"));
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(
    () => restoredSession?.onboardingBenchmark ?? null,
  );
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(
    () => restoredSession?.onboardingAnswers ?? null,
  );
  const [showDesignSystem, setShowDesignSystem] = useState(isDesignSystemPreview);

  useEffect(() => {
    applyFuelTheme(readFuelTheme());
  }, []);

  useEffect(() => {
    if (view !== "workspace" || !onboardingAnswers || !onboardingBenchmark) return;
    saveWorkspaceSession({ onboardingAnswers, onboardingBenchmark });
  }, [view, onboardingAnswers, onboardingBenchmark]);

  if (showDesignSystem) {
    return <DesignSystemPage onClose={() => setShowDesignSystem(false)} />;
  }
  if (view === "workspace") {
    const isInvestor = isInvestorPersona(onboardingAnswers);
    const resumeWorkspace = Boolean(restoredSession) || isBrowserReload();
    return (
      <PatriotPayJourney
        initialPage={isInvestor ? "investor-portfolios" : resumeWorkspace ? "scorecard-v2" : "overview-building"}
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
        const benchmark = answersToOnboardingBenchmark(answers);
        setOnboardingBenchmark(benchmark);
        setOnboardingAnswers(answers);
        saveEarnedProfileCredits(EMPTY_EARNED_PROFILE_CREDITS, "patriotpay");
        saveWorkspaceSession({ onboardingAnswers: answers, onboardingBenchmark: benchmark });
        setView("workspace");
      }}
    />
  );
}