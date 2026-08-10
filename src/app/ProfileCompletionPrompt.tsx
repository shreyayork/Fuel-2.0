import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "./a11y/useDialogA11y";
import {
  PROFILE_EARNABLE_CREDITS,
  PROFILE_STARTING_CREDITS,
  PROFILE_TOTAL_CREDITS,
  remainingEarnableCredits,
  type EarnedProfileCredits,
} from "./profileCredits";
import "./profileCompletionPrompt.css";

export function ProfileCompletionPromptLoading() {
  return createPortal(
    <div className="profile-completion-prompt-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="profile-completion-prompt-loading-card">Preparing your workspace…</div>
    </div>,
    document.body,
  );
}

export function ProfileCompletionPrompt({
  open,
  earnedProfileCredits,
  onCompleteProfile,
  onContinue,
}: {
  open: boolean;
  earnedProfileCredits: EarnedProfileCredits;
  onCompleteProfile: () => void;
  onContinue: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, dialogRef, onContinue);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onContinue]);

  if (!open) return null;

  const remainingCredits = remainingEarnableCredits(earnedProfileCredits);

  return createPortal(
    <div
      className="profile-completion-prompt-backdrop is-entering"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="profile-completion-prompt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-completion-prompt-title"
        aria-describedby="profile-completion-prompt-desc"
        onPointerDown={event => event.stopPropagation()}
      >
        <div className="profile-completion-prompt-body">
          <h2 id="profile-completion-prompt-title">
            Complete your profile. Unlock more intelligence.
          </h2>
          <p id="profile-completion-prompt-desc" className="profile-completion-prompt-lead">
            The more we know about your portfolio and preferences, the smarter your insights become.
          </p>

          <div className="profile-completion-prompt-perks">
            <article className="profile-completion-prompt-perk is-credits">
              <span className="profile-completion-prompt-perk-icon" aria-hidden="true">✦</span>
              <div className="profile-completion-prompt-perk-copy">
                <strong>
                  Up to <em>{remainingCredits}</em> free credits
                </strong>
                <span>
                  You have {PROFILE_STARTING_CREDITS} of {PROFILE_TOTAL_CREDITS} today. Complete your profile to
                  {" "}unlock up to {PROFILE_EARNABLE_CREDITS} more.
                </span>
              </div>
            </article>
            <article className="profile-completion-prompt-perk">
              <span className="profile-completion-prompt-perk-icon" aria-hidden="true">◎</span>
              <div className="profile-completion-prompt-perk-copy">
                <strong>Sharper intelligence</strong>
                <span>Get recommendations and portfolio insights tailored to your company and stage.</span>
              </div>
            </article>
          </div>

          <ul className="profile-completion-prompt-benefits">
            <li>
              <span><em>Personalized intelligence</em> and recommendations</span>
            </li>
            <li>
              <span><em>More relevant portfolio insights</em> across Overview and Intelligence</span>
            </li>
            <li>
              <span><em>Free credits</em> to explore the platform</span>
            </li>
          </ul>

          <div className="profile-completion-prompt-actions">
            <button type="button" className="profile-completion-prompt-btn secondary" onClick={onContinue}>
              Continue to Overview
            </button>
            <button
              type="button"
              className="profile-completion-prompt-btn primary"
              autoFocus
              onClick={onCompleteProfile}
            >
              Complete My Profile
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
