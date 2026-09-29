/**
 * Overview side-drawer styles — CSSProperties factories matched to
 * Design/src/app/PatriotPayJourney.css (detail, benchmark, add-sources drawers).
 */
import type { CSSProperties } from "react";
import { accentGradient, type Theme } from "@/lib/theme";
import {
  OVERVIEW_STATUS,
  OVERVIEW_THEME,
  overviewAccentLine,
  overviewBorder,
  overviewBorderStrong,
  overviewStatusGoodDim,
  overviewStatusGoodLine,
} from "./overviewTokens";

export const OVERVIEW_DRAWER_WIDTH = 720;

function merge(...parts: Array<CSSProperties | undefined | false>): CSSProperties {
  return Object.assign({}, ...parts.filter(Boolean));
}

function isLight(t: Theme): boolean {
  return t.mode === "editorial";
}

/** Shared drawer chrome helpers (motion lives in `drawer/motion` + OverviewDrawerShell). */
export function overviewDrawerKeyframesCss(t: Theme = OVERVIEW_THEME): string {
  return `
.ov-drawer-input::placeholder {
  color: ${t.muted};
  font-weight: 400;
  opacity: 1;
}
@keyframes scDrawerReveal {
  0% { background: ${overviewStatusGoodDim(t)}; }
  100% { background: transparent; }
}
`;
}

export function drawerRootStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    WebkitFontSmoothing: "antialiased",
    inset: 0,
    pointerEvents: "none",
    position: "fixed",
    zIndex: 200,
  };
}

export function drawerScrimStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { bench?: boolean },
): CSSProperties {
  const light = isLight(t);
  if (opts?.bench) {
    return {
      position: "fixed",
      inset: 0,
      background: light ? "rgba(26, 35, 50, 0.28)" : "rgba(6, 12, 10, 0.6)",
      zIndex: 200,
      display: "flex",
      justifyContent: "flex-end",
      pointerEvents: "auto",
    };
  }
  return {
    background: light ? "rgba(26, 35, 50, 0.28)" : "rgba(7, 13, 19, 0.62)",
    inset: 0,
    position: "fixed",
    zIndex: 200,
    pointerEvents: "auto",
  };
}

export function detailPanelStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    background: isLight(t) ? t.panel : t.bg,
    borderLeft: `1px solid ${overviewBorderStrong(t)}`,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    maxWidth: "92vw",
    pointerEvents: "auto",
    position: "fixed",
    right: 0,
    top: 0,
    width: OVERVIEW_DRAWER_WIDTH,
    zIndex: 201,
    fontFamily: t.sans,
    color: t.ink,
    boxShadow: isLight(t)
      ? "-16px 0 40px rgba(26, 35, 50, 0.08)"
      : "-18px 0 48px rgba(0, 0, 0, 0.35)",
  };
}

export function benchPanelStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    width: OVERVIEW_DRAWER_WIDTH,
    maxWidth: "92vw",
    height: "100%",
    maxHeight: "100dvh",
    background: isLight(t) ? t.panel : t.bg,
    borderLeft: `1px solid ${overviewBorderStrong(t)}`,
    boxShadow: isLight(t)
      ? "-16px 0 40px rgba(26, 35, 50, 0.08)"
      : "-18px 0 48px rgba(0, 0, 0, 0.35)",
    display: "flex",
    flexDirection: "column",
    zIndex: 201,
    pointerEvents: "auto",
    fontFamily: t.sans,
    color: t.ink,
  };
}

export function detailHeadStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    alignItems: "flex-start",
    borderBottom: `1px solid ${overviewBorder(t)}`,
    display: "flex",
    flexShrink: 0,
    justifyContent: "space-between",
    padding: "20px 24px 16px",
    gap: 16,
  };
}

export function detailEyebrowStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.accent,
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontFamily: t.sans,
  };
}

export function detailCompanyStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.ink,
    display: "block",
    fontSize: 17,
    fontWeight: 650,
    letterSpacing: "-0.01em",
    marginTop: 4,
    fontFamily: t.sans,
  };
}

