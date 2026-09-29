import type { Theme, ThemeMode } from "@/lib/theme";
import { SIGNAL, THEMES } from "@/lib/theme";

/**
 * Overview / Scorecard surfaces use Design PatriotPayJourney tokens
 * (not the in-app York SIGNAL accent mapping). Explicit design evidence:
 * Design/src/app/PatriotPayJourney.css `:root` + `html[data-theme="light"]`.
 */

export const OVERVIEW_THEME_DARK: Theme = {
  ...SIGNAL,
  bg: "#0F1B24",
  panel: "#172632",
  panelAlt: "#1F3140",
  panelInner: "#0B141C",
  shell: "#132130",
  ink: "#F2F5F2",
  inkSoft: "#C5D4CC",
  muted: "#A3B4C0",
  mutedSoft: "#8496A4",
  rule: "#263947",
  ruleSoft: "#1F3140",
  accent: "#3DD68C",
  accentSoft: "rgba(61, 214, 140, 0.18)",
  accentTint: "rgba(61, 214, 140, 0.10)",
  positive: "#3DD68C",
  borderSubtle: "rgba(255, 255, 255, 0.07)",
  borderFaint: "rgba(255, 255, 255, 0.04)",
};

/** Design light Overview tokens (`html[data-theme="light"]`). */
export const OVERVIEW_THEME_LIGHT: Theme = {
  ...THEMES.editorial,
  bg: "#F7F8FA",
  panel: "#FFFFFF",
  panelAlt: "#F3F4F6",
  panelInner: "#FFFFFF",
  shell: "#FFFFFF",
  ink: "#1A2332",
  inkSoft: "#5B6B7C",
  muted: "#7A8B9A",
  mutedSoft: "#9AA8B5",
  rule: "#E8EAED",
  ruleSoft: "#F3F4F6",
  accent: "#12B886",
  accentSoft: "rgba(18, 184, 134, 0.10)",
  accentTint: "rgba(18, 184, 134, 0.08)",
  positive: "#12B886",
  borderSubtle: "#E8EAED",
  borderFaint: "#F3F4F6",
};

/** @deprecated Prefer `overviewThemeForMode` — kept for dark-default call sites. */
export const OVERVIEW_THEME = OVERVIEW_THEME_DARK;

export function overviewThemeForMode(mode: ThemeMode): Theme {
  return mode === "editorial" ? OVERVIEW_THEME_LIGHT : OVERVIEW_THEME_DARK;
}

export function overviewAccentLine(t: Theme): string {
  return t.mode === "editorial"
    ? "rgba(18, 184, 134, 0.28)"
    : "rgba(61, 214, 140, 0.22)";
}

export function overviewBorder(t: Theme): string {
  return t.mode === "editorial" ? "#E8EAED" : "rgba(255, 255, 255, 0.07)";
}

export function overviewBorderStrong(t: Theme): string {
  return t.mode === "editorial" ? "#D5D9DE" : "rgba(255, 255, 255, 0.12)";
}

/** Status colours shared by Design light + dark (signal tags, urgency). */
export const OVERVIEW_STATUS = {
  good: "#12B886",
  watch: "#F5A623",
  bad: "#E05C5C",
} as const;

/** Design `--status-good-dim` for selected answer tiles. */
export function overviewStatusGoodDim(t: Theme): string {
  return t.mode === "editorial"
    ? "rgba(18, 184, 134, 0.10)"
    : "rgba(18, 184, 134, 0.14)";
}

/** Design `--status-good-line` for selected answer tile borders (dark). */
export function overviewStatusGoodLine(t: Theme): string {
  return t.mode === "editorial"
    ? "rgba(18, 184, 134, 0.28)"
    : "rgba(18, 184, 134, 0.32)";
}

/** @deprecated Use `overviewAccentLine(t)`. */
export const OVERVIEW_ACCENT_LINE = "rgba(61, 214, 140, 0.22)";
/** @deprecated Use `overviewBorder(t)`. */
export const OVERVIEW_BORDER = "rgba(255, 255, 255, 0.07)";
/** @deprecated Use `overviewBorderStrong(t)`. */
export const OVERVIEW_BORDER_STRONG = "rgba(255, 255, 255, 0.12)";
