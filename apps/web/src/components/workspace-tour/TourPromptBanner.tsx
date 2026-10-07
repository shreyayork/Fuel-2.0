"use client";

import { MagicShimmer } from "@/components/ai/MagicShimmer";
import { ctaPrimaryStyle } from "@/lib/theme";
import { useTheme } from "../ThemeContext";

const bannerShell = {
  alignItems: "center" as const,
  borderRadius: 10,
  display: "flex" as const,
  gap: 18,
  justifyContent: "space-between" as const,
  marginTop: 14,
  padding: "13px 15px",
};

/** Same footprint as TourPromptBanner — shown while Overview / tour prep runs. */
export function TourBuildingBanner() {
  const t = useTheme();

  return (
    <div
      style={{
        ...bannerShell,
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        pointerEvents: "none",
      }}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Tour is being prepared"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            color: t.accent,
            display: "block",
            fontFamily: t.sans,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Preparing tour
        </span>
        <strong
          style={{
            color: t.ink,
            display: "block",
            fontFamily: t.sans,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Your tour is being prepared…
        </strong>
        <p
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 12,
            lineHeight: 1.45,
            margin: "4px 0 0",
          }}
        >
          Fuel is finishing Overview — the walkthrough opens when your advisor is ready.
        </p>
      </div>
      <div style={{ display: "flex", flexShrink: 0, gap: 8 }} aria-hidden>
        <MagicShimmer theme={t} width={110} height={32} rounded={7} />
        <MagicShimmer theme={t} width={92} height={32} rounded={7} />
      </div>
    </div>
  );
}

/** Interactive ready prompt — shown after Overview finishes building. */
export function TourPromptBanner({
  onStartTour,
  onDismiss,
}: {
  onStartTour: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();

  return (
    <div
      style={{
        ...bannerShell,
        background:
          t.mode === "signal"
            ? `linear-gradient(135deg, ${t.accent}1F, ${t.panel})`
            : `linear-gradient(135deg, ${t.accentTint}, ${t.panel})`,
        border: `1px solid ${t.mode === "signal" ? `${t.accent}3D` : `${t.accent}44`}`,
      }}
    >
      <div>
        <span
          style={{
            color: t.accent,
            display: "block",
            fontFamily: t.sans,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Overview ready
        </span>
        <strong
          style={{
            color: t.ink,
            display: "block",
            fontFamily: t.sans,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Your Overview is ready
        </strong>
        <p
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 12,
            lineHeight: 1.45,
            margin: "4px 0 0",
          }}
        >
          Scores, advisor, and first suggestions are live.
        </p>
      </div>
      <div style={{ display: "flex", flexShrink: 0, gap: 8 }}>
        <button
          type="button"
          onClick={onStartTour}
          style={{
            ...ctaPrimaryStyle(t),
            borderRadius: 7,
            cursor: "pointer",
            fontFamily: t.sans,
            fontSize: 11.5,
            fontWeight: 800,
            padding: "8px 11px",
          }}
        >
          Take a quick tour
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: `1px solid ${t.rule}`,
            borderRadius: 7,
            color: t.inkSoft,
            cursor: "pointer",
            fontFamily: t.sans,
            fontSize: 11.5,
            fontWeight: 600,
            padding: "8px 11px",
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
