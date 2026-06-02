import { useState } from "react";
import PatriotPayJourney from "./PatriotPayJourney.tsx";
import FuelOnboardingChat from "./FuelOnboardingChat.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";

type View = "onboarding" | "integrations" | "journey" | "signals" | "tour";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  if (view === "journey") return <PatriotPayJourney />;
  if (view === "signals") return <PatriotPayJourney initialPage="signals-loading-tour" />;
  if (view === "tour") return <PatriotPayJourney initialPage="guided-tour" />;
  if (view === "integrations")
    return (
      <IntegrationSetupPage
        onComplete={() => setView("journey")}
      />
    );
  return (
    <FuelOnboardingChat
      onComplete={() => setView("signals")}
      onManual={() => setView("tour")}
    />
  );
}