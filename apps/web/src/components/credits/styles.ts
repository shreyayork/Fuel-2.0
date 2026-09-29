import type { CSSProperties } from "react";
import {
  accentChipBg,
  accentChipBorder,
  accentChipFg,
  accentGradient,
  onAccentText,
  type Theme,
} from "@/lib/theme";

export function creditIndicatorWrap(): CSSProperties {
  return {
    margin: "0 -6px",
    minWidth: 0,
    padding: "0 6px 10px",
    position: "relative",
  };
}

export function creditIndicatorBtn(t: Theme): CSSProperties {
  return {
    alignItems: "stretch",
    background: t.borderFaint,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontFamily: "inherit",
    padding: "8px 10px",
    width: "100%",
  };
}

export function creditIndicatorSummary(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
    width: "100%",
  };
}

export function creditIndicatorAmount(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.01em",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
}

export function creditIndicatorTotal(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontWeight: 700,
  };
}

export function creditIndicatorTrack(t: Theme): CSSProperties {
  return {
    background: t.borderSubtle,
    borderRadius: 999,
    display: "block",
    flex: "0 0 auto",
    height: 6,
    minHeight: 6,
    overflow: "hidden",
    width: "100%",
  };
}

export function creditBarFill(
  t: Theme,
  tone: "teal" | "amber" | "red",
): CSSProperties {
  const color =
    tone === "teal" ? t.accent : tone === "amber" ? t.warn : t.negative;
  return {
    background: color,
    borderRadius: 999,
    display: "block",
    height: "100%",
    minWidth: 3,
    transition: "width 0.45s ease, background 0.3s ease",
  };
}

export function creditPlanBadge(t: Theme, plan: "free" | "pro"): CSSProperties {
  if (plan === "pro") {
    return {
      background: accentChipBg(t),
      border: `1px solid ${accentChipBorder(t)}`,
      borderRadius: 999,
      color: t.ink,
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.08em",
      padding: "2px 7px",
      textTransform: "uppercase",
    };
  }
  return {
    background: t.borderFaint,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 999,
    color: t.muted,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.08em",
    padding: "2px 7px",
    textTransform: "uppercase",
  };
}

export function creditPopoverSurface(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: t.panelAlt,
    border: `1px solid ${t.accent}3D`,
    borderRadius: 12,
    boxShadow: `0 12px 40px ${t.overlay}`,
    boxSizing: "border-box",
    fontFamily: t.sans,
    maxWidth: "min(360px, calc(100vw - 24px))",
    minWidth: 0,
    padding: 16,
    width: "100%",
    ...extra,
  };
}

export function creditPopoverPortal(extra?: CSSProperties): CSSProperties {
  return {
    position: "fixed",
    zIndex: 2050,
    ...extra,
  };
}

export function creditPopoverTitle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.4,
    margin: "0 0 8px",
  };
}

export function creditPopoverText(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontSize: 12,
    lineHeight: 1.55,
    margin: "0 0 8px",
  };
}

export function creditPopoverEmphasis(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontWeight: 700,
  };
}

export function creditPopoverCountdown(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.mono,
    fontSize: 18,
    fontWeight: 800,
    margin: "8px 0 12px",
  };
}

export function creditPopoverStats(t: Theme): CSSProperties {
  return {
    background: t.borderFaint,
    borderRadius: 8,
    display: "grid",
    gap: 6,
    margin: "10px 0",
    padding: 10,
  };
}

export function creditPopoverStatRow(t: Theme): CSSProperties {
  return {
    color: t.muted,
    display: "flex",
    fontSize: 11.5,
    justifyContent: "space-between",
  };
}

export function creditPopoverActions(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
  };
}

export function creditPrimaryButton(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: accentGradient(t),
    border: "none",
    borderRadius: 8,
    color: onAccentText(t),
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 800,
    padding: "11px 14px",
    ...extra,
  };
}

export function creditGhostButton(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 8,
    color: t.muted,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 14px",
    ...extra,
  };
}

export function creditButtonInner(): CSSProperties {
  return {
    alignItems: "center",
    display: "inline-flex",
    gap: 8,
    justifyContent: "center",
    width: "100%",
  };
}

