"use client";

import type { CSSProperties, ReactNode } from "react";
import { useThemeOrSignal } from "@/components/ThemeContext";
import { panelCardSurface } from "@/lib/theme";

/**
 * Card with a slow-rotating conic-gradient border in brand colors. Use
 * sparingly — its job is to mark a small "this is the active AI surface"
 * primary element (e.g. the confirm card after a generation). Two
 * stacked divs: the outer carries the rotating gradient as a background,
 * the inner is the actual content surface offset by 1px.
 */
export function MagicGradientBorder({
  children,
  radius = 16,
  glow = true,
  style,
}: {
  children: ReactNode;
  radius?: number;
  /** Adds a soft accent glow behind the card. Disable on dense layouts. */
  glow?: boolean;
  style?: CSSProperties;
}) {
  const t = useThemeOrSignal();
  const surface = panelCardSurface(t);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: radius,
        padding: 1,
        background:
          "conic-gradient(from 0deg, rgba(0,180,138,0.45), rgba(63,116,178,0.35), rgba(236,214,127,0.28), rgba(0,180,138,0.45))",
        animation: "fuel-magic-rotate 8s linear infinite",
        ...style,
      }}
    >
      <style>{`@keyframes fuel-magic-rotate { to { background-position: 360deg; } } @property --fuel-rot { syntax: '<angle>'; inherits: false; initial-value: 0deg; }`}</style>
      {glow ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -14,
            background:
              t.mode === "editorial"
                ? `radial-gradient(closest-side, ${t.accentTint}, transparent 70%)`
                : "radial-gradient(closest-side, rgba(0,180,138,0.16), transparent 70%)",
            filter: "blur(20px)",
            pointerEvents: "none",
            zIndex: -1,
            borderRadius: radius + 14,
          }}
        />
      ) : null}
      <div
        style={{
          background: surface.background,
          border: surface.border,
          borderRadius: radius - 1,
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
