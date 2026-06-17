import React from "react";
import { useCredits } from "./CreditProvider";
import { totalRemaining, dailyRemaining } from "./creditLogic";
import { CreditPopover } from "./CreditPopover";

export function CreditIndicator() {
  const { snapshot, barTone, barFill, togglePopover, popoverOpen } = useCredits();
  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);
  const totalCap = snapshot.monthlyLimit + snapshot.topUpBalance;
  const planLabel = snapshot.plan === "pro" ? "Pro" : "Free";

  return (
    <div className="credit-indicator-wrap">
      {popoverOpen ? <CreditPopover /> : null}
      <button
        type="button"
        className="credit-indicator-btn"
        aria-expanded={popoverOpen}
        aria-label={`${planLabel} plan · ${remaining.toLocaleString()} of ${totalCap.toLocaleString()} credits available`}
        title={`${remaining.toLocaleString()} / ${totalCap.toLocaleString()} credits · resets ${snapshot.monthlyResetLabel} · ${dailyLeft} daily left`}
        onClick={togglePopover}
      >
        <div className="credit-indicator-summary">
          <span className={`credit-plan-badge ${snapshot.plan}`}>{planLabel}</span>
          <span className="credit-indicator-amount">
            {remaining.toLocaleString()}<span className="credit-indicator-total"> / {totalCap.toLocaleString()}</span>
          </span>
        </div>
        <div className="credit-indicator-track" aria-hidden="true">
          <div className={`credit-indicator-fill ${barTone}`} style={{ width: `${Math.max(Math.round(barFill * 100), 0)}%` }} />
        </div>
      </button>
    </div>
  );
}
