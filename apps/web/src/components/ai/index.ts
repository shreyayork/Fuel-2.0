/**
 * Fuel AI-magic design system. Tiny, reusable primitives that give any
 * surface a consistent "the agent did this" feel. Use these instead of
 * one-off styles so that the magical aesthetic stays coherent as new
 * pages are built.
 *
 * Components here are intentionally small and presentation-only; no data
 * fetching, no business logic. They take props, they render JSX.
 */
export { MagicSourceChip } from "./MagicSourceChip";
export { MagicFieldReveal } from "./MagicFieldReveal";
export { MagicSidePanel, MagicSidePanelStep } from "./MagicSidePanel";
export { MagicShimmer } from "./MagicShimmer";
export { MagicSparkle } from "./MagicSparkle";
export { MagicGradientBorder } from "./MagicGradientBorder";

/** Brand color tokens used across the magic surface — keep in sync with
 *  the marketing components so the experience reads as one product. */
export const AI_TOKENS = {
  bg: "#0F1A24",
  panel: "#172632",
  panelInner: "#0B141C",
  accent: "#00B48A",
  accentSoft: "rgba(0,180,138,0.18)",
  accentTint: "rgba(0,180,138,0.08)",
  rule: "#263947",
  ink: "#F4F6F8",
  inkSoft: "#D5DCE2",
  muted: "#A8B6C2",
  mutedSoft: "#7D8E9C",
  warn: "#ECD67F",
  danger: "#FF6B5B",
} as const;
