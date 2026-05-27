import { useState } from "react";
import PatriotPayJourney from "./PatriotPayJourney.tsx";
import FuelOnboardingChat from "./FuelOnboardingChat.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";

type View = "onboarding" | "integrations" | "journey";

export default function App() {
  const [view, setView] = useState<View>("onboarding");
  if (view === "journey") return <PatriotPayJourney />;
  if (view === "integrations")
    return (
      <IntegrationSetupPage
        onComplete={() => setView("journey")}
      />
    );
  return (
    <FuelOnboardingChat
      onComplete={() => setView("journey")}
      onManual={() => setView("integrations")}
    />
  );
}