export function creditButtonSpinner(
  t: Theme,
  variant: "primary" | "ghost" = "primary",
): CSSProperties {
  const color = variant === "primary" ? onAccentText(t) : t.muted;
  return {
    animation: "fuel-spin 700ms linear infinite",
    border: `2px solid color-mix(in srgb, ${color} 40%, transparent)`,
    borderRadius: "50%",
    borderTopColor: color,
    flexShrink: 0,
    height: 14,
    width: 14,
  };
}

export function creditCostList(): CSSProperties {
  return {
    display: "grid",
    gap: 5,
    marginTop: 10,
  };
}

export function creditCostRow(t: Theme): CSSProperties {
  return {
    color: t.muted,
    display: "flex",
    flexWrap: "wrap",
    fontSize: 11,
    gap: "2px 12px",
    justifyContent: "space-between",
  };
}

const SHELL_MAIN_PAD_TOP = 28;
const SHELL_MAIN_PAD_X = 40;

function creditBlockBannerBackground(t: Theme): string {
  // Opaque only — semi-transparent tints let scrolled content show through sticky.
  if (t.mode === "editorial") {
    return `linear-gradient(135deg, color-mix(in srgb, ${t.warnSoft} 92%, ${t.warn}) 0%, color-mix(in srgb, ${t.warnSoft} 58%, ${t.accentSoft}) 52%, color-mix(in srgb, ${t.warnSoft} 82%, ${t.warn}) 100%)`;
  }
  return `color-mix(in srgb, ${t.warn} 16%, ${t.panelAlt})`;
}

export function creditCancelBannerBackground(t: Theme): string {
  if (t.mode === "editorial") {
    return `linear-gradient(135deg, color-mix(in srgb, ${t.warnSoft} 70%, ${t.negative}) 0%, color-mix(in srgb, ${t.warnSoft} 88%, ${t.warn}) 100%)`;
  }
  return `color-mix(in srgb, ${t.negative} 18%, ${t.panelAlt})`;
}

export function creditBlockBannerStickyShell(
  t: Theme,
  opts?: { flushTop?: boolean },
): CSSProperties {
  const flushTop = opts?.flushTop ?? true;
  return {
    background: creditBlockBannerBackground(t),
    marginBottom: 20,
    marginLeft: -SHELL_MAIN_PAD_X,
    marginRight: -SHELL_MAIN_PAD_X,
    marginTop: flushTop ? -SHELL_MAIN_PAD_TOP : 0,
    position: "sticky",
    top: 0,
    zIndex: 30,
  };
}

export function creditBlockBanner(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    alignItems: "center",
    background: creditBlockBannerBackground(t),
    color: t.inkSoft,
    display: "flex",
    flexWrap: "wrap",
    fontFamily: t.sans,
    fontSize: 12.5,
    gap: 12,
    justifyContent: "space-between",
    lineHeight: 1.45,
    padding: "10px 16px",
    width: "100%",
    ...extra,
  };
}

export function creditBlockBannerLeading(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    flex: 1,
    gap: 10,
    minWidth: 0,
  };
}

export function creditBlockBannerText(t: Theme): CSSProperties {
  return {
    color: t.inkSoft,
    fontSize: 12.5,
    lineHeight: 1.45,
    minWidth: 0,
  };
}

export function creditBlockBannerCountdown(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.mono,
    fontSize: 12,
    fontWeight: 600,
  };
}

export function creditBlockBannerActions(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: 8,
  };
}

