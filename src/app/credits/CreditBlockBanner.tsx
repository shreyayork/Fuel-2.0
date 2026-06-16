import React from "react";
import { formatCountdown } from "./creditLogic";
import { useCredits } from "./CreditProvider";

export function CreditBlockBanner() {
  const { snapshot, blockCountdownMs, openUpgrade, popoverState } = useCredits();
  if (popoverState !== "dailyBlocked") return null;

  const isFree = snapshot.plan === "free";

  return (
    <div className="credit-block-banner" role="status">
      <span>Daily limit reached · unblocked in {formatCountdown(blockCountdownMs)}</span>
      <button type="button" onClick={() => openUpgrade(isFree ? "pro" : "topup", "dailyBlocked")}>
        {isFree ? "Go Pro for 6hr reset" : "Top up"}
      </button>
    </div>
  );
}
