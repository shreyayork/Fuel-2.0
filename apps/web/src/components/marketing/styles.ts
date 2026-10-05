import type { CSSProperties } from "react";
import {
  SIGNAL,
  accentChipBg,
  accentChipBorder,
  accentChipFg,
  accentGradient,
  onAccentText,
} from "@/lib/theme";

const t = SIGNAL;

export function marketingPageShell(): CSSProperties {
  return {
    position: "relative",
    isolation: "isolate",
    minHeight: "100dvh",
    background: t.bg,
    color: t.ink,
    fontFamily: t.sans,
    overflowX: "clip",
    fontSize: "var(--fs-body)",
  };
}

/** Fixed atmospheric layers behind all marketing content. */
export function marketingAtmosphereCss(): string {
  return `
.mkt-atmosphere {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.mkt-atmosphere__base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(90% 55% at 50% -5%, ${t.accent}2E 0%, transparent 55%),
    radial-gradient(55% 40% at 95% 25%, ${t.warn}1A 0%, transparent 50%),
    radial-gradient(50% 35% at 5% 70%, ${t.panel} 0%, transparent 55%),
    linear-gradient(180deg, ${t.bg} 0%, ${t.shell} 42%, ${t.panelInner} 100%);
}
.mkt-atmosphere__beam {
  position: absolute;
  top: -20%;
  left: 50%;
  width: min(720px, 90vw);
  height: 70vh;
  transform: translateX(-50%);
  background: linear-gradient(180deg, ${t.accent}26 0%, transparent 70%);
  filter: blur(40px);
  opacity: 0.85;
}
.mkt-atmosphere__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(${t.ink}08 1px, transparent 1px),
    linear-gradient(90deg, ${t.ink}08 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 70% 50% at 50% 0%, black 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 50% at 50% 0%, black 0%, transparent 75%);
}
.mkt-atmosphere__grain {
  position: absolute;
  inset: 0;
  opacity: 0.055;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.mkt-content {
  position: relative;
  z-index: 1;
}
`;
}

export function marketingHeaderBar(): CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: 1100,
    backdropFilter: "saturate(180%) blur(18px)",
    WebkitBackdropFilter: "saturate(180%) blur(18px)",
    background: `color-mix(in srgb, ${t.bg} 70%, transparent)`,
    borderBottom: `1px solid ${t.borderSubtle}`,
    paddingTop: "var(--safe-top)",
  };
}

export function marketingHeaderInner(): CSSProperties {
  return {
    maxWidth: 1200,
    margin: "0 auto",
    width: "100%",
    padding: "12px var(--gutter)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: "var(--header-h)",
    boxSizing: "border-box",
  };
}

export function marketingGetStartedLink(): CSSProperties {
  return {
    padding: "10px 18px",
    minHeight: 44,
    borderRadius: 999,
    background: accentGradient(t),
    color: onAccentText(t),
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    border: `1px solid ${t.accent}`,
    boxShadow: `0 8px 24px ${t.accent}66, 0 1px 0 rgba(255,255,255,0.14) inset`,
    display: "inline-flex",
    alignItems: "center",
  };
}

export function marketingSectionWrap(extra?: CSSProperties): CSSProperties {
  return {
    padding: "0 var(--gutter) var(--section-y)",
    maxWidth: 1200,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    ...extra,
  };
}

export function marketingEyebrow(extra?: CSSProperties): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: t.accent,
    ...extra,
  };
}

export function marketingChip(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px 8px 10px",
    borderRadius: 999,
    border: `1px solid ${accentChipBorder(t)}`,
    background: `linear-gradient(180deg, ${accentChipBg(t)}, ${t.panelInner}99)`,
    color: accentChipFg(t),
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: 0.2,
    boxShadow: `0 0 24px ${t.accent}22`,
  };
}

export function marketingPanel(extra?: CSSProperties): CSSProperties {
  return {
    position: "relative",
    background: `linear-gradient(160deg, ${t.panel}F5 0%, ${t.panelInner} 100%)`,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 20,
    boxShadow: `
      0 0 0 1px ${t.borderFaint} inset,
      0 30px 90px rgba(0,0,0,0.42),
      0 0 80px ${t.accent}0F
    `,
    overflow: "hidden",
    ...extra,
  };
}

export function marketingGradientText(): CSSProperties {
  return {
    background: `linear-gradient(115deg, ${t.accent} 0%, ${t.ink} 38%, ${t.warn} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };
}

export function marketingPrimaryCta(): CSSProperties {
  return {
    position: "relative",
    padding: "15px 28px",
    minHeight: 50,
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    background: accentGradient(t),
    color: onAccentText(t),
    border: `1px solid ${t.accent}`,
    boxShadow: `0 14px 40px ${t.accent}66, 0 1px 0 rgba(255,255,255,0.16) inset`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

export function marketingSecondaryCta(): CSSProperties {
  return {
    padding: "15px 28px",
    minHeight: 50,
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    background: `linear-gradient(180deg, ${t.ink}12, ${t.ink}05)`,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    boxShadow: `0 1px 0 ${t.borderFaint} inset`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxSizing: "border-box",
    backdropFilter: "blur(8px)",
  };
}

export { t as marketingTheme };
