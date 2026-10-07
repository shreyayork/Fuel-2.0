// Theme tokens — ported from the design prototype's ds.jsx.
// York IE palette: navy #284256 primary, teal #00B48A accent, gold #ECD67F warning.

import type { CSSProperties } from "react";

export type ThemeMode = "editorial" | "signal";

export type Theme = {
  name: string;
  mode: ThemeMode;
  bg: string;
  panel: string;
  panelAlt: string;
  panelInner: string;
  /** Full-bleed shell (onboarding chat depth) */
  shell: string;
  ink: string;
  inkSoft: string;
  muted: string;
  mutedSoft: string;
  rule: string;
  ruleSoft: string;
  accent: string;
  accentSoft: string;
  accentTint: string;
  positive: string;
  negative: string;
  warn: string;
  warnSoft: string;
  chip: string;
  overlay: string;
  borderSubtle: string;
  borderFaint: string;
  trackMarketing: string;
  trackFinOps: string;
  serif: string;
  sans: string;
  mono: string;
};

const shared = {
  serif: '"Inter", -apple-system, "Helvetica Neue", sans-serif',
  sans: '"Inter", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

export const THEMES: Record<ThemeMode, Theme> = {
  editorial: {
    name: "Light",
    mode: "editorial",
    bg: "#F7F8FA",
    panel: "#FFFFFF",
    panelAlt: "#F1F3F6",
    panelInner: "#EFF2F5",
    shell: "#E4E8EC",
    ink: "#284256",
    inkSoft: "#3E5668",
    // Darkened vs prior #7A8A97 so muted-on-white clears WCAG AA 4.5:1.
    muted: "#667987",
    mutedSoft: "#B4BFC8",
    rule: "#E4E8EC",
    ruleSoft: "#EFF2F5",
    accent: "#00B48A",
    accentSoft: "#D6F3EB",
    accentTint: "rgba(0,180,138,0.08)",
    positive: "#00B48A",
    negative: "#C94A3B",
    warn: "#B78A1D",
    warnSoft: "#ECD67F",
    chip: "#F1F3F6",
    overlay: "rgba(40,66,86,0.4)",
    borderSubtle: "rgba(40,66,86,0.12)",
    borderFaint: "rgba(40,66,86,0.06)",
    trackMarketing: "#2BB8A0",
    trackFinOps: "#8B76D4",
    ...shared,
  },
  signal: {
    name: "Dark",
    mode: "signal",
    bg: "#0F1A24",
    panel: "#172632",
    panelAlt: "#1F3140",
    panelInner: "#0B141C",
    shell: "#132130",
    ink: "#F4F6F8",
    inkSoft: "#D5DCE2",
    muted: "#A8B6C2",
    mutedSoft: "#7D8E9C",
    rule: "#263947",
    ruleSoft: "#1F3140",
    accent: "#00B48A",
    accentSoft: "rgba(0,180,138,0.18)",
    accentTint: "rgba(0,180,138,0.08)",
    positive: "#00B48A",
    negative: "#FF6B5B",
    warn: "#ECD67F",
    warnSoft: "#ECD67F33",
    chip: "#1F3140",
    overlay: "rgba(10,20,28,0.75)",
    borderSubtle: "rgba(255,255,255,0.07)",
    borderFaint: "rgba(255,255,255,0.04)",
    trackMarketing: "#2BB8A0",
    trackFinOps: "#8B76D4",
    ...shared,
  },
};

/** Dark UI theme — onboarding, agent surfaces, full-bleed flows */
export const SIGNAL = THEMES.signal;

export function accentGradient(t: Theme = SIGNAL): string {
  return `linear-gradient(135deg, ${t.accent} 0%, ${t.warn} 100%)`;
}

export function onAccentText(t: Theme = SIGNAL): string {
  return t.mode === "editorial" ? "#FFFFFF" : t.bg;
}

/** York navy fill for primary / create CTAs — never Overview charcoal `ink`. */
export function brandNavyFill(_t: Theme): string {
  return THEMES.editorial.ink;
}

/** Foreground on {@link brandNavyFill}. */
export function onBrandNavyText(_t: Theme): string {
  return "#FFFFFF";
}

/** Teal → gold fill used only for Ask Fuel / AI controls. */
export function aiCtaGradient(): string {
  return `linear-gradient(135deg, ${THEMES.editorial.accent} 0%, ${THEMES.signal.warn} 100%)`;
}

/** Navy ink on the AI gradient (same as the header Ask Fuel control). */
export function onAiCtaText(): string {
  return THEMES.editorial.ink;
}

/** Filled primary action — York navy, white label. */
export function ctaPrimaryStyle(
  t: Theme,
  extra?: CSSProperties,
): CSSProperties {
  const bg = brandNavyFill(t);
  return {
    background: bg,
    border: `1px solid ${bg}`,
    color: onBrandNavyText(t),
    ...extra,
  };
}

/** Ask Fuel / AI action — teal → gold brand gradient. */
export function ctaAiStyle(_t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: aiCtaGradient(),
    border: "none",
    color: onAiCtaText(),
    ...extra,
  };
}

