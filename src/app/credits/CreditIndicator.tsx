import React from "react";
import { useCredits } from "./CreditProvider";
import { totalRemaining, dailyRemaining } from "./creditLogic";
import { CreditPopover } from "./CreditPopover";

export function CreditIndicator() {
  const { snapshot, barTone, barFill, togglePopover, popoverOpen } = useCredits();
  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);

  return (
    <div className="credit-indicator-wrap">
      {popoverOpen ? <CreditPopover /> : null}
      <button
        type="button"
        className="credit-indicator-btn"
        aria-expanded={popoverOpen}
        aria-label="Credit usage"
        title={`${remaining} credits left · resets ${snapshot.monthlyResetLabel} · ${dailyLeft} daily left`}
        onClick={togglePopover}
      >
        <span className={`credit-indicator-track`} aria-hidden="true">
          <span className={`credit-indicator-fill ${barTone}`} style={{ width: `${Math.round(barFill * 100)}%` }} />
        </span>
        {snapshot.plan === "free" ? <span className="credit-plan-badge free">Free</span> : null}
      </button>
    </div>
  );
}
