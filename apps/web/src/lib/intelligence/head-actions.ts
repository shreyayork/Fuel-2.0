/**
 * Intelligence tab header CTAs — always shown, not gated on benchmark data.
 * Labels must stay in sync with IntelligencePage head actions.
 */
export const INTELLIGENCE_HEAD_ACTION_LABELS = [
  "Add source",
  "Log intelligence",
  "Update benchmark",
] as const;

/**
 * Head CTAs render from the initial Intelligence state regardless of whether
 * portfolio/benchmark numbers have been submitted.
 */
export function shouldShowIntelligenceHeadActions(_hasBenchmarkData: boolean): boolean {
  return true;
}
