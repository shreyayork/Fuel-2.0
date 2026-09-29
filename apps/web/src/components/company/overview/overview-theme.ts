import type { Theme } from "@/lib/theme";
import { useThemeOrSignal } from "@/components/ThemeContext";
import {
  OVERVIEW_STATUS,
  OVERVIEW_THEME,
  overviewAccentLine,
  overviewThemeForMode,
} from "./overviewTokens";
import type { OverviewCategoryId } from "@/lib/overview/constants";

/** Overview follows app theme mode with Design scorecard tokens. */
export function useOverviewTheme(): Theme {
  const appTheme = useThemeOrSignal();
  return overviewThemeForMode(appTheme.mode);
}

/** Score-tier keys mapped to Design `--status-good|watch|bad`. */
export type OverviewScoreTier = keyof typeof OVERVIEW_STATUS;

export function overviewScoreTier(score: number): OverviewScoreTier {
  // strong|above → good; around|below → watch; weak → bad
  if (score >= 65) return "good";
  if (score >= 35) return "watch";
  return "bad";
}

/** Score-tier colours from Design ScorecardV2 `colourFromScore` / `toneColour`. */
export function overviewScoreTierColor(score: number): string {
  return OVERVIEW_STATUS[overviewScoreTier(score)];
}

export function overviewCategoryStyle(
  categoryId: OverviewCategoryId,
  t: Theme = OVERVIEW_THEME,
): { accent: string; dim: string; border: string } {
  // Design ScorecardV2 CATEGORY_META: R&D + GTM share green; G&A is watch/amber.
  if (categoryId === "dev" || categoryId === "mkt") {
    return {
      accent: t.accent,
      dim: t.accentTint,
      border: overviewAccentLine(t),
    };
  }
  return {
    accent: OVERVIEW_STATUS.watch,
    dim: "rgba(245,166,35,0.10)",
    border: "rgba(245,166,35,0.28)",
  };
}

export function overviewCategoryAccent(
  categoryId: OverviewCategoryId,
  t: Theme = OVERVIEW_THEME,
): string {
  return overviewCategoryStyle(categoryId, t).accent;
}
