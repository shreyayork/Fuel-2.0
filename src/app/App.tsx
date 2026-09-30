import { useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  isOnboardingBenchmarkComplete,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";
import FuelLanding from "./marketing/FuelLanding.tsx";
import FuelSignIn from "./marketing/FuelSignIn.tsx";
import { FuelLegalPage } from "./legal/FuelLegalPage.tsx";
import { LegalNavProvider } from "./legal/LegalNavContext.tsx";
import type { LegalDocId } from "./legal/legalContent.ts";
import { requestPortfolioBuild } from "./investor/InvestorDashboard.tsx";
import { resetAndAwardOnboardingCredits } from "./profileCredits.ts";
import { completedOnboardingModules } from "./trackQuestions.ts";
import {
  clearStoredDetailAnswers,
  resetProfileCompletionPromptForNewLogin,
} from "./profileCompletionPromptStorage.ts";

type View = "landing" | "signin" | "onboarding" | "integrations" | "workspace" | "legal";

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [legalDoc, setLegalDoc] = useState<LegalDocId>("terms");
  const [legalReturnView, setLegalReturnView] = useState<View>("landing");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);

  function openLegal(doc: LegalDocId, returnTo: View) {
    setLegalDoc(doc);
    setLegalReturnView(returnTo);
    setView("legal");
  }

  if (view === "legal") {
    return (
      <LegalNavProvider openLegal={doc => openLegal(doc, legalReturnView)}>
        <FuelLegalPage
          variant="marketing"
          doc={legalDoc}
          onDocChange={setLegalDoc}
          onBack={() => setView(legalReturnView)}
          onSignIn={() => setView("signin")}
          onGetStarted={() => setView("signin")}
          onOpenLegal={doc => openLegal(doc, legalReturnView)}
          onFaq={() => {
            setView("landing");
            window.setTimeout(() => {
              document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
            }, 80);
          }}
        />
      </LegalNavProvider>
    );
  }

  if (view === "landing") {
    return (
      <LegalNavProvider openLegal={doc => openLegal(doc, "landing")}>
        <FuelLanding
          onSignIn={() => setView("signin")}
          onGetStarted={() => setView("signin")}
          onOpenLegal={doc => openLegal(doc, "landing")}
        />
      </LegalNavProvider>
    );
  }

  if (view === "signin") {
    return (
      <LegalNavProvider openLegal={doc => openLegal(doc, "signin")}>
        <FuelSignIn
          onBack={() => setView("landing")}
          onSignedIn={() => setView("onboarding")}
          onOpenLegal={doc => openLegal(doc, "signin")}
        />
      </LegalNavProvider>
    );
  }

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
        requestPortfolioBuild(answers.profileCompany || "Your fund");
        setOnboardingBenchmark(answersToOnboardingBenchmark(answers));
        setOnboardingAnswers(answers);
        const isInvestor = isInvestorPersona(answers);
        if (!isInvestor) {
          resetAndAwardOnboardingCredits(
            completedOnboardingModules(answers),
            isOnboardingBenchmarkComplete(answers),
            "patriotpay",
          );
        }
        resetProfileCompletionPromptForNewLogin("patriotpay");
        setView("workspace");
      }}
    />
  );
}