export function creditBlockBannerAction(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.accent}59`,
    borderRadius: 6,
    color: t.accent,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 12px",
    whiteSpace: "nowrap",
  };
}

export function creditUpgradeOverlay(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.overlay,
    display: "flex",
    inset: 0,
    justifyContent: "center",
    position: "fixed",
    zIndex: 2000,
  };
}

export function creditUpgradeModal(t: Theme): CSSProperties {
  return {
    background: t.panelAlt,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 14,
    fontFamily: t.sans,
    fontSize: 14,
    maxHeight: "90vh",
    maxWidth: 560,
    overflow: "auto",
    padding: 24,
    width: "calc(100% - 32px)",
  };
}

export function creditUpgradeTagline(t: Theme): CSSProperties {
  return {
    color: t.accent,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.45,
    margin: "0 0 10px",
  };
}

export function creditUpgradeSubtitle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontSize: 13,
    lineHeight: 1.5,
    margin: "-6px 0 14px",
  };
}

export function creditUpgradeTitle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.35,
    margin: "0 0 14px",
  };
}

export function creditUpgradeIncludes(t: Theme): CSSProperties {
  return {
    color: t.inkSoft,
    fontSize: 13,
    lineHeight: 1.55,
    margin: "0 0 16px",
    paddingLeft: 18,
  };
}

export function creditBillingGrid(): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "1fr 1fr",
    marginBottom: 14,
  };
}

export function creditBillingOption(t: Theme, selected: boolean): CSSProperties {
  return {
    background: selected ? t.accentTint : t.borderFaint,
    border: `1px solid ${selected ? `${t.accent}59` : t.borderSubtle}`,
    borderRadius: 8,
    color: t.ink,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    padding: 12,
    position: "relative",
    textAlign: "left",
  };
}

export function creditBillingRecommended(t: Theme): CSSProperties {
  return {
    background: accentGradient(t),
    borderRadius: 999,
    color: onAccentText(t),
    fontSize: 9,
    fontWeight: 900,
    left: 8,
    padding: "2px 7px",
    position: "absolute",
    top: -8,
  };
}

export function creditBillingCurrentPlan(t: Theme): CSSProperties {
  return {
    background: t.ink,
    borderRadius: 999,
    color: t.bg,
    fontSize: 9,
    fontWeight: 900,
    left: 8,
    letterSpacing: "0.04em",
    padding: "2px 7px",
    position: "absolute",
    textTransform: "uppercase",
    top: -8,
  };
}

export function creditBillingNewPricing(t: Theme): CSSProperties {
  return {
    background: `${t.warn}22`,
    border: `1px solid ${t.warn}66`,
    borderRadius: 999,
    color: t.warn,
    fontSize: 9,
    fontWeight: 800,
    left: 8,
    letterSpacing: "0.04em",
    padding: "2px 7px",
    position: "absolute",
    textTransform: "uppercase",
    top: -8,
  };
}

export function creditBillingLabel(): CSSProperties {
  return {
    fontSize: 11,
    opacity: 0.8,
    textTransform: "uppercase",
  };
}

export function creditBillingPrice(): CSSProperties {
  return {
    fontSize: 22,
  };
}

export function creditBillingPriceStruck(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontSize: 14,
    fontWeight: 600,
    marginRight: 8,
    textDecoration: "line-through",
  };
}

export function creditBillingYouPay(t: Theme): CSSProperties {
  return {
    color: t.accent,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    marginBottom: 2,
    textTransform: "uppercase",
  };
}

export function creditBillingSub(t: Theme): CSSProperties {
  return {
    color: accentChipFg(t),
    fontSize: 12,
    marginTop: 2,
  };
}

export function creditGrandfatherBanner(t: Theme): CSSProperties {
  return {
    background: `${t.warn}14`,
    border: `1px solid ${t.warn}44`,
    borderRadius: 8,
    color: t.inkSoft,
    fontSize: 13,
    lineHeight: 1.45,
    marginBottom: 14,
    padding: "12px 14px",
  };
}

export function creditGrandfatherBannerTitle(t: Theme): CSSProperties {
  return {
    color: t.warn,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.05em",
    marginBottom: 6,
    textTransform: "uppercase",
  };
}

export function creditGrandfatherCompare(): CSSProperties {
  return {
    alignItems: "baseline",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 6px",
    marginTop: 8,
  };
}

export function creditGrandfatherCompareItem(t: Theme): CSSProperties {
  return {
    color: t.inkSoft,
    fontSize: 13,
  };
}

export function creditGrandfatherCompareValue(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 16,
    fontWeight: 700,
  };
}

export function creditUpgradeFootnote(t: Theme): CSSProperties {
  return {
    color: t.mutedSoft,
    fontSize: 12,
    lineHeight: 1.45,
    margin: "10px 0 10px",
    textAlign: "center",
  };
}

export function creditUpgradeTabs(): CSSProperties {
  return {
    display: "flex",
    gap: 8,
    marginBottom: 16,
  };
}

export function creditUpgradeTab(t: Theme, active: boolean): CSSProperties {
  return {
    background: active ? t.accentTint : t.borderFaint,
    border: `1px solid ${active ? `${t.accent}59` : t.borderSubtle}`,
    borderRadius: 8,
    color: active ? t.ink : t.muted,
    cursor: "pointer",
    flex: 1,
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 700,
    padding: 10,
  };
}

export function creditTopUpGate(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontSize: 14,
    lineHeight: 1.55,
    margin: "0 0 14px",
  };
}

export function creditUpgradeLink(t: Theme): CSSProperties {
  return {
    background: "none",
    border: "none",
    color: t.accent,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 700,
    padding: 0,
    textAlign: "left",
    width: "100%",
  };
}

export function creditTopUpGrid(): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    marginBottom: 16,
  };
}

export function creditTopUpOption(t: Theme, selected: boolean): CSSProperties {
  return {
    background: selected ? `${t.accent}1A` : t.borderFaint,
    border: `1px solid ${selected ? `${t.accent}59` : t.borderSubtle}`,
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "inherit",
    padding: 12,
    textAlign: "left",
  };
}

export function creditTopUpOptionHead(): CSSProperties {
  return {
    alignItems: "flex-start",
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
  };
}

export function creditTopUpOptionTitle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 15,
    fontWeight: 600,
  };
}

export function creditTopUpBadges(): CSSProperties {
  return {
    display: "flex",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  };
}

export function creditTopUpBadgePopular(t: Theme): CSSProperties {
  return {
    background: `${t.accent}29`,
    border: `1px solid ${t.accent}47`,
    borderRadius: 999,
    color: accentChipFg(t),
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.04em",
    padding: "2px 7px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

export function creditTopUpBadgeDiscount(t: Theme): CSSProperties {
  return {
    background: `${t.warn}1F`,
    border: `1px solid ${t.warn}3D`,
    borderRadius: 999,
    color: t.warn,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.04em",
    padding: "2px 7px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

export function creditTopUpMeta(): CSSProperties {
  return {
    alignItems: "baseline",
    display: "flex",
    gap: 10,
    marginTop: 6,
  };
}

export function creditTopUpCredits(t: Theme): CSSProperties {
  return {
    color: accentChipFg(t),
    fontSize: 15,
    fontWeight: 800,
  };
}

export function creditTopUpPrice(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontSize: 15,
    fontWeight: 800,
  };
}

export function creditTopUpBlurb(t: Theme): CSSProperties {
  return {
    color: t.mutedSoft,
    fontSize: 13,
    lineHeight: 1.45,
    margin: "6px 0 0",
  };
}

export function creditToastShell(): CSSProperties {
  return {
    bottom: 24,
    left: 16,
    pointerEvents: "none",
    position: "fixed",
    right: 16,
    display: "flex",
    justifyContent: "flex-end",
    zIndex: 2100,
  };
}

export function creditToast(t: Theme, phase: "in" | "out"): CSSProperties {
  return {
    alignItems: "flex-start",
    animation:
      phase === "in"
        ? "creditToastIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both"
        : "creditToastOut 0.22s ease both",
    background: t.panelAlt,
    border: `1px solid ${t.accent}47`,
    borderRadius: 10,
    boxShadow: `0 12px 40px ${t.overlay}`,
    boxSizing: "border-box",
    color: t.ink,
    display: "flex",
    fontFamily: t.sans,
    fontSize: 13,
    gap: 10,
    lineHeight: 1.45,
    maxWidth: "min(360px, 100%)",
    minWidth: 0,
    width: "100%",
    padding: "12px 14px",
    pointerEvents: "auto",
  };
}

export function creditToastMessage(): CSSProperties {
  return {
    flex: 1,
    paddingTop: 1,
  };
}

export function creditToastDismiss(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: "none",
    color: t.muted,
    cursor: "pointer",
    flexShrink: 0,
    fontFamily: "inherit",
    fontSize: 18,
    lineHeight: 1,
    padding: 0,
  };
}
