import type { Fuel21ActionDrawerId } from "./Fuel21ActionDrawer.tsx";

/** Right companion bench panel ids (context + action dock). */
export type Fuel21CompanionBenchPanel = "context" | Fuel21ActionDrawerId;

/**
 * Delay when switching dock panels (simulates future API fetch).
 * Increase toward 1000–2000ms when wiring real backend loads.
 */
export const F21_COMPANION_PANEL_SWITCH_MS = 420;

/** Green eyebrow line — match Profile `sc-drawer-eyebrow` across companion panels. */
export const F21_COMPANION_EYEBROW = {
  profile: "✦ Fuel · Add details",
  context: "✦ Fuel · Context",
  intelligence: "✦ Fuel · Intelligence",
  initiatives: "✦ Fuel · Initiatives",
  dataroom: "✦ Fuel · Data room",
} as const;
