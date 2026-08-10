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
import { SignedOutScreen } from "./SignedOutScreen.tsx";
import { applyFuelTheme, readFuelTheme } from "./fuelTheme";
import { resetProfileCompletionPromptForNewLogin } from "./profileCompletionPromptStorage";
import {
  clearSignedOut,
  clearStaleReloadLandingFlag,
  isSignedOut,
  loadActivePage,
  loadWorkspaceSession,
  markSignedOut,
  saveWorkspaceSession,
} from "./workspaceSession";
import "./PatriotPayJourney.css";
import "./responsive.css";
import "../styles/drawer-layout.css";
import "./signedOutScreen.css";

type View = "onboarding" | "integrations" | "workspace" | "signed-out";

function isDesignSystemPreview(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("design-system");
}

function resolveInitialView(): View {
  if (loadWorkspaceSession()) return "workspace";
  if (isSignedOut()) return "signed-out";
  return "onboarding";
}

export default function App() {
  const restoredSession = loadWorkspaceSession();
  const [view, setView] = useState<View>(resolveInitialView);
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(
    () => restoredSession?.onboardingBenchmark ?? null,
  );
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(
    () => restoredSession?.onboardingAnswers ?? null,
  );
  const [showDesignSystem, setShowDesignSystem] = useState(isDesignSystemPreview);

  useEffect(() => {
    applyFuelTheme(readFuelTheme());
    clearStaleReloadLandingFlag();
  }, []);

  useEffect(() => {
    if (view !== "workspace" || !onboardingAnswers || !onboardingBenchmark) return;
    saveWorkspaceSession({ onboardingAnswers, onboardingBenchmark });
  }, [view, onboardingAnswers, onboardingBenchmark]);

  const handleLogout = () => {
    markSignedOut();
    setOnboardingBenchmark(null);
    setOnboardingAnswers(null);
    setView("signed-out");
  };

  const handleSignIn = () => {
    clearSignedOut();
    setView("onboarding");
  };

  if (showDesignSystem) {
    return <DesignSystemPage onClose={() => setShowDesignSystem(false)} />;
  }
  if (view === "signed-out") {
    return <SignedOutScreen onSignIn={handleSignIn} />;
  }
  if (view === "workspace") {
    const isInvestor = isInvestorPersona(onboardingAnswers);
    const persona = isInvestor ? "investor" : "founder";
    const restoredPage = loadActivePage(persona);
    const defaultPage = isInvestor ? "investor-portfolios" : "scorecard-v2";
    return (
      <PatriotPayJourney
        initialPage={restoredPage ?? defaultPage}
        initialBenchmark={onboardingBenchmark}
        initialOnboardingAnswers={onboardingAnswers}
        persona={persona}
        onLogout={handleLogout}
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
        resetProfileCompletionPromptForNewLogin("patriotpay");
        clearSignedOut();
        saveWorkspaceSession({ onboardingAnswers: answers, onboardingBenchmark: benchmark });
        setView("workspace");
      }}
    />
  );
}
