"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  onboardCardShell,
  onboardFieldLabel,
  onboardFieldInput,
  onboardGhostButton,
  onboardPrimaryButton,
} from "../styles";
import { SIGNAL, accentGradient, onAccentText } from "@/lib/theme";

export function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 4 }} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: SIGNAL.accent,
              animation: `fuel-onboard-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              display: "block",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: SIGNAL.mutedSoft }}>Fuel AI is thinking...</span>
    </div>
  );
}

export function AIAvatar() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        flexShrink: 0,
        background: accentGradient(),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 800,
        color: onAccentText(),
      }}
      aria-hidden
    >
      F
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={onboardPrimaryButton(disabled, style)}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button type="button" onClick={onClick} style={onboardGhostButton(style)}>
      {children}
    </button>
  );
}

export function CardShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={onboardCardShell(style)}>{children}</div>;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={onboardFieldLabel()}>{children}</div>;
}

export function inputStyle(extra?: CSSProperties): CSSProperties {
  return onboardFieldInput(extra);
}

export function MarkdownText({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 0 ? (
          <span key={i}>{part}</span>
        ) : (
          <strong key={i} style={{ color: SIGNAL.ink, fontWeight: 700 }}>
            {part}
          </strong>
        ),
      )}
    </>
  );
}
