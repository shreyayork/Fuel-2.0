import type { CSSProperties } from "react";
import {
  SIGNAL,
  THEMES,
  accentGradient,
  onAccentText,
  panelCardSurface,
} from "@/lib/theme";

const t = SIGNAL;
const ed = THEMES.editorial;

export function onboardFullScreenOverlay(): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: t.overlay,
    backdropFilter: "blur(6px)",
    display: "flex",
  };
}

export function onboardShellFrame(): CSSProperties {
  return {
    width: "100vw",
    height: "100vh",
    background: t.shell,
    display: "flex",
    flexDirection: "column",
    fontFamily: t.sans,
    fontSize: 13,
    lineHeight: 1.5,
  };
}

export function onboardTopBar(): CSSProperties {
  return {
    height: 52,
    background: t.chip,
    borderBottom: `1px solid ${t.borderSubtle}`,
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    justifyContent: "space-between",
    flexShrink: 0,
  };
}

export function onboardPrimaryButton(
  disabled?: boolean,
  extra?: CSSProperties,
): CSSProperties {
  return {
    background: accentGradient(t),
    color: onAccentText(t),
    border: "none",
    borderRadius: 7,
    padding: "8px 18px",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    ...extra,
  };
}

export function onboardGhostButton(extra?: CSSProperties): CSSProperties {
  return {
    background: "transparent",
    color: t.muted,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 7,
    padding: "8px 14px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    ...extra,
  };
}

export function onboardTextButton(extra?: CSSProperties): CSSProperties {
  return {
    background: "none",
    border: "none",
    color: t.mutedSoft,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: t.sans,
    ...extra,
  };
}

/** Top bar brand lockup — matches Shell header scale (~13–14px). */
export function onboardBrandTitle(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 14,
    fontWeight: 700,
    color: t.ink,
    ...extra,
  };
}

export function onboardBrandSub(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 12,
    color: t.mutedSoft,
    ...extra,
  };
}

export function onboardStatusBadge(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    ...extra,
  };
}

/** Progress rail section labels and list copy. */
export function onboardSidebarEyebrow(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    color: t.mutedSoft,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    ...extra,
  };
}

export function onboardSidebarItem(
  opts: { done: boolean; current: boolean },
  extra?: CSSProperties,
): CSSProperties {
  const { done, current } = opts;
  return {
    fontFamily: t.sans,
    fontSize: 13,
    color: done ? t.accent : current ? t.muted : t.mutedSoft,
    fontWeight: done ? 600 : 400,
    ...extra,
  };
}

export function onboardSidebarCardTitle(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    color: t.ink,
    ...extra,
  };
}

export function onboardSidebarBody(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 12,
    color: t.mutedSoft,
    lineHeight: 1.5,
    ...extra,
  };
}

export function onboardSidebarAccentTitle(
  extra?: CSSProperties,
): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    color: t.accent,
    ...extra,
  };
}

export function onboardFieldInput(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: t.shell,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 12,
    color: t.ink,
    outline: "none",
    fontFamily: "inherit",
    ...extra,
  };
}

export function onboardChatInput(active: boolean): CSSProperties {
  return {
    flex: 1,
    background: t.chip,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: t.ink,
    outline: "none",
    opacity: active ? 1 : 0.4,
    fontFamily: "inherit",
  };
}

export function onboardCardShell(extra?: CSSProperties): CSSProperties {
  return {
    background: t.chip,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
    ...extra,
  };
}

export function chatBubble(role: "ai" | "user"): CSSProperties {
  return {
    background: role === "ai" ? t.panel : t.chip,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
    padding: "11px 14px",
    fontSize: 13,
    color: t.inkSoft,
    lineHeight: 1.65,
    whiteSpace: "pre-line",
  };
}

