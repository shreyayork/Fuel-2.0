import { useMemo, useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  isOnboardingBenchmarkComplete,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";
import { requestPortfolioBuild } from "./investor/InvestorDashboard.tsx";
import { resetAndAwardOnboardingCredits } from "./profileCredits.ts";
import { completedOnboardingModules, emptyOnboardingTrackAnswers } from "./trackQuestions.ts";
import {
  clearStoredDetailAnswers,
  resetProfileCompletionPromptForNewLogin,
} from "./profileCompletionPromptStorage.ts";

type View = "onboarding" | "integrations" | "workspace";

function wantsInvestorDemo(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("persona") === "investor";
  } catch {
    return false;
  }
}

function demoInvestorAnswers(): OnboardingFlowAnswers {
  return {
    ...emptyOnboardingTrackAnswers(),
    profileCompany: "York IE",
    profileBusinessModel: "Investment firm",
    profileIndustry: "Venture · Value Creation",
    profileFounded: "2016",
    profileCity: "Boston",
    profileStateRegion: "MA",
    profileCountry: "United States",
    profileWebsite: "https://yorkiegrowth.io",
    profileLinkedin: "https://linkedin.com/company/york-ie",
    profileAdditionalContext: "",
    profileProductDescription: "",
    profileApproxHeadcount: "",
    profileFundingRounds: "",
    profileSetupComplete: true,
    arr: "",
    arrGrowth: "",
    nrr: "",
    logoRetention: "",
    grossMargin: "",
    cacPayback: "",
    burnMultiple: "",
    ruleOf40: "",
    monthlyBurn: "",
    cashOnHand: "",
    headcount: "",
    payingCustomers: "",
    investCheckSize: "$1–3M",
    investGeography: ["United States"],
    investPipeline: "Other",
    hubspotConnected: false,
  };
}

export default function App() {
  const demoInvestor = useMemo(() => wantsInvestorDemo(), []);
  const [view, setView] = useState<View>(() => (demoInvestor ? "workspace" : "onboarding"));
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(() => (
    demoInvestor ? answersToOnboardingBenchmark(demoInvestorAnswers()) : null
  ));
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(() => (
    demoInvestor ? demoInvestorAnswers() : null
  ));

  if (view === "workspace") {
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
