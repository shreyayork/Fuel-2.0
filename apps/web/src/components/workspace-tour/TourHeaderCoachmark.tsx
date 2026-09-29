"use client";

import type { CSSProperties } from "react";
import { accentGradient, onAccentText, type Theme } from "@/lib/theme";
import { useTheme } from "../ThemeContext";

function TourCompassIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 3.5v2.2M8 10.3V12.5M3.5 8h2.2M10.3 8H12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Header Tour control + optional coachmark — mirrors design-library
 * `.header-tour-wrap` / `.header-tour-coachmark` in PatriotPayJourney.
 */
export function TourHeaderControl({
  pointed,
  coachmark,
  onStartTour,
  onDismissCoachmark,
}: {
  pointed: boolean;
  coachmark: boolean;
  onStartTour: () => void;
  onDismissCoachmark: () => void;
}) {
  const t = useTheme();

  return (
    <div
      style={{
        position: "relative",
        zIndex: coachmark ? 130 : undefined,
        display: "inline-flex",
      }}
    >
      <button
        id="fuel-tour-header-button"
        type="button"
        onClick={onStartTour}
        title="Take a workspace tour"
        style={tourButtonStyle(t, pointed)}
      >
        <span style={{ color: t.accent, display: "inline-flex", flexShrink: 0 }} aria-hidden>
          <TourCompassIcon size={16} />
        </span>
        Tour
      </button>
      {coachmark ? <TourHeaderCoachmark t={t} onDismiss={onDismissCoachmark} /> : null}
    </div>
  );
}

function TourHeaderCoachmark({
  t,
  onDismiss,
}: {
  t: Theme;
  onDismiss: () => void;
}) {
  return (
    <div role="status" style={coachmarkPanelStyle(t)}>
      <CaretBorder t={t} />
      <span style={{ color: t.accent, display: "inline-flex" }} aria-hidden>
        <TourCompassIcon size={16} />
      </span>
      <p
        style={{
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        You can click here later to take a tour of the platform.
      </p>
      <button type="button" onClick={onDismiss} style={okButtonStyle(t)}>
        OK
      </button>
    </div>
  );
}

function CaretBorder({ t }: { t: Theme }) {
  return (
    <>
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: 22,
          top: -14,
          width: 0,
          height: 0,
          border: "7px solid transparent",
          borderBottomColor: `${t.accent}66`,
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: 23,
          top: -12,
          width: 0,
          height: 0,
          border: "6px solid transparent",
          borderBottomColor: t.panel,
        }}
      />
    </>
  );
}

function tourButtonStyle(t: Theme, pointed: boolean): CSSProperties {
  // Vertical padding matches Ask Fuel AI (`6px`); −1px vs AI accounts for
  // Tour's 1px border under border-box so total heights align at 28px.
  if (pointed) {
    return {
      alignItems: "center",
      display: "inline-flex",
      gap: 6,
      padding: "5px 14px",
      borderRadius: 7,
      fontFamily: t.sans,
      fontSize: 12.5,
      fontWeight: 500,
      color: t.ink,
      border: `1px solid ${t.accent}8C`,
      background: `${t.accent}24`,
      boxShadow: `0 0 0 3px ${t.accent}47`,
      cursor: "pointer",
    };
  }
  return {
    alignItems: "center",
    display: "inline-flex",
    gap: 6,
    padding: "5px 14px",
    borderRadius: 7,
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    color: t.inkSoft,
    border: `1px solid ${t.rule}`,
    background: t.panelAlt,
    cursor: "pointer",
  };
}

function coachmarkPanelStyle(t: Theme): CSSProperties {
  return {
    alignItems: "flex-start",
    background: t.panel,
    border: `1px solid ${t.accent}66`,
    borderRadius: 10,
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 12px 10px",
    position: "absolute",
    right: 0,
    top: "calc(100% + 10px)",
    width: 240,
    zIndex: 131,
  };
}

function okButtonStyle(t: Theme): CSSProperties {
  return {
    alignSelf: "flex-end",
    background: accentGradient(t),
    border: "none",
    borderRadius: 7,
    color: onAccentText(t),
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
  };
}
