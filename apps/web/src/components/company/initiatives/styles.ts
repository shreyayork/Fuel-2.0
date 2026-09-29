import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";

export function initiativesPageStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 16,
  };
}

export function initiativesHeadStyle(): CSSProperties {
  return {
    alignItems: "flex-start",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
  };
}

export function initiativesHeadActionsStyle(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  };
}

/** Design `.initiatives-primary-btn` */
export function primaryBtnStyle(t: Theme): CSSProperties {
  return {
    background: t.ink,
    border: `1px solid ${t.ink}`,
    borderRadius: 8,
    color: t.bg,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 600,
    padding: "9px 13px",
  };
}

/** Design `.initiatives-secondary-btn` */
export function secondaryBtnStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    color: t.inkSoft,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    padding: "9px 13px",
  };
}

/** Design `.initiatives-status-toggle` */
export function statusToggleStyle(t: Theme): CSSProperties {
  return {
    background: t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    display: "inline-flex",
    gap: 4,
    padding: 4,
    width: "fit-content",
  };
}

/** Design `.initiatives-status-toggle-btn` / `.is-active` */
export function statusToggleBtnStyle(t: Theme, active: boolean): CSSProperties {
  return {
    alignItems: "center",
    background: active ? `${t.accent}24` : "transparent",
    border: 0,
    borderRadius: 8,
    color: active ? t.ink : t.muted,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    gap: 8,
    padding: "8px 12px",
  };
}

export function panelCardStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
  };
}

export function emptyCardStyle(t: Theme): CSSProperties {
  return {
    ...panelCardStyle(t),
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 154,
    padding: 24,
    textAlign: "center",
  };
}

export function formCardStyle(t: Theme): CSSProperties {
  return {
    ...panelCardStyle(t),
    padding: 16,
  };
}

export const INITIATIVE_FORM_CONTROL_CLASS = "initiative-form-control";

/** Shared control height — Safari native select/date otherwise diverge from inputs. */
export const INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX = 40;

/** Design idle = `--bg-main` / `#F7F8FA`; focus → white + ink border (light). */
export function formControlStyle(t: Theme): CSSProperties {
  return {
    backgroundColor: t.mode === "editorial" ? t.bg : t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    boxSizing: "border-box",
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    lineHeight: 1.25,
    minHeight: INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX,
    outline: "none",
    padding: "10px 12px",
  };
}

export const INITIATIVE_CARD_CLASS = "initiative-list-card";
export const INITIATIVE_CARD_OPEN_HINT_CLASS = "initiative-card-open-hint";

/** Inject once on Initiatives tab — Design focus + list card hover. */
export function initiativeFormControlsCss(t: Theme): string {
  const focusBg = t.panel;
  const focusBorder = t.mode === "editorial" ? t.ink : t.accent;
  const hoverBg = t.panelAlt;
  const selectedBg = t.mode === "editorial" ? `${t.accent}1A` : `${t.accent}24`;
  const selectedBorder = `${t.accent}47`;
  return `
.${INITIATIVE_FORM_CONTROL_CLASS} {
  box-sizing: border-box;
  min-height: ${INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX}px;
}
/* Safari native <select> stacks UA padding on CSS padding → oversized height.
 * Fixed height + zero vertical padding keeps it aligned with input/button peers.
 * !important beats inline formControlStyle padding shorthand. */
select.${INITIATIVE_FORM_CONTROL_CLASS} {
  height: ${INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX}px !important;
  line-height: 1.25;
  max-height: ${INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX}px;
  min-height: ${INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX}px !important;
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}
.${INITIATIVE_FORM_CONTROL_CLASS}:focus {
  background-color: ${focusBg} !important;
  border-color: ${focusBorder} !important;
  outline: none;
}
.${INITIATIVE_FORM_CONTROL_CLASS}:focus-visible {
  background-color: ${focusBg} !important;
  border-color: ${focusBorder} !important;
  outline: none;
}
.${INITIATIVE_CARD_CLASS} {
  transition: background 0.15s, border-color 0.15s;
}
.${INITIATIVE_CARD_CLASS}:hover:not(.is-selected) {
  background: ${hoverBg};
  border-color: ${t.rule};
}
.${INITIATIVE_CARD_CLASS}.is-selected {
  background: ${selectedBg};
  border-color: ${selectedBorder};
}
.${INITIATIVE_CARD_OPEN_HINT_CLASS} {
  opacity: 0.85;
}
.${INITIATIVE_CARD_CLASS}:hover .${INITIATIVE_CARD_OPEN_HINT_CLASS} {
  color: ${t.inkSoft};
  opacity: 1;
}
`;
}

