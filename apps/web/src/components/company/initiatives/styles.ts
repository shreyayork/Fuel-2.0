import type { CSSProperties } from "react";
import { TOUCH_TARGET_MIN } from "@/lib/responsive";
import { ctaPrimaryStyle, ctaTertiaryStyle, type Theme } from "@/lib/theme";

export { drawerCloseBtnStyle } from "@/components/drawer/styles";

/** Spacing comes from `.fuel-company-tab` / `.fuel-init-tab` — avoid inline gap that overrides mobile CSS. */
export function initiativesPageStyle(): CSSProperties {
  return {};
}

export function initiativesHeadStyle(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    flexWrap: "nowrap",
    gap: 12,
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
    ...ctaPrimaryStyle(t),
    alignItems: "center",
    borderRadius: 10,
    boxSizing: "border-box",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 650,
    justifyContent: "center",
    minHeight: 40,
    padding: "0 14px",
  };
}

/** Design `.initiatives-secondary-btn` */
export function secondaryBtnStyle(t: Theme): CSSProperties {
  return {
    ...ctaTertiaryStyle(t),
    alignItems: "center",
    borderRadius: 10,
    boxSizing: "border-box",
    color: t.inkSoft,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 600,
    justifyContent: "center",
    minHeight: 40,
    padding: "0 14px",
  };
}

export function panelCardStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 12,
    boxShadow: t.mode === "editorial" ? `0 1px 0 ${t.borderFaint}` : "none",
  };
}

export function pillarRailColor(t: Theme, pillar: "mkt" | "dev" | "rev"): string {
  if (pillar === "mkt") return t.trackMarketing;
  if (pillar === "rev") return t.trackFinOps;
  return t.accent;
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

/** Shared control height — touch-friendly; Safari select height locked via CSS. */
export const INITIATIVE_FORM_CONTROL_MIN_HEIGHT_PX = TOUCH_TARGET_MIN;

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
    width: "100%",
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
  width: 100%;
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
@media (max-width: 767px) {
  .${INITIATIVE_FORM_CONTROL_CLASS} {
    font-size: 16px !important;
  }
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
    borderRadius: 12,
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
      ? { bg: `${t.muted}14`, color: t.muted }
      : status === "Suggested"
        ? { bg: `${t.warn}22`, color: t.warn }
        : { bg: `${t.accent}18`, color: t.accent };
  return {
    background: tone.bg,
    border: 0,
    borderRadius: 999,
    color: tone.color,
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 750,
    letterSpacing: "0.05em",
    padding: "4px 8px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

/** Design `.initiative-card-summary-main strong` */
export function initiativeCardTitleStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 14.5,
    fontWeight: 650,
    letterSpacing: "-0.015em",
    lineHeight: 1.3,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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

/** Compact single-line meta for list cards (kind · pillar · owner). */
export function initiativeCardMetaLineStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 12,
    fontStyle: "normal",
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.35,
    margin: 0,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

/** Desktop chip used in the richer list-card meta row. */
export function initiativeCardChipStyle(t: Theme): CSSProperties {
  return {
    background: t.mode === "editorial" ? t.bg : t.panelAlt,
    borderRadius: 999,
    color: t.muted,
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    whiteSpace: "nowrap",
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

export function drawerHeaderStyle(t: Theme): CSSProperties {
  return {
    borderBottom: `1px solid ${t.rule}`,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 18px",
  };
}

export function drawerHeaderTitleBlockStyle(): CSSProperties {
  return {
    flex: "1 1 auto",
    minWidth: 0,
  };
}

/** Status + Delete row — always full width under title/close. */
export function drawerHeaderActionsStyle(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    flexWrap: "nowrap",
    gap: 10,
    width: "100%",
  };
}

export function drawerTitleStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    lineHeight: 1.25,
    margin: 0,
    overflowWrap: "break-word",
  };
}

export function drawerMetaStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 12,
    lineHeight: 1.4,
    margin: "6px 0 0",
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

/** Design `.initiative-drawer-delete` — confirm/destructive filled control. */
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
    minHeight: TOUCH_TARGET_MIN,
    padding: "0 12px",
  };
}

/** Quiet delete affordance before confirm. */
export function drawerDeleteLinkStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: 0,
    color: t.negative,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 600,
    minHeight: TOUCH_TARGET_MIN,
    padding: "0 4px",
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
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
    padding: "16px 18px",
    width: "100%",
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
    minHeight: TOUCH_TARGET_MIN,
    padding: "0 12px",
  };
}

/** Progress section title — clearer hierarchy than the old all-caps eyebrow. */
export function progressSectionTitleStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.015em",
    lineHeight: 1.25,
    margin: 0,
  };
}

export function progressSectionSubtitleStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.4,
    margin: "4px 0 0",
  };
}

export function progressSectionHeadStyle(t: Theme): CSSProperties {
  return {
    borderBottom: `1px solid ${t.rule}`,
    paddingBottom: 14,
  };
}

/** Log / Link intelligence CTAs — active state when the form panel is open. */
export function progressCtaBtnStyle(t: Theme, active = false): CSSProperties {
  return {
    ...secondaryBtnStyle(t),
    background: active
      ? `${t.accent}18`
      : t.mode === "editorial"
        ? t.panel
        : t.panelAlt,
    border: `1px solid ${active ? `${t.accent}47` : t.rule}`,
    color: active ? t.accent : t.inkSoft,
    fontSize: 12.5,
    fontWeight: 650,
    minHeight: TOUCH_TARGET_MIN,
    padding: "0 14px",
  };
}

export function progressEmptyStateStyle(t: Theme): CSSProperties {
  return {
    background: t.mode === "editorial" ? t.bg : t.panelInner,
    border: `1px dashed ${t.rule}`,
    borderRadius: 10,
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 13,
    lineHeight: 1.55,
    padding: "18px 16px",
    textAlign: "center",
  };
}

export function progressFormCardStyle(t: Theme): CSSProperties {
  return {
    ...panelCardStyle(t),
    background: t.mode === "editorial" ? t.bg : t.panelInner,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 12,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginTop: 2,
    minWidth: 0,
    outline: "none",
    overflow: "visible",
    padding: 16,
    width: "100%",
  };
}

export function progressFieldLabelStyle(t: Theme): CSSProperties {
  return {
    ...fieldLabelStyle(t),
    fontSize: 11,
    letterSpacing: "0.06em",
    marginBottom: 8,
  };
}

export function progressLinkCardStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.mode === "editorial" ? t.bg : t.panelInner,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 10,
    boxSizing: "border-box",
    display: "flex",
    gap: 12,
    minWidth: 0,
    padding: "12px 14px",
    width: "100%",
  };
}

export function progressRoleBadgeStyle(t: Theme): CSSProperties {
  return {
    background: `${t.accent}18`,
    borderRadius: 6,
    color: t.accent,
    flexShrink: 0,
    fontFamily: t.sans,
    fontSize: 10,
    fontWeight: 750,
    letterSpacing: "0.05em",
    padding: "5px 8px",
    textTransform: "uppercase",
  };
}

export function progressFormActionsStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  };
}

/** Design `.initiative-view-meta` row (label | value). */
export function drawerMetaRowStyle(t: Theme, isLast: boolean): CSSProperties {
  return {
    alignItems: "baseline",
    borderBottom: isLast ? 0 : `1px solid ${t.rule}`,
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(0, 120px) minmax(0, 1fr)",
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
