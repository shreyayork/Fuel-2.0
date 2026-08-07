import { useEffect, useState } from "react";
import { FuelIcon } from "./icons";
import { applyFuelTheme, readFuelTheme, toggleFuelTheme, type FuelTheme } from "./fuelTheme";

export function SignedOutScreen({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  const [theme, setTheme] = useState<FuelTheme>(() => readFuelTheme());

  useEffect(() => {
    applyFuelTheme(theme);
  }, [theme]);

  return (
    <div className="signed-out-screen">
      <header className="signed-out-topbar">
        <div className="signed-out-brand">
          <span>YORK·IE FUEL 2.0</span>
        </div>
        <button
          type="button"
          className="signed-out-theme-btn"
          onClick={() => setTheme(prev => toggleFuelTheme(prev))}
          aria-label="Toggle appearance"
        >
          <FuelIcon name={theme === "dark" ? "appearanceLight" : "appearanceDark"} size={16} />
        </button>
      </header>

      <main className="signed-out-main">
        <div className="signed-out-card">
          <h1>You&apos;re signed out</h1>
          <p>
            Your workspace session has ended. Sign in again to return to your dashboard,
            portfolios, and saved progress.
          </p>
          <button type="button" className="signed-out-primary" onClick={onSignIn}>
            Sign in
          </button>
        </div>
      </main>
    </div>
  );
}
