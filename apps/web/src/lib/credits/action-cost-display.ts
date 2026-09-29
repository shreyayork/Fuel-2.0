import type { ActionCostRow, PopoverState } from "./types";

export const ACTION_COST_LIST_TEST_ID = "credit-action-costs";
export const CREDIT_SEE_COSTS_TEST_ID = "credit-see-costs";

/**
 * Popover states that must render the catalog ActionCostList.
 * Every PopoverState is included — omit only with an explicit product decision + test update.
 */
export const POPOVER_STATES_WITH_ACTION_COSTS = [
  "dailyBlocked",
  "monthlyEmpty",
  "runningLow",
  "justUnblocked",
  "healthy",
] as const satisfies readonly PopoverState[];

const SHOW_COSTS = new Set<PopoverState>(POPOVER_STATES_WITH_ACTION_COSTS);

export function popoverShowsActionCosts(state: PopoverState): boolean {
  return SHOW_COSTS.has(state);
}

/** Native tooltip / aria copy for compact surfaces (banner, toast, bar). */
export function formatActionCostsTooltip(
  actionCosts: ReadonlyArray<Pick<ActionCostRow, "label" | "cost">>,
): string {
  if (actionCosts.length === 0) return "No billable activities configured";
  return actionCosts.map((row) => `${row.label}: ${row.cost} cr`).join(" · ");
}
