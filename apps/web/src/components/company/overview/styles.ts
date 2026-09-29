/**
 * Overview page-chrome CSSProperties factories (Design scorecard tokens).
 * Class-based glance/advisor surfaces stay in `scorecardCss.ts`.
 */
import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import {
  OVERVIEW_THEME,
  overviewAccentLine,
  overviewBorderStrong,
} from "./overviewTokens";

export function overviewPageStyle(t: Theme = OVERVIEW_THEME): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 40,
    color: t.ink,
    fontFamily: t.sans,
  };
}

export function overviewPageLinkStyle(
  t: Theme = OVERVIEW_THEME,
  opts?: { hovered?: boolean },
): CSSProperties {
  const hovered = opts?.hovered ?? false;
  return {
    background: hovered ? t.accentTint : "transparent",
    border: `1px solid ${hovered ? overviewAccentLine(t) : overviewBorderStrong(t)}`,
    borderRadius: 8,
    color: hovered ? t.accent : t.ink,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    padding: "8px 14px",
    transition: "background 0.14s, border-color 0.14s, color 0.14s",
    whiteSpace: "nowrap",
  };
}

export function overviewTracksStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    paddingTop: 4,
  };
}
