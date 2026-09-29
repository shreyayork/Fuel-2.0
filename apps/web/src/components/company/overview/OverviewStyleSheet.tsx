"use client";

import { useMemo } from "react";
import { useOverviewTheme } from "./overview-theme";
import { overviewScorecardCss } from "./scorecardCss";

/**
 * Injects Overview styles from TypeScript (replaces overview-scorecard.css).
 * CSS variables are bound to Design scorecard tokens at injection time.
 */
export function OverviewStyleSheet() {
  const t = useOverviewTheme();
  const css = useMemo(() => overviewScorecardCss(t), [t]);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
