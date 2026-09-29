import type { CSSProperties, ReactNode } from "react";
import { SIGNAL, accentGradient, onAccentText } from "@/lib/theme";

/**
 * Shared primitives for onboarding screens (blocked provider, invites, legacy stream).
 * Locked to signal / AI tokens for the agentic dark experience.
 */

export function OnboardCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: SIGNAL.panel,
        border: `1px solid ${SIGNAL.rule}`,
        borderRadius: 12,
        padding: 32,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function OnboardHeading({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <header style={{ marginBottom: 20 }}>
      {eyebrow ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: SIGNAL.accent,
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 600,
          lineHeight: 1.25,
          margin: 0,
          color: SIGNAL.ink,
        }}
      >
        {children}
      </h1>
    </header>
  );
}

export function OnboardBody({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: SIGNAL.inkSoft, fontSize: 15, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}