export function chatChipButton(): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.accentSoft}`,
    color: t.accent,
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

export function onboardEyebrow(extra?: CSSProperties): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: t.accent,
    marginBottom: 8,
    ...extra,
  };
}

export function onboardFieldLabel(): CSSProperties {
  return {
    fontSize: 10,
    color: t.mutedSoft,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: 4,
  };
}

// ─── v2 two-column wizard (OnboardingFlow) ───────────────────────────────────

/** CSS custom properties for v2 wizard class selectors — inject once via `<style>`. */
export function onboardV2FlowCss(): string {
  return `
  :root {
    --of-bg: ${t.bg};
    --of-panel: ${t.panel};
    --of-panel-alt: ${t.panelAlt};
    --of-ink: ${t.ink};
    --of-muted: ${t.muted};
    --of-muted-soft: ${t.mutedSoft};
    --of-accent: ${t.accent};
    --of-positive: ${t.positive};
    --of-negative: ${t.negative};
    --of-border: ${t.borderSubtle};
    --of-border-faint: ${t.borderFaint};
    --of-gradient: ${accentGradient(t)};
    --of-on-accent: ${onAccentText(t)};
    --of-accent-tint: ${t.accentTint};
    --of-accent-soft: ${t.accentSoft};
  }

  @keyframes ofFadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ofFadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes ofScaleIn  { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
  @keyframes ofSlideR   { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
  @keyframes ofSpin     { to { transform:rotate(360deg); } }
  @keyframes ofPulse    { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(0.94);} }
  @keyframes ofBarFill  { from { width:0; } to { width:var(--w,0%); } }
  @keyframes ofFloat    { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
  @keyframes ofGlow     { 0%,100%{box-shadow:0 0 20px color-mix(in srgb, var(--of-positive) 15%, transparent);} 50%{box-shadow:0 0 40px color-mix(in srgb, var(--of-positive) 40%, transparent);} }
  @keyframes ofDraw     { from{stroke-dashoffset:600} to{stroke-dashoffset:0} }
  @keyframes ofCountUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ofOrbit    { from{transform:rotate(0deg) translateX(72px) rotate(0deg)} to{transform:rotate(360deg) translateX(72px) rotate(-360deg)} }
  @keyframes ofShimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes ofBounceIn { 0%{opacity:0;transform:scale(0.6)} 70%{transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
  @keyframes ofWave     { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
  @keyframes ofParticle { 0%{opacity:0;transform:translateY(-10px)} 30%{opacity:1} 100%{opacity:0;transform:translateY(100px)} }
  @keyframes ofHubspotLoad { from { width: 0; } to { width: 100%; } }

  .of-step  { animation: ofFadeUp 0.3s ease both; }
  .of-spin  { animation: ofSpin 0.9s linear infinite; }
  .of-pulse { animation: ofPulse 2s ease infinite; }
  .of-float { animation: ofFloat 3s ease infinite; }
  .of-glow  { animation: ofGlow 2.5s ease infinite; }

  .of-input { transition: border-color 0.2s; }
  .of-input:focus { border-color: color-mix(in srgb, var(--of-positive) 40%, transparent) !important; outline: none; }

  .of-chip { transition: all 0.15s; }
  .of-chip:hover { border-color: color-mix(in srgb, var(--of-ink) 20%, transparent) !important; color: var(--of-ink) !important; }

  .of-figma-opt { transition: all 0.15s ease; }
  .of-figma-opt:hover { border-color: color-mix(in srgb, var(--of-ink) 22%, transparent) !important; color: var(--of-ink) !important; background: color-mix(in srgb, var(--of-ink) 3%, transparent) !important; }
  .of-figma-opt--on:hover { border-color: var(--of-positive) !important; background: var(--of-accent-tint) !important; color: var(--of-ink) !important; }

  .of-figma-q-title { font-size: clamp(26px, 3.2vw, 38px); font-weight: 800; color: var(--of-ink); margin: 0; letter-spacing: -0.5px; line-height: 1.12; }
  .of-figma-q-grouped { font-size: clamp(15px, 2.2vw, 17px); font-weight: 500; color: var(--of-muted); margin: 0; line-height: 1.5; }
  .of-figma-q-sub { font-size: clamp(14px, 2vw, 16px); color: var(--of-muted-soft); margin: 12px 0 0; line-height: 1.55; }
  .of-step-heading h2 { font-size: clamp(28px, 3.5vw, 38px); }
  .of-step-heading p { font-size: clamp(14px, 2vw, 16px); }

  .of-add-round:hover { border-color: color-mix(in srgb, var(--of-ink) 30%, transparent) !important; color: var(--of-ink) !important; }
  .of-back:hover { color: var(--of-muted) !important; }
  .of-suggest-item:hover { background: var(--of-accent-tint) !important; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--of-border); border-radius: 2px; }

  /* Mobile / tablet portrait — form-first (side motion rail hidden in React). */
  @media (max-width: 899px) {
    .of-figma-q-title {
      font-size: clamp(24px, 6.5vw, 32px);
      letter-spacing: -0.6px;
    }
    .of-figma-q-sub {
      font-size: clamp(14px, 3.8vw, 16px);
      margin-top: 10px;
    }
    .of-figma-q-grouped {
      font-size: clamp(14px, 3.6vw, 16px);
    }
    .of-choice-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }
    .of-profile-split {
      grid-template-columns: 1fr !important;
      gap: 14px 0 !important;
    }
    .of-figma-opt {
      min-height: 48px;
      padding: 14px 16px !important;
      font-size: 15px !important;
      text-align: left;
      justify-content: flex-start;
    }
    .of-input {
      min-height: 48px;
      font-size: 16px !important; /* avoids iOS zoom on focus */
    }
    .of-mobile-cta {
      width: 100%;
      min-height: 48px;
      justify-content: center;
    }
    .of-mobile-progress {
      flex: 1 1 auto !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
    }
    .of-funding-row {
      grid-template-columns: 1fr 1fr !important;
    }
    .of-funding-row > *:nth-child(4),
    .of-funding-row > *:nth-child(5) {
      grid-column: 1 / -1;
    }
  }
`;
}

export function onboardV2Shell(narrow = false): CSSProperties {
  return {
    width: "100vw",
    height: "100dvh",
    maxHeight: "100dvh",
    background: narrow
      ? `radial-gradient(ellipse 120% 80% at 50% -10%, ${t.panel} 0%, ${t.bg} 55%, ${t.shell} 100%)`
      : t.bg,
    display: "flex",
    fontFamily: t.sans,
    paddingTop: narrow ? "var(--fuel-safe-top, 0px)" : undefined,
    paddingBottom: narrow ? "var(--fuel-safe-bottom, 0px)" : undefined,
    paddingLeft: narrow ? "var(--fuel-safe-left, 0px)" : undefined,
    paddingRight: narrow ? "var(--fuel-safe-right, 0px)" : undefined,
  };
}

export function onboardV2LeftColumn(narrow = false): CSSProperties {
  return {
    width: narrow ? "100%" : "50%",
    flex: narrow ? "1 1 auto" : undefined,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    position: "relative",
  };
}

export function onboardV2LogoRow(narrow = false): CSSProperties {
  return {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: narrow ? "16px 20px 10px" : "20px 48px 12px",
  };
}

export function onboardV2LogoMark(): CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: accentGradient(t),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 900,
    color: onAccentText(t),
  };
}

export function onboardV2ScrollInner(
  centered: boolean,
  narrow = false,
): CSSProperties {
  return {
    width: "100%",
    padding: narrow
      ? centered
        ? "12px 20px 28px"
        : "8px 20px 28px"
      : centered
        ? "16px 48px 32px"
        : "24px 48px 32px",
    maxWidth: narrow ? 560 : 600,
  };
}

/** Soft panel behind step content on mobile — replaces the missing light rail. */
export function onboardV2FormSurface(narrow = false): CSSProperties {
  if (!narrow) return {};
  return {
    background: `linear-gradient(180deg, ${t.panel}F2 0%, ${t.panelAlt}E6 100%)`,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 16,
    padding: "22px 18px 20px",
    boxShadow: `0 18px 48px color-mix(in srgb, ${t.bg} 55%, transparent)`,
  };
}

export function onboardV2BottomBar(narrow = false): CSSProperties {
  return {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: narrow ? "wrap" : undefined,
    gap: narrow ? 12 : 24,
    padding: narrow ? "12px 16px 14px" : "12px 48px",
    borderTop: `1px solid ${t.borderFaint}`,
    background: narrow
      ? `color-mix(in srgb, ${t.panel} 88%, transparent)`
      : undefined,
    backdropFilter: narrow ? "blur(10px)" : undefined,
  };
}

export function onboardV2FieldInput(extra?: CSSProperties): CSSProperties {
  return onboardFieldInput({
    background: t.panelAlt,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    ...extra,
  });
}

export function onboardV2FieldLabel(extra?: CSSProperties): CSSProperties {
  return {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: t.muted,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 7,
    ...extra,
  };
}

export function onboardV2PrimaryCta(
  enabled: boolean,
  extra?: CSSProperties,
): CSSProperties {
  return onboardPrimaryButton(!enabled, {
    borderRadius: 10,
    padding: "12px 32px",
    fontSize: 14,
    letterSpacing: "-0.1px",
    background: enabled ? accentGradient(t) : t.borderFaint,
    color: enabled ? onAccentText(t) : t.mutedSoft,
    cursor: enabled ? "pointer" : "default",
    ...extra,
  });
}

export function onboardV2LoadingScreen(): CSSProperties {
  return {
    ...onboardFullScreenOverlay(),
    alignItems: "center",
    justifyContent: "center",
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 14,
  };
}

/** Slack connector card accent — third-party brand, not York palette. */
export const ONBOARD_SLACK_BRAND = "#4A9FD4";

/** HubSpot connector — third-party brand. */
export const ONBOARD_HUBSPOT_BRAND = "#FF7A59";

/** Figma-style insight cursor — third-party affordance color. */
export const ONBOARD_FIGMA_CURSOR = "#F24E1E";

// ─── v2 right-panel motion graphics (editorial / light) ──────────────────────

/** Semantic color map for OnboardingMotionGraphics — editorial theme only. */
export function motionColors() {
  return {
    ink: ed.ink,
    inkSoft: ed.inkSoft,
    muted: ed.muted,
    mutedSoft: ed.mutedSoft,
    panel: ed.panel,
    bg: ed.bg,
    rule: ed.rule,
    ruleSoft: ed.ruleSoft,
    accent: ed.accent,
    accentSoft: ed.accentSoft,
    accentTint: ed.accentTint,
    positive: ed.positive,
    negative: ed.negative,
    warn: ed.warn,
    warnSoft: ed.warnSoft,
    marketing: ed.trackMarketing,
    finOps: ed.trackFinOps,
    chip: ed.chip,
    mono: ed.mono,
    sans: ed.sans,
    onAccent: onAccentText(ed),
    gradient: accentGradient(ed),
  };
}

export type MotionInsightCat = "Intelligence" | "Initiative" | "Playbook";

export function motionInsightCatStyle(): Record<
  MotionInsightCat,
  { color: string; icon: string; suggested?: boolean }
> {
  const c = motionColors();
  return {
    Intelligence: { color: c.marketing, icon: "◎" },
    Initiative: { color: c.accent, icon: "↗", suggested: true },
    Playbook: { color: c.warn, icon: "▤", suggested: true },
  };
}

export type MotionPerfTier = "top10" | "top25" | "above" | "below" | "weak";

export function motionTierAccentColor(tier: MotionPerfTier): string {
  const c = motionColors();
  if (tier === "weak") return c.warnSoft;
  if (tier === "below") return c.warn;
  if (tier === "above") return c.accent;
  return c.marketing;
}

export function onboardMotionRightPanel(): CSSProperties {
  const c = motionColors();
  return {
    flex: 1,
    background: `linear-gradient(175deg, color-mix(in srgb, ${c.accentSoft} 85%, ${c.bg}) 0%, color-mix(in srgb, ${c.accent} 10%, ${c.bg}) 45%, color-mix(in srgb, ${c.accent} 20%, ${c.panel}) 100%)`,
    overflow: "hidden",
    position: "relative",
  };
}

export function onboardMotionCardShell(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  const surface = panelCardSurface(ed);
  return {
    ...surface,
    borderRadius: 16,
    boxShadow: `0 24px 64px color-mix(in srgb, ${c.ink} 12%, transparent), 0 4px 16px color-mix(in srgb, ${c.ink} 6%, transparent)`,
    overflow: "hidden",
    ...extra,
  };
}

export function onboardMotionCardHeader(): CSSProperties {
  const c = motionColors();
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 18px",
    borderBottom: `1px solid ${c.ruleSoft}`,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  };
}

export function onboardMotionCardBody(clipBody = true): CSSProperties {
  const c = motionColors();
  return {
    padding: clipBody ? "22px 20px 24px" : "22px 16px 20px",
    minHeight: 220,
    position: "relative",
    background: c.bg,
    borderBottomLeftRadius: clipBody ? undefined : 16,
    borderBottomRightRadius: clipBody ? undefined : 16,
  };
}

export function onboardMotionLogoMark(): CSSProperties {
  const c = motionColors();
  return {
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    background: c.gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 900,
    color: c.onAccent,
  };
}

export function onboardMotionAvatarBadge(): CSSProperties {
  const c = motionColors();
  return {
    width: 26,
    height: 26,
    borderRadius: "50%",
    flexShrink: 0,
    background: `linear-gradient(135deg, ${c.accent}, ${c.marketing})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
    color: ed.panel,
  };
}

export function motionCardTitle(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  return {
    fontSize: 13,
    fontWeight: 700,
    color: c.ink,
    letterSpacing: "-0.2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function motionCardSubtitle(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  return {
    fontSize: 10.5,
    color: c.muted,
    marginTop: 1,
    ...extra,
  };
}

export function motionRowSurface(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    marginBottom: 6,
    background: c.panel,
    borderRadius: 10,
    border: `1px solid ${c.ruleSoft}`,
    ...extra,
  };
}

