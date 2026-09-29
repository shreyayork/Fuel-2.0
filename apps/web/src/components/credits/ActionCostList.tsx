"use client";

import React from "react";
import type { Theme } from "@/lib/theme";
import {
  ACTION_COST_LIST_TEST_ID,
  CREDIT_SEE_COSTS_TEST_ID,
  formatActionCostsTooltip,
} from "@/lib/credits/action-cost-display";
import type { ActionCostRow } from "@/lib/credits/types";
import { useCredits } from "./CreditProvider";
import { creditCostList, creditCostRow } from "./styles";

export function ActionCostList({
  t,
  actionCosts,
}: {
  t: Theme;
  actionCosts: Array<Pick<ActionCostRow, "action" | "label" | "cost">>;
}) {
  if (actionCosts.length === 0) {
    return (
      <div style={creditCostList()} data-testid={ACTION_COST_LIST_TEST_ID}>
        <div style={creditCostRow(t)}>
          <span>No billable activities configured</span>
        </div>
      </div>
    );
  }
  return (
    <div style={creditCostList()} data-testid={ACTION_COST_LIST_TEST_ID}>
      {actionCosts.map((row) => (
        <div key={row.action} style={creditCostRow(t)}>
          <span>{row.label}</span>
          <span>{row.cost} cr</span>
        </div>
      ))}
    </div>
  );
}

/** Compact “see costs” control — hover shows unit costs; click opens credit popover. */
export function CreditSeeCostsControl({
  t,
  prefix = " · ",
}: {
  t: Theme;
  prefix?: string;
}) {
  const { actionCosts, setPopoverOpen } = useCredits();
  const tip = formatActionCostsTooltip(actionCosts);
  return (
    <>
      {prefix}
      <button
        type="button"
        data-testid={CREDIT_SEE_COSTS_TEST_ID}
        title={tip}
        aria-label={`See action costs. ${tip}`}
        onClick={(e) => {
          e.stopPropagation();
          setPopoverOpen(true);
        }}
        style={{
          background: "none",
          border: "none",
          color: t.accent,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: 600,
          padding: 0,
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        see costs
      </button>
    </>
  );
}
