import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useCredits } from "./credits";
import { totalRemaining } from "./credits/creditLogic";
import { type ProfileCreditReward } from "./profileCredits";

export function ProfileCreditRewardToast({
  reward,
  onDismiss,
}: {
  reward: ProfileCreditReward;
  onDismiss: () => void;
}) {
  const { snapshot } = useCredits();
  const remaining = totalRemaining(snapshot);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4800);
    return () => window.clearTimeout(timer);
  }, [onDismiss, reward]);

  return createPortal(
    <div
      className="profile-credit-reward-backdrop"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="profile-credit-reward-toast"
        role="status"
        aria-live="polite"
        onClick={event => event.stopPropagation()}
      >
        <span className="profile-credit-reward-eyebrow">Credits added</span>
        <div className="profile-credit-reward-amount-row">
          <strong className="profile-credit-reward-amount">+{reward.amount}</strong>
          <span className="profile-credit-reward-amount-label">credits</span>
        </div>
        <p className="profile-credit-reward-headline">{reward.headline}</p>
        <p className="profile-credit-reward-message">{reward.message}</p>
        <p className="profile-credit-reward-balance">
          You now have <strong>{remaining}</strong> credits to spend.
        </p>
        <button type="button" className="profile-credit-reward-dismiss" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
