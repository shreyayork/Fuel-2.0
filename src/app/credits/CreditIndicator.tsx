import React, { useMemo } from "react";
import { useAccountSettingsNavOptional } from "../account/AccountSettingsNav";
import {
  computeCreditBalance,
  PROFILE_TOTAL_CREDITS,
  type EarnedProfileCredits,
} from "../profileCredits";
import { useCredits } from "./CreditProvider";
import { totalRemaining, dailyRemaining } from "./creditLogic";
import { CreditPopover } from "./CreditPopover";

function profileBarTone(ratio: number): "teal" | "amber" | "red" {
  if (ratio <= 0.1) return "red";
  if (ratio <= 0.3) return "amber";
  return "teal";
}

export function CreditIndicator({
  earnedProfileCredits,
}: {
  /** When set, shows intelligence unlock balance (50 starting → 250 max) instead of monthly AI credits. */
  earnedProfileCredits?: EarnedProfileCredits;
}) {
  const { snapshot, barTone, barFill, popoverOpen, setPopoverOpen } = useCredits();
  const accountNav = useAccountSettingsNavOptional();
  const planLabel = snapshot.plan === "pro" ? "Pro" : "Free";

  const profileBalance = useMemo(
    () => computeCreditBalance(earnedProfileCredits ?? { modules: [], benchmark: false, intelligenceSources: false }),
    [earnedProfileCredits],
  );
  const profileRatio = profileBalance / PROFILE_TOTAL_CREDITS;
  const useProfileCredits = earnedProfileCredits != null;

  const remaining = useProfileCredits ? profileBalance : totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);
  const totalCap = useProfileCredits ? PROFILE_TOTAL_CREDITS : snapshot.monthlyLimit + snapshot.topUpBalance;
  const displayBarTone = useProfileCredits ? profileBarTone(profileRatio) : barTone;
  const displayBarFill = useProfileCredits ? profileRatio : barFill;

  const openUsage = () => {
    setPopoverOpen(false);
    accountNav?.openAccountSettings("usage");
  };

  return (
    <div className="credit-indicator-wrap">
      {popoverOpen ? <CreditPopover /> : null}
      <button
        type="button"
        className="credit-indicator-btn"
        aria-expanded={popoverOpen}
        aria-label={
          useProfileCredits
            ? `${planLabel} plan · ${remaining.toLocaleString()} of ${totalCap.toLocaleString()} intelligence credits unlocked`
            : `${planLabel} plan · ${remaining.toLocaleString()} of ${totalCap.toLocaleString()} credits available`
        }
        title={
          useProfileCredits
            ? `${remaining.toLocaleString()} / ${totalCap.toLocaleString()} intelligence credits · complete profile, benchmark, and sources to unlock more`
            : `${remaining.toLocaleString()} / ${totalCap.toLocaleString()} credits · resets ${snapshot.monthlyResetLabel} · ${dailyLeft} daily left`
        }
        onClick={openUsage}
      >
        <div className="credit-indicator-summary">
          <span className={`credit-plan-badge ${snapshot.plan}`}>{planLabel}</span>
          <span className="credit-indicator-amount">
            {remaining.toLocaleString()}<span className="credit-indicator-total"> / {totalCap.toLocaleString()}</span>
          </span>
        </div>
        <div className="credit-indicator-track" aria-hidden="true">
          <div
            className={`credit-indicator-fill ${displayBarTone}`}
            style={{ width: `${Math.max(Math.round(displayBarFill * 100), 0)}%` }}
          />
        </div>
      </button>
    </div>
  );
}
