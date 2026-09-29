"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";

type BuildPhase = "fetch" | "organise" | "table";

const STEPS: { id: BuildPhase; label: string }[] = [
  { id: "fetch", label: "Bringing in portfolio companies" },
  { id: "organise", label: "Organising by stage and sector" },
  { id: "table", label: "Adding them to your portfolio table" },
];

const PHASE_DELAYS_MS: { phase: BuildPhase; atMs: number }[] = [
  { phase: "organise", atMs: 2_400 },
  { phase: "table", atMs: 5_000 },
];

const ORDER: BuildPhase[] = ["fetch", "organise", "table"];

export function usePortfolioBuildPhase(enabled: boolean): BuildPhase {
  const [phase, setPhase] = useState<BuildPhase>("fetch");
  useEffect(() => {
    if (!enabled) return;
    setPhase("fetch");
    const timers = PHASE_DELAYS_MS.map(({ phase: next, atMs }) =>
      window.setTimeout(() => setPhase(next), atMs),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [enabled]);
  return phase;
}

export function PortfolioBuildPanel({
  t,
  phase,
}: {
  t: Theme;
  phase: BuildPhase;
}) {
  const idx = ORDER.indexOf(phase);
  const progress = Math.min(100, Math.round(((idx + 1) / ORDER.length) * 100));
  const active = STEPS.find((s) => s.id === phase) ?? STEPS[0];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 12,
        padding: "28px 28px 24px",
        marginBottom: 16,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: t.accent,
            marginBottom: 8,
          }}
        >
          Building your Portfolios
        </div>
        <h2
          style={{
            fontFamily: t.sans,
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Fuel is working from your onboarding
        </h2>
        <p
          style={{
            fontFamily: t.sans,
            fontSize: 14,
            color: t.muted,
            margin: 0,
            maxWidth: 520,
            lineHeight: 1.5,
          }}
        >
          Companies are grouped by the stages and sectors you invest in. The
          table fills in when they are ready.
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Portfolio build progress"
        style={{
          height: 6,
          borderRadius: 99,
          background: t.ruleSoft,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: t.accent,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: t.accent,
            boxShadow: `0 0 0 4px ${t.accent}22`,
          }}
        />
        <strong
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: 600,
            color: t.ink,
          }}
        >
          {active.label}
        </strong>
      </div>
    </div>
  );
}

/** Minimum wall time before revealing the table after build animation starts. */
export const PORTFOLIO_BUILD_MIN_MS = 6_200;
