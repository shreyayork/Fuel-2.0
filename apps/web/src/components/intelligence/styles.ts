import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import { dataRoomSecondaryButtonStyle } from "@/components/data-room/styles";

export function sourcesPanelStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 0,
    overflow: "hidden",
  };
}

export function sourcesHeaderStyle(t: Theme): CSSProperties {
  return {
    alignItems: "flex-start",
    background:
      t.mode === "signal"
        ? `linear-gradient(135deg, ${t.panel} 0%, ${t.panelAlt} 100%)`
        : t.panel,
    borderBottom: `1px solid ${t.ruleSoft}`,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "16px 18px",
  };
}

export function timelinePanelStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 12,
    boxShadow:
      t.mode === "editorial" ? "0 1px 0 rgba(40,66,86,0.04)" : "none",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  };
}

export function companyTabPrimaryBtnStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.ink,
    border: `1px solid ${t.ink}`,
    borderRadius: 10,
    boxSizing: "border-box",
    color: t.mode === "editorial" ? t.panel : t.bg,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 650,
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    padding: "0 14px",
    whiteSpace: "nowrap",
  };
}

export function companyTabSecondaryBtnStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    boxSizing: "border-box",
    color: t.inkSoft,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 600,
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    padding: "0 14px",
    whiteSpace: "nowrap",
  };
}

export const TIMELINE_TYPE_COLUMN_PX = 92;

/**
 * Feed row columns: signal · value · quarter · chips. The chip track reserves
 * room for `Sources n` + `History n` side by side and grows with longer counts,
 * so the chips never spill over the quarter column.
 */
export const FEED_ROW_GRID_COLUMNS =
  "minmax(140px, 200px) minmax(0, 1fr) 4.75rem minmax(11rem, max-content)";

export function timelineRowStyle(
  t: Theme,
  opts?: { highlighted?: boolean; clickable?: boolean; narrow?: boolean },
): CSSProperties {
  const highlighted = opts?.highlighted ?? false;
  const narrow = opts?.narrow ?? false;
  const typeColumn = narrow
    ? `minmax(72px, ${TIMELINE_TYPE_COLUMN_PX}px)`
    : `${TIMELINE_TYPE_COLUMN_PX}px`;
  return {
    alignItems: "start",
    animation: highlighted ? "intelHighlight 1.6s ease-out 2" : undefined,
    background: highlighted ? `${t.accent}14` : t.panel,
    border: `1px solid ${highlighted ? t.accent : t.ruleSoft}`,
    borderRadius: 6,
    cursor: opts?.clickable ? "pointer" : undefined,
    display: "grid",
    gap: 14,
    gridTemplateColumns: `${typeColumn} minmax(0, 1fr) auto`,
    padding: "10px 12px",
    width: "100%",
  };
}

export function timelineTypeBadgeColumnStyle(): CSSProperties {
  return {
    alignSelf: "start",
    boxSizing: "border-box",
    minWidth: 0,
    width: "100%",
  };
}

export function timelineTypeBadgeStyle(t: Theme): CSSProperties {
  return {
    border: `1px solid ${t.rule}`,
    borderRadius: 4,
    boxSizing: "border-box",
    color: t.mutedSoft,
    display: "block",
    fontFamily: t.mono,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.06em",
    overflow: "hidden",
    padding: "2px 6px",
    textAlign: "left",
    textOverflow: "ellipsis",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    width: "100%",
  };
}

export function timelineRowContentStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
    overflow: "hidden",
  };
}

export function timelineRowMetaStyle(): CSSProperties {
  return {
    alignItems: "center",
    alignSelf: "start",
    display: "flex",
    flexShrink: 0,
    gap: 10,
    justifyContent: "flex-end",
  };
}

export function filterChipStyle(t: Theme, active: boolean): CSSProperties {
  return {
    background: active ? t.ink : "transparent",
    border: `1px solid ${active ? t.ink : t.rule}`,
    borderRadius: 999,
    color: active ? t.bg : t.inkSoft,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 11,
    padding: "4px 10px",
    textTransform: "capitalize",
  };
}

export function focusBannerStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: `${t.accent}14`,
    border: `1px solid ${t.accent}55`,
    borderRadius: 8,
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    padding: "10px 14px",
  };
}

export function inputStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    boxSizing: "border-box",
    color: t.ink,
    fontFamily: t.mono,
    fontSize: 12,
    padding: "8px 10px",
    width: "100%",
  };
}

/** Feed toolbar search — icon inset, full-width friendly, ≥44px touch. */
export function feedSearchFieldStyle(t: Theme): CSSProperties {
  return {
    ...inputStyle(t),
    borderRadius: 10,
    fontFamily: t.sans,
    fontSize: 16,
    minHeight: 44,
    paddingLeft: 40,
    paddingRight: 12,
    width: "100%",
  };
}

export function feedSearchIconStyle(t: Theme): CSSProperties {
  return {
    color: t.mutedSoft,
    fontSize: 15,
    left: 14,
    lineHeight: 1,
    pointerEvents: "none",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
  };
}

/** Drawer form fields — sans at feed input size (matches Add Source title/description). */
export function drawerFormInputStyle(t: Theme): CSSProperties {
  return {
    ...inputStyle(t),
    fontFamily: t.sans,
    fontSize: 12,
    lineHeight: 1.25,
  };
}

/** Single-line drawer controls (Signal / Value / Period) — shared height. */
export const DRAWER_FORM_CONTROL_MIN_HEIGHT_PX = 40;

export function drawerFormControlStyle(t: Theme): CSSProperties {
  return {
    ...drawerFormInputStyle(t),
    boxSizing: "border-box",
    minHeight: DRAWER_FORM_CONTROL_MIN_HEIGHT_PX,
  };
}

export const INTELLIGENCE_DRAWER_INPUT_CLASS = "intel-drawer-input";

/** Placeholder inherits drawer field typography (WebKit won't always inherit mono/sans). */
export function intelligenceDrawerInputCss(t: Theme): string {
  return `
.${INTELLIGENCE_DRAWER_INPUT_CLASS}::placeholder {
  color: ${t.muted};
  font-family: inherit;
  font-size: inherit;
  font-weight: 400;
  line-height: inherit;
  opacity: 1;
}
`;
}

export function ghostButtonStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    color: t.inkSoft,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 12px",
  };
}

export function primaryButtonStyle(t: Theme, disabled = false): CSSProperties {
  return dataRoomSecondaryButtonStyle(t, { disabled });
}

/** Outlined trigger aligned with design `signals-log-intelligence-btn`. */
export function logIntelligenceButtonStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    color: t.inkSoft,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 11.5,
    fontWeight: 800,
    padding: "7px 11px",
    whiteSpace: "nowrap",
  };
}

export function logFormRowStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: `${t.panelAlt}61`,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(140px, 1.4fr) 92px minmax(120px, 1fr) minmax(120px, 1fr) auto",
    padding: "10px 12px",
  };
}

export function logFormCancelStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.rule}`,
    borderRadius: 999,
    color: t.inkSoft,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 11,
    marginLeft: "auto",
    padding: "4px 10px",
  };
}