/** Design `.initiative-card` — selected/hover handled via injected CSS class. */
export function initiativeCardStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    overflow: "hidden",
  };
}

/** Design `.initiative-status` / `--active` / `--completed` */
export function initiativeStatusBadgeStyle(
  t: Theme,
  status: "Active" | "Completed" | "Suggested",
): CSSProperties {
  const tone =
    status === "Completed"
      ? { border: `${t.muted}73`, color: t.muted }
      : { border: `${t.accent}59`, color: t.accent };
  return {
    border: `1px solid ${tone.border}`,
    borderRadius: 4,
    color: tone.color,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.06em",
    padding: "2px 6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

/** Design `.initiative-card-summary-main strong` */
export function initiativeCardTitleStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.35,
  };
}

/** Design `.initiative-card-meta em` */
export function initiativeCardMetaStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontSize: 11,
    fontStyle: "normal",
    fontWeight: 500,
    letterSpacing: 0,
  };
}

export function drawerScrimStyle(t: Theme): CSSProperties {
  return {
    background: t.overlay,
    display: "flex",
    inset: 0,
    justifyContent: "flex-end",
    position: "fixed",
    zIndex: 1200,
  };
}

export function drawerStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    borderLeft: `1px solid ${t.rule}`,
    display: "flex",
    flexDirection: "column",
    fontFamily: t.sans,
    height: "100%",
    width: "min(480px, 100vw)",
  };
}

export function drawerEyebrowStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    marginBottom: 6,
    textTransform: "uppercase",
  };
}

export function sectionLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.mutedSoft,
    fontFamily: t.mono,
    fontSize: 10,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };
}

/** Design `.initiative-field-label` — Owner / Due row labels. */
export function fieldLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    display: "block",
    fontFamily: t.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    marginBottom: 6,
    textTransform: "uppercase",
  };
}

/** Initiative drawers — 45% of the viewport, full width on small screens. */
export function initiativeDrawerWidthStyle(): CSSProperties {
  return {
    maxWidth: "100vw",
    width: "min(100vw, max(45%, 480px))",
  };
}

/** Design `.initiative-drawer-delete`. */
export function drawerDeleteBtnStyle(t: Theme): CSSProperties {
  return {
    background: `${t.negative}1A`,
    border: `1px solid ${t.negative}59`,
    borderRadius: 8,
    color: t.negative,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    padding: "7px 11px",
  };
}

/** Design `.initiative-edit-btn` — text link, not a chip button. */
export function drawerEditLinkStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: 0,
    color: t.accent,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.02em",
    padding: 0,
  };
}

/** Design `.initiative-drawer-body .initiative-card-section`. */
export function drawerSectionCardStyle(t: Theme): CSSProperties {
  const isLight = t.mode === "editorial";
  return {
    background: isLight ? t.panel : t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "16px 18px",
  };
}

export function drawerSectionHeadStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    borderBottom: `1px solid ${t.rule}`,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 12,
  };
}

/** Design `.initiative-card-section-label`. */
export function drawerSectionLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.accent,
    fontFamily: t.sans,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
}

export function drawerMiniBtnStyle(t: Theme): CSSProperties {
  return {
    ...secondaryBtnStyle(t),
    fontSize: 11,
    fontWeight: 600,
    padding: "6px 10px",
  };
}

/** Design `.initiative-view-meta` row (label | value). */
export function drawerMetaRowStyle(t: Theme, isLast: boolean): CSSProperties {
  return {
    alignItems: "baseline",
    borderBottom: isLast ? 0 : `1px solid ${t.rule}`,
    display: "grid",
    gap: 16,
    gridTemplateColumns: "120px minmax(0, 1fr)",
    minWidth: 0,
    padding: "10px 0",
  };
}

export function drawerMetaDtStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0,
    margin: 0,
    textTransform: "none",
  };
}

export function drawerMetaDdStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
    overflowWrap: "anywhere",
  };
}

/** Split stored benefit copy into display bullets (newlines, list markers, or sentences). */
export function splitInitiativeBenefitBullets(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const sentences = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [trimmed];
}
