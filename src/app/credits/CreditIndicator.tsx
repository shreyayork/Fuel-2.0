import React, { useEffect, useRef } from "react";
import { getPlanLimits } from "./creditCatalog";
import { useCredits } from "./CreditProvider";
import { totalRemaining, dailyRemaining } from "./creditLogic";
import { CreditPopover } from "./CreditPopover";

export function CreditIndicator() {
  const { snapshot, barTone, barFill, popoverOpen, togglePopover, setPopoverOpen } = useCredits();
  const wrapRef = useRef<HTMLDivElement>(null);
  const planLabel = snapshot.plan === "pro" ? "Pro" : "Free";
  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);
  const totalCap = snapshot.monthlyLimit + snapshot.topUpBalance;
  const canEarnMore = snapshot.plan === "free" && snapshot.monthlyLimit < getPlanLimits().free.monthly;

  useEffect(() => {
    if (!popoverOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setPopoverOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [popoverOpen, setPopoverOpen]);

  return (
    <div
      className={`credit-indicator-wrap${popoverOpen ? " is-popover-open" : ""}`}
      ref={wrapRef}
    >
      {popoverOpen ? <CreditPopover /> : null}
      <button
        type="button"
        className="credit-indicator-btn"
        aria-expanded={popoverOpen}
        aria-label={`${planLabel} plan · ${remaining.toLocaleString()} of ${totalCap.toLocaleString()} credits available`}
        title={
          canEarnMore
            ? `${remaining.toLocaleString()} / ${totalCap.toLocaleString()} credits · complete profile to earn more`
            : `${remaining.toLocaleString()} / ${totalCap.toLocaleString()} credits · resets ${snapshot.monthlyResetLabel} · ${dailyLeft} daily left`
        }
        onClick={togglePopover}
      >
        <div className="credit-indicator-summary">
          <span className={`credit-plan-badge ${snapshot.plan}`}>{planLabel}</span>
          <span className="credit-indicator-amount">
            {remaining.toLocaleString()}<span className="credit-indicator-total"> / {totalCap.toLocaleString()}</span>
          </span>
        </div>
        <div className="credit-indicator-track" aria-hidden="true">
          <div
            className={`credit-indicator-fill ${barTone}`}
            style={{ width: `${Math.max(Math.round(barFill * 100), 0)}%` }}
          />
        </div>
      </button>
    </div>
  );
}