export function detailCloseBtnStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { hovered?: boolean },
): CSSProperties {
  return {
    background: opts?.hovered ? t.panelAlt : t.panel,
    border: `1px solid ${overviewBorder(t)}`,
    borderRadius: 8,
    color: opts?.hovered ? t.ink : t.inkSoft,
    cursor: "pointer",
    flexShrink: 0,
    fontSize: 13,
    height: 32,
    width: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: t.sans,
  };
}

export function detailStepsStyle(t: Theme = OVERVIEW_THEME, tabCount = 6): CSSProperties {
  return {
    background: t.panelInner,
    border: `1px solid ${overviewBorder(t)}`,
    borderRadius: 10,
    display: "grid",
    flexShrink: 0,
    gap: 2,
    gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
    margin: "12px 24px 0",
    padding: 3,
  };
}

export function detailStepStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { active?: boolean; complete?: boolean },
): CSSProperties {
  const active = opts?.active ?? false;
  const complete = opts?.complete ?? false;
  return {
    alignItems: "center",
    background: active ? `${t.accent}14` : "transparent",
    border: "none",
    borderRadius: 8,
    color: active ? t.ink : complete ? t.inkSoft : t.muted,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    fontFamily: t.sans,
    gap: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 0,
    padding: "6px 4px",
    textAlign: "center",
    transition: "background 0.14s, color 0.14s",
  };
}

export function detailStepIxStyle(t: Theme = OVERVIEW_THEME, opts?: { active?: boolean }): CSSProperties {
  return {
    alignItems: "center",
    background: opts?.active ? t.accent : t.panelAlt,
    borderRadius: "50%",
    color: opts?.active ? t.bg : t.inkSoft,
    display: "flex",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    height: 20,
    justifyContent: "center",
    width: 20,
  };
}

export function detailStepLabelStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { active?: boolean; complete?: boolean; narrow?: boolean },
): CSSProperties {
  return {
    color: opts?.active ? t.accent : opts?.complete ? t.inkSoft : t.muted,
    display: "block",
    fontSize: opts?.narrow ? 10 : 11.5,
    fontWeight: opts?.active ? 700 : 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    maxWidth: "100%",
    overflow: "hidden",
    textAlign: "center",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
  };
}

export function detailStepCountStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { active?: boolean; complete?: boolean; narrow?: boolean },
): CSSProperties {
  return {
    color: opts?.complete ? t.accent : opts?.active ? t.inkSoft : t.muted,
    display: "block",
    fontFamily: t.mono,
    fontSize: opts?.narrow ? 9 : 10,
    fontWeight: opts?.complete ? 700 : 600,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    textAlign: "center",
    whiteSpace: "nowrap",
    width: "100%",
  };
}

export function detailProgressStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    background: t.panelAlt,
    borderRadius: 999,
    flexShrink: 0,
    height: 4,
    margin: "14px 24px 0",
    overflow: "hidden",
  };
}

export function detailProgressBarStyle(t: Theme = OVERVIEW_THEME, widthPct: number): CSSProperties {
  return {
    background: t.accent,
    borderRadius: 999,
    height: "100%",
    width: `${widthPct}%`,
    transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

export function detailBodyStyle(): CSSProperties {
  return {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px 28px",
  };
}

export function detailSectionHeadStyle(): CSSProperties {
  return {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    marginBottom: 18,
  };
}

export function detailSectionIconStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    alignItems: "center",
    background: `${t.accent}1A`,
    border: `1px solid ${overviewAccentLine(t)}`,
    borderRadius: 10,
    color: t.accent,
    display: "flex",
    flexShrink: 0,
    fontSize: 18,
    height: 40,
    justifyContent: "center",
    width: 40,
  };
}

export function detailSectionMetaStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.muted,
    fontSize: 12,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.4,
    marginTop: 4,
  };
}

export function detailFieldsGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: "16px 12px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  };
}

