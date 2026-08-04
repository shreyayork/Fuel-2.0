/** Standard Fuel UI colors — prefer CSS vars in styles; hex kept for canvas/SVG fallbacks. */
export const fuel = {
  text: "var(--fuel-text, #F2F5F2)",
  textMuted: "var(--fuel-text-muted, #8FA99A)",
  accent: "var(--fuel-accent, #12b886)",
  surface: "var(--fuel-surface, #1F3140)",
  surfaceInset: "var(--fuel-surface-inset, #0B1720)",
  surfaceRaised: "var(--fuel-surface-raised, #172632)",
  border: "var(--fuel-border, rgba(255,255,255,0.09))",
  borderAccent: "var(--fuel-border-accent, rgba(18,184,134,0.28))",
  statusGood: "var(--status-good, #12b886)",
  statusWatch: "var(--status-watch, #F5A623)",
  statusBad: "var(--status-bad, #E05C5C)",
  /** Semantic aliases — same three colors */
  statusSuccess: "var(--status-success, var(--status-good, #12b886))",
  statusWarning: "var(--status-warning, var(--status-watch, #F5A623))",
  statusError: "var(--status-error, var(--status-bad, #E05C5C))",
  statusGoodDim: "var(--status-good-dim)",
  statusWatchDim: "var(--status-watch-dim)",
  statusBadDim: "var(--status-bad-dim)",
  statusGoodLine: "var(--status-good-line)",
  statusWatchLine: "var(--status-watch-line)",
  statusBadLine: "var(--status-bad-line)",
} as const;