export function motionChip(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  return {
    fontSize: 11,
    fontWeight: 600,
    color: c.inkSoft,
    background: c.accentSoft,
    border: `1px solid color-mix(in srgb, ${c.accent} 22%, ${c.rule})`,
    borderRadius: 20,
    padding: "5px 12px",
    ...extra,
  };
}

export function motionProgressTrack(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  return {
    height: 5,
    background: colorMixAccentTrack(c.accent, 0.28),
    borderRadius: 3,
    overflow: "hidden",
    ...extra,
  };
}

export function motionProgressFill(extra?: CSSProperties): CSSProperties {
  const c = motionColors();
  return {
    height: "100%",
    background: `linear-gradient(90deg, ${c.accent}, ${c.marketing})`,
    borderRadius: 3,
    ...extra,
  };
}

function colorMixAccentTrack(accent: string, amount: number): string {
  return `color-mix(in srgb, ${accent} ${Math.round(amount * 100)}%, ${ed.ruleSoft})`;
}

export function motionInsightSurface(
  color: string,
  highlighted = false,
  linked = false,
): CSSProperties {
  const c = motionColors();
  const edge = highlighted ? `${color}70` : `${color}48`;
  const accent = highlighted ? `${color}85` : `${color}68`;
  return {
    width: "100%",
    boxSizing: "border-box",
    background: highlighted
      ? `linear-gradient(135deg, ${color}18 0%, ${c.panel} 100%)`
      : `linear-gradient(135deg, ${color}0D 0%, ${c.panel} 100%)`,
    borderTop: `1px solid ${edge}`,
    borderRight: `1px solid ${edge}`,
    borderBottom: `1px solid ${edge}`,
    borderLeft: linked ? `3px solid ${accent}` : `1px solid ${edge}`,
    borderRadius: 14,
    padding: linked ? "12px 16px 14px 18px" : "14px 16px",
    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${c.panel} 92%, transparent)`,
  };
}

export function motionSummarySurface(
  color: string,
  highlighted = false,
): CSSProperties {
  const c = motionColors();
  const edge = highlighted ? `${color}55` : `${color}38`;
  return {
    width: "100%",
    boxSizing: "border-box",
    background: highlighted
      ? `linear-gradient(135deg, ${color}14 0%, ${c.panel} 100%)`
      : `linear-gradient(135deg, ${color}0A 0%, ${c.panel} 100%)`,
    border: `1px solid ${edge}`,
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${c.panel} 92%, transparent)`,
  };
}

export function onboardMotionScrollCss(): string {
  const c = motionColors();
  const thumb = `color-mix(in srgb, ${c.marketing} 35%, transparent)`;
  return `
    .of-benchmark-card-scroll {
      scrollbar-width: thin;
      scrollbar-color: ${thumb} transparent;
    }
    .of-benchmark-card-scroll::-webkit-scrollbar { width: 5px; }
    .of-benchmark-card-scroll::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: 4px; }
    .of-benchmark-card-scroll::-webkit-scrollbar-track { background: transparent; }
    .of-insight-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .of-insight-scroll::-webkit-scrollbar { display: none; }
  `;
}

export function motionGlowRadial(accent: string): string {
  return `radial-gradient(circle, ${accent}18 0%, transparent 68%)`;
}

/** Light callout surface tinted from a semantic accent. */
export function motionTintSurface(color: string, mix = 12): CSSProperties {
  const c = motionColors();
  return {
    background: `color-mix(in srgb, ${color} ${mix}%, ${c.panel})`,
    border: `1px solid color-mix(in srgb, ${color} 22%, ${c.rule})`,
  };
}

export function motionTintBadge(color: string): CSSProperties {
  return {
    background: `${color}22`,
    color,
  };
}