/** Ghost / tertiary action — transparent with a hairline. */
export function ctaTertiaryStyle(
  t: Theme,
  extra?: CSSProperties,
): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.rule}`,
    color: t.ink,
    ...extra,
  };
}

/** Accent pill foreground — mint on dark panels, brand green on light. */
export function accentChipFg(t: Theme): string {
  return t.mode === "editorial" ? t.accent : "#A6E6D2";
}

export function accentChipBg(t: Theme): string {
  return t.mode === "editorial" ? t.accentSoft : "rgba(0,180,138,0.14)";
}

export function accentChipBorder(t: Theme): string {
  return t.mode === "editorial" ? t.accentSoft : "rgba(0,180,138,0.45)";
}

export function panelCardSurface(t: Theme): {
  background: string;
  border: string;
} {
  return {
    background: t.panel,
    border: `1px solid ${t.borderSubtle}`,
  };
}

/** In-app framed card — 12px radius, 1px rule, panel fill (DESIGN.md Flat Frame). */
export const FRAMED_PANEL_RADIUS = 12;

export function framedPanelStyle(
  t: Theme,
  extra?: CSSProperties,
): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: FRAMED_PANEL_RADIUS,
    boxSizing: "border-box",
    overflow: "hidden",
    ...extra,
  };
}

export function framedPanelPadStyle(
  t: Theme,
  extra?: CSSProperties,
): CSSProperties {
  return framedPanelStyle(t, { padding: 16, ...extra });
}

/** Pipeline-style group: one BG card, heading inside, items sit on the fill. */
export function groupCardStyle(t: Theme, extra?: CSSProperties): CSSProperties {
  return framedPanelStyle(t, {
    overflow: "visible",
    padding: 14,
    ...extra,
  });
}

export function groupCardHeadStyle(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    alignItems: "center",
    borderBottom: `1px solid ${t.rule}`,
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 10,
    minWidth: 0,
    paddingBottom: 10,
    ...extra,
  };
}

/** Inner tile on a group surface — panel fill + hairline only (not a gray well). */
export function groupItemStyle(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    boxSizing: "border-box",
    ...extra,
  };
}

/** CSS custom properties for `.fuel-card` / stacked mobile lists. */
export function themeSurfaceCssVars(t: Theme): CSSProperties {
  return {
    ["--fuel-bg" as string]: t.bg,
    ["--fuel-panel" as string]: t.panel,
    ["--fuel-panel-alt" as string]: t.panelAlt,
    ["--fuel-rule" as string]: t.rule,
    ["--fuel-rule-soft" as string]: t.ruleSoft,
    ["--fuel-card-radius" as string]: `${FRAMED_PANEL_RADIUS}px`,
    ["--fuel-card-gap" as string]: "10px",
    ["--fuel-card-pad" as string]: "16px",
    ["--fuel-section-gap" as string]: "20px",
    ["--fuel-section-head-gap" as string]: "12px",
    ["--fuel-cta-primary-bg" as string]: brandNavyFill(t),
    ["--fuel-cta-primary-fg" as string]: onBrandNavyText(t),
    ["--fuel-cta-ai-bg" as string]: aiCtaGradient(),
    ["--fuel-cta-ai-fg" as string]: onAiCtaText(),
    ["--fuel-cta-tertiary-fg" as string]: t.ink,
    ["--fuel-cta-tertiary-bd" as string]: t.rule,
  };
}

/** Class for dark-theme dropdown lists — styles in `globals.css`. */
export const DARK_DROPDOWN_SCROLL_CLASS = "fuel-dropdown-scroll-dark";

/**
 * Overflow + dark-only scrollbar tokens for picker dropdowns.
 * Light theme: no class — keep global/browser scrollbar unchanged.
 */
export function dropdownScrollProps(
  t: Theme,
  extra?: CSSProperties,
): { className?: string; style: CSSProperties } {
  const style: CSSProperties = { overflowY: "auto", ...extra };
  if (t.mode !== "signal") return { style };

  // Inline scrollbarColor covers Firefox. WebKit uses class + CSS vars below.
  return {
    className: DARK_DROPDOWN_SCROLL_CLASS,
    style: {
      ...style,
      scrollbarWidth: "thin",
      scrollbarColor: `${t.mutedSoft} transparent`,
      // Custom properties for `.fuel-dropdown-scroll-dark` in globals.css.
      ["--fuel-scroll-thumb" as string]: t.mutedSoft,
      ["--fuel-scroll-thumb-hover" as string]: t.muted,
    } as CSSProperties,
  };
}
