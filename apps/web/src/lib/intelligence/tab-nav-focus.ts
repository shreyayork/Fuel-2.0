/**
 * Deep-link focus (`highlightIntelIds` from Initiatives / Data Room) lives on
 * the company workspace parent so Intelligence can remount without losing it.
 * That also means leave-and-return keeps the scoped list — unlike Initiatives
 * detail selection, which is local state and clears on unmount.
 *
 * Top-nav selection of Intelligence must exit focus the same way "Show all
 * intelligence" does. Deep-link handlers call `setTab("intelligence")` + set
 * ids directly and never go through this helper.
 */
export function shouldClearIntelligenceFocusOnTopNav(nextTab: string): boolean {
  return nextTab === "intelligence";
}
