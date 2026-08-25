import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PROFILE_TOTAL_CREDITS,
  computeCreditBalance,
  type EarnedProfileCredits,
} from "./profileCredits";
import "./profileCompletionPrompt.css";

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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onContinue]);

  if (!open) return null;

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
            The more we know about your company and priorities, the smarter your insights become.
          </p>

          <div className="profile-completion-prompt-perks">
            <article className="profile-completion-prompt-perk is-credits">
              <span className="profile-completion-prompt-perk-icon" aria-hidden="true">✦</span>
              <div className="profile-completion-prompt-perk-copy">
                <strong>
                  Up to <em>{PROFILE_TOTAL_CREDITS}</em> credits
                </strong>
                <span>
                  You have {computeCreditBalance(earnedProfileCredits)} of {PROFILE_TOTAL_CREDITS} today.
                  {" "}Complete your profile and onboarding questions to earn the rest — same credits you spend in Fuel.
                </span>
              </div>
            </article>
            <article className="profile-completion-prompt-perk">
              <span className="profile-completion-prompt-perk-icon" aria-hidden="true">◎</span>
              <div className="profile-completion-prompt-perk-copy">
                <strong>Sharper intelligence</strong>
                <span>Get recommendations tailored to your company and stage.</span>
              </div>
            </article>
          </div>

          <ul className="profile-completion-prompt-benefits">
            <li>
              <span><em>Personalized intelligence</em> and recommendations</span>
            </li>
            <li>
              <span><em>More relevant insights</em> across Overview and Intelligence</span>
            </li>
            <li>
              <span><em>Credits</em> to spend on chat, uploads, and playbooks</span>
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
