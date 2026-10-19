import React, { useState } from "react";
import type { LegalDocId } from "../legal/legalContent";
import { FuelLegalFooterLinks } from "../legal/FuelLegalPage";
import { FuelMark } from "./FuelMark";
import "./marketing.css";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export default function FuelSignIn({
  onBack,
  onAuthComplete,
  onOpenLegal,
  initialEmail,
  initialMode = "signin",
}: {
  onBack: () => void;
  /** Sign-in → existing workspace; sign-up → full onboarding. */
  onAuthComplete: (mode: "signin" | "signup", email: string) => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  initialEmail?: string;
  initialMode?: "signin" | "signup";
}) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState(initialEmail ?? "shreya.g@york.ie");
  const [password, setPassword] = useState("fuel-demo");
  const [note, setNote] = useState("");

  const isSignIn = mode === "signin";

  function completeAuth() {
    if (!email.trim()) return;
    onAuthComplete(mode, email.trim());
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    completeAuth();
  }

  return (
    <div className="mkt-root">
      <header className="mkt-nav">
        <button type="button" className="mkt-brand" onClick={onBack}>
          <FuelMark />
        </button>
        <button type="button" className="mkt-btn mkt-btn-ghost" onClick={onBack}>
          ← Back to home
        </button>
      </header>

      <div className="mkt-signin">
        <div className="mkt-signin-left">
          <div className="mkt-signin-kicker">Fuel · By York IE</div>
          <h1>
            Build with vision.
            <br />
            <em>Execute with purpose</em>
          </h1>
          <p>
            Your AI chief of staff helps you understand your market, identify what matters most, and turn your strategy into action—with less manual work along the way.
          </p>
          <p>
            Start with your work email. Fuel builds your company profile and surfaces relevant benchmarks to help you see where you stand and where to focus next.
          </p>
          <ul className="mkt-checks">
            <li><span className="mkt-check">✓</span> AI-powered market and competitive insights to inform your strategy</li>
            <li><span className="mkt-check">✓</span> Peer benchmarks to reveal strengths and opportunities to improve</li>
            <li><span className="mkt-check">✓</span> Guided playbooks to turn priorities into cross-functional action</li>
            <li><span className="mkt-check">✓</span> Progress tracking to see whether your initiatives are moving the business forward</li>
          </ul>
        </div>

        <div className="mkt-signin-right">
          <div className="mkt-signin-panel">
          <form className="mkt-card" onSubmit={submit}>
            <span className="mkt-eyebrow">{isSignIn ? "Welcome back" : "New workspace"}</span>
            <h2>{isSignIn ? "Sign in to Fuel." : "Create your Fuel account."}</h2>
            <p className="mkt-card-lede">
              {isSignIn
                ? "Pick up Overview, Intelligence, Initiatives, and Ask Fuel."
                : "Work email in. Company profile, peer cohort, and first scorecard next."}
            </p>

            <button type="button" className="mkt-google" onClick={completeAuth}>
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="mkt-or">OR</div>

            <label className="mkt-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </label>
            <label className="mkt-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={isSignIn ? "current-password" : "new-password"}
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
            </label>

            {isSignIn ? (
              <button
                type="button"
                className="mkt-forgot"
                onClick={() => setNote("Password reset is not wired in this demo — continue with Sign in.")}
              >
                Forgot password?
              </button>
            ) : null}

            <button type="submit" className="mkt-btn mkt-btn-primary mkt-submit">
              {isSignIn ? "Sign in" : "Create account"}
            </button>
            {note ? <p className="mkt-note">{note}</p> : null}

            <p className="mkt-switch">
              {isSignIn ? "New to Fuel? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setNote("");
                  setMode(isSignIn ? "signup" : "signin");
                }}
              >
                {isSignIn ? "Create an account" : "Sign in"}
              </button>
            </p>

            {onOpenLegal ? (
              <>
                <p className="mkt-legal-consent">
                  {isSignIn ? "By signing in" : "By creating an account"}, you agree to our Terms of Service and Privacy Policy.
                </p>
                <FuelLegalFooterLinks onOpen={onOpenLegal} className="mkt-signin-legal" />
              </>
            ) : null}
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}