export function detailQuestionCardStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${overviewBorder(t)}`,
    borderRadius: 10,
    marginBottom: 0,
    padding: "12px 12px 10px",
  };
}

export function detailSectionTitleStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.ink,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    fontFamily: t.sans,
  };
}

export function detailSectionSubStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.muted,
    fontSize: 12.5,
    marginTop: 2,
    fontFamily: t.sans,
  };
}

export function detailQuestionStyle(): CSSProperties {
  return { marginBottom: 22 };
}

export function detailPromptStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.ink,
    fontSize: 13.5,
    fontWeight: 600,
    marginBottom: 11,
    fontFamily: t.sans,
  };
}

export function detailQSubStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.muted,
    fontSize: 12,
    lineHeight: 1.5,
    margin: "-6px 0 11px",
    fontFamily: t.sans,
  };
}

export function detailGroupLabelStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.accent,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    margin: "8px 0 14px",
    textTransform: "uppercase",
    fontFamily: t.sans,
  };
}

export function detailTextareaStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { focused?: boolean; inset?: boolean },
): CSSProperties {
  return {
    background: opts?.inset ? t.panelInner : t.panel,
    border: `1px solid ${opts?.focused ? t.accent : overviewBorder(t)}`,
    borderRadius: 9,
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    lineHeight: 1.55,
    padding: "12px 14px",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    marginTop: 8
  };
}

export function detailInputStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { focused?: boolean; inset?: boolean },
): CSSProperties {
  return {
    ...detailTextareaStyle(t, opts),
    lineHeight: 1.35,
    minHeight: 40,
    padding: "9px 12px",
    resize: "none",
  };
}

export function detailFundingListStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };
}

export function detailFundingRowStyle(): CSSProperties {
  return {
    alignItems: "center",
    display: "grid",
    gap: 6,
    gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 1.2fr) 28px",
  };
}

export function detailFundingAddStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { hovered?: boolean },
): CSSProperties {
  return {
    background: "transparent",
    border: "none",
    color: opts?.hovered ? t.ink : t.accent,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 0",
    textAlign: "left",
  };
}

export function detailFundingRemoveStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { hovered?: boolean },
): CSSProperties {
  return {
    alignItems: "center",
    background: "transparent",
    border: "none",
    color: opts?.hovered ? t.ink : t.muted,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 18,
    height: 28,
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
    width: 28,
  };
}

export function detailOptsStyle(opts?: { stacked?: boolean; narrow?: boolean }): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    // Design: 2-col by default; stack when ≤3 options (or narrow viewport).
    gridTemplateColumns: opts?.stacked || opts?.narrow ? "1fr" : "1fr 1fr",
  };
}

/**
 * Answer option tiles — match Design `.sc-drawer-opt` / `.is-selected`
 * (PatriotPayJourney.css). Light selected uses status-good text+border;
 * dark selected uses text-1 + status-good-line.
 */
export function detailOptStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { selected?: boolean; hovered?: boolean; unknown?: boolean },
): CSSProperties {
  const selected = opts?.selected ?? false;
  const hovered = opts?.hovered ?? false;
  const unknown = opts?.unknown ?? false;
  const light = isLight(t);

  let background: string;
  let borderColor: string;
  let color: string;

  if (selected) {
    background = overviewStatusGoodDim(t);
    borderColor = light ? OVERVIEW_STATUS.good : overviewStatusGoodLine(t);
    color = light ? OVERVIEW_STATUS.good : t.ink;
  } else if (hovered) {
    background = t.panel;
    borderColor = overviewBorderStrong(t);
    color = t.ink;
  } else {
    // Light: Design overrides opt bg to page bg (#F7F8FA); dark: surface-2 (panel).
    background = light ? t.bg : t.panel;
    borderColor = overviewBorder(t);
    color = light ? t.ink : t.inkSoft;
  }

  return {
    background,
    border: unknown
      ? `1.5px dashed ${selected ? borderColor : overviewBorderStrong(t)}`
      : `1px solid ${borderColor}`,
    borderRadius: 9,
    color,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: selected ? 600 : 500,
    padding: "11px 14px",
    textAlign: "center",
    transition: "border-color 0.14s, background 0.14s, color 0.14s",
  };
}

export function detailFootStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    alignItems: "center",
    background: t.bg,
    borderTop: `1px solid ${overviewBorder(t)}`,
    display: "flex",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    padding: "14px 24px",
  };
}

export function detailFootErrorStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.negative,
    fontSize: 12,
    margin: 0,
    width: "100%",
    order: -1,
    fontFamily: t.sans,
  };
}

export function detailFootNavStyle(): CSSProperties {
  return { display: "flex", gap: 8 };
}

export function detailBtnStyle(
  t: Theme = OVERVIEW_THEME,
  variant: "ghost" | "secondary" | "primary",
  opts?: { hovered?: boolean; disabled?: boolean },
): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 8,
    cursor: opts?.disabled ? "default" : "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 600,
    padding: "9px 16px",
    transition: "background 0.14s, border-color 0.14s, opacity 0.14s",
    opacity: opts?.disabled ? 0.55 : variant === "primary" && opts?.hovered ? 0.92 : 1,
  };
  if (variant === "ghost") {
    return merge(base, {
      background: "transparent",
      border: "1px solid transparent",
      color: opts?.hovered ? t.ink : t.inkSoft,
    });
  }
  if (variant === "secondary") {
    return merge(base, {
      background: opts?.hovered ? t.panelAlt : t.panel,
      border: `1px solid ${overviewBorderStrong(t)}`,
      color: t.ink,
    });
  }
  return merge(base, {
    background: accentGradient(t),
    border: "1px solid transparent",
    color: "#07131c",
  });
}

/* ─── Benchmark / Add Sources (shared bench chrome) ─── */

export function benchHeadStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    padding: "24px 28px 18px",
    borderBottom: `1px solid ${overviewBorder(t)}`,
    flexShrink: 0,
    background: isLight(t) ? t.panel : undefined,
  };
}

export function benchHeadCopyStyle(): CSSProperties {
  return { minWidth: 0, flex: 1 };
}

export function benchTitleStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.ink,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.3px",
    margin: "0 0 8px",
    lineHeight: 1.15,
    fontFamily: t.sans,
  };
}

export function benchSubStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.muted,
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0,
    maxWidth: 440,
    fontFamily: t.sans,
  };
}

export function benchCloseBtnStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { hovered?: boolean },
): CSSProperties {
  const light = isLight(t);
  return {
    background: opts?.hovered
      ? light
        ? t.bg
        : t.panel
      : light
        ? t.panel
        : "transparent",
    border: `1px solid ${overviewBorder(t)}`,
    color: opts?.hovered ? t.ink : t.inkSoft,
    width: 30,
    height: 30,
    borderRadius: 6,
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: t.sans,
  };
}

export function benchBodyStyle(): CSSProperties {
  return {
    flex: 1,
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: "18px 28px 24px",
  };
}

export function benchIntroStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  const light = isLight(t);
  return {
    background: light ? "rgba(18, 184, 134, 0.08)" : t.panel,
    border: `1px solid ${overviewAccentLine(t)}`,
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 22,
  };
}

export function benchIntroStrongStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    display: "block",
    color: t.accent,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    letterSpacing: "-0.01em",
    fontFamily: t.sans,
  };
}

export function benchIntroPStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.inkSoft,
    fontSize: 12.5,
    lineHeight: 1.55,
    margin: 0,
    fontFamily: t.sans,
  };
}

export function benchFieldStyle(): CSSProperties {
  return { marginBottom: 22 };
}

export function benchFieldLabelStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    display: "block",
    color: t.muted,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
    lineHeight: 1.2,
    fontFamily: t.sans,
  };
}

export function benchFieldInputStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { focused?: boolean; hovered?: boolean; borderColor?: string },
): CSSProperties {
  const light = isLight(t);
  const idleBorder = overviewBorderStrong(t);
  const hoverBorder = light ? overviewBorderStrong(t) : "rgba(255, 255, 255, 0.18)";
  return {
    display: "block",
    width: "100%",
    height: 44,
    boxSizing: "border-box",
    background: light ? t.bg : t.panelAlt,
    border: `1px solid ${
      opts?.borderColor ??
      (opts?.focused ? t.accent : opts?.hovered ? hoverBorder : idleBorder)
    }`,
    borderRadius: 8,
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.25,
    padding: "10px 12px",
    outline: "none",
    transition: "border-color 0.15s ease, background 0.15s ease",
    WebkitAppearance: "none",
    appearance: "none",
  };
}

export function benchFieldBarStyle(): CSSProperties {
  return { marginTop: 14, padding: "0 6px" };
}

export function benchBarTrackStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    position: "relative",
    height: 4,
    background: isLight(t) ? t.rule : t.panelAlt,
    borderRadius: 2,
  };
}

export function benchBarBandStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    position: "absolute",
    top: 0,
    bottom: 0,
    background: t.accent,
    borderRadius: 2,
  };
}

export function benchBarTickLineStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { strong?: boolean },
): CSSProperties {
  const light = isLight(t);
  return {
    position: "absolute",
    top: -3,
    bottom: -3,
    width: 1,
    background: opts?.strong
      ? light
        ? "rgba(26, 35, 50, 0.28)"
        : "rgba(255,255,255,0.35)"
      : light
        ? "rgba(26, 35, 50, 0.16)"
        : "rgba(255,255,255,0.18)",
    transform: "translateX(-50%)",
  };
}

/** P25/P75/P90 labels — match OnboardingFlow benchmarking step visibility. */
export function benchBarTickLabelStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.inkSoft,
    fontFamily: t.sans,
    fontSize: 11,
    whiteSpace: "nowrap",
  };
}

export function benchBarDotStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    width: 14,
    height: 14,
    border: `2px solid ${isLight(t) ? t.panel : t.bg}`,
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    transition: "left 0.15s ease",
    zIndex: 2,
  };
}

export function benchFootNoteStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.muted,
    fontSize: 11.5,
    margin: "10px 0 0",
    fontFamily: t.sans,
  };
}

export function benchErrorStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.negative,
    fontSize: 12.5,
    margin: "10px 0 0",
    fontFamily: t.sans,
  };
}

export function benchLoadingStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    color: t.muted,
    fontSize: 13,
    margin: "12px 0",
    fontFamily: t.sans,
  };
}

export function benchActionsStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "14px 28px",
    borderTop: `1px solid ${overviewBorder(t)}`,
    background: isLight(t) ? t.panel : t.bg,
    flexShrink: 0,
  };
}

export function benchActionBtnStyle(
  t: Theme = OVERVIEW_THEME,
  variant: "cancel" | "save",
  opts?: { hovered?: boolean; disabled?: boolean },
): CSSProperties {
  const disabled = opts?.disabled ?? false;
  const hovered = opts?.hovered ?? false;
  const light = isLight(t);
  if (variant === "cancel") {
    return {
      fontFamily: t.sans,
      fontSize: 13,
      fontWeight: 500,
      padding: "9px 16px",
      borderRadius: 7,
      cursor: disabled ? "default" : "pointer",
      border: `1px solid ${overviewBorderStrong(t)}`,
      background: hovered && !disabled ? (light ? t.bg : t.panelAlt) : light ? t.panel : "transparent",
      color: hovered && !disabled ? t.ink : t.inkSoft,
      opacity: disabled ? 0.55 : 1,
    };
  }
  // Design light: primary navy (`t.ink`); dark: mint accent
  const saveBg = light ? t.ink : t.accent;
  const saveFg = light ? t.panel : "#042018";
  return {
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 16px",
    borderRadius: 7,
    cursor: disabled ? "default" : "pointer",
    border: `1px solid ${saveBg}`,
    background: saveBg,
    color: saveFg,
    filter: hovered && !disabled ? (light ? "brightness(0.9)" : "brightness(1.08)") : undefined,
    opacity: disabled ? 0.55 : 1,
  };
}
