import React from "react";
import { formatCountdown } from "./creditLogic";
import { useCredits } from "./CreditProvider";

export function CreditBlockBanner() {
  const { snapshot, blockCountdownMs, openUpgrade, popoverState } = useCredits();
  if (popoverState !== "dailyBlocked") return null;

  const isFree = snapshot.plan === "free";

  return (
    <div className="credit-block-banner" role="status">
      <span>
        {isFree
          ? `Free limit reached · get your AI advisor back with Pro (from $25/mo) or wait ${formatCountdown(blockCountdownMs)}`
          : `Pro daily pause · top up or wait ${formatCountdown(blockCountdownMs)}`}
      </span>
      <button type="button" onClick={() => openUpgrade(isFree ? "pro" : "topup", "dailyBlocked")}>
        {isFree ? "Go Pro" : "Top up"}
      </button>
    </div>
  );
}
