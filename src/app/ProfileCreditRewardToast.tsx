import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  PROFILE_TOTAL_CREDITS,
  type ProfileCreditReward,
} from "./profileCredits";

export function ProfileCreditRewardToast({
  reward,
  onDismiss,
}: {
  reward: ProfileCreditReward;
  onDismiss: () => void;
}) {
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
        <span className="profile-credit-reward-eyebrow">Credits unlocked</span>
        <div className="profile-credit-reward-amount-row">
          <strong className="profile-credit-reward-amount">+{reward.amount}</strong>
          <span className="profile-credit-reward-amount-label">credits</span>
        </div>
        <p className="profile-credit-reward-headline">{reward.headline}</p>
        <p className="profile-credit-reward-message">{reward.message}</p>
        <p className="profile-credit-reward-balance">
          You now have <strong>{reward.balance}</strong> of {PROFILE_TOTAL_CREDITS} intelligence credits.
        </p>
        <button type="button" className="profile-credit-reward-dismiss" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
