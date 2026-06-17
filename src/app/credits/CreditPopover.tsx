import React, { useEffect } from "react";
import {
  actionsRemaining,
  creditCostRows,
  dailyRemaining,
  formatCountdown,
  totalRemaining,
  willRunOutBeforeReset,
  daysUntilMonthlyEmpty,
} from "./creditLogic";
import { useCredits } from "./CreditProvider";

export function CreditPopover() {
  const {
    snapshot,
    popoverState,
    blockCountdownMs,
    openUpgrade,
    clearJustUnblocked,
    setPopoverOpen,
  } = useCredits();

  useEffect(() => {
    if (popoverState === "justUnblocked") {
      const timer = window.setTimeout(clearJustUnblocked, 8000);
      return () => window.clearTimeout(timer);
    }
  }, [clearJustUnblocked, popoverState]);

  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);
  const isFree = snapshot.plan === "free";

  const renderActions = (primary: React.ReactNode, secondary?: React.ReactNode) => (
    <div className="credit-popover-actions">
      {primary}
      {secondary}
    </div>
  );

  let body: React.ReactNode;

  switch (popoverState) {
    case "dailyBlocked":
      body = (
        <>
          <h4>{isFree ? "Free limit reached" : "Pro daily pause"}</h4>
          <p>
            {isFree
              ? "You've used your free uploads and context adds for now. Upgrade to Pro, or wait 24 hours for credits to reset."
              : "You've used today's Pro allowance. Top up for more, or wait 6 hours for daily credits to reset."}
          </p>
          <div className="credit-countdown">{formatCountdown(blockCountdownMs)}</div>
          <p>{remaining.toLocaleString()} monthly credits remain on your account.</p>
          {renderActions(
            <button type="button" className="credit-btn-primary" onClick={() => openUpgrade(isFree ? "pro" : "topup", "dailyBlocked")}>
              {isFree ? "Upgrade to Pro" : "Top up credits"}
            </button>,
            <button type="button" className="credit-btn-ghost" onClick={() => setPopoverOpen(false)}>
              Wait · {formatCountdown(blockCountdownMs)}
            </button>,
          )}
        </>
      );
      break;
    case "monthlyEmpty":
      body = (
        <>
          <h4>Monthly credits used up</h4>
          <div className="credit-popover-stats">
            <div><span>Signals generated</span><strong>{snapshot.stats.signals}</strong></div>
            <div><span>Docs uploaded</span><strong>{snapshot.stats.docs}</strong></div>
            <div><span>AI messages</span><strong>{snapshot.stats.messages}</strong></div>
          </div>
          <p>Your existing intelligence is safe — nothing is lost.</p>
          {isFree ? (
            <>
              <p>Pro gives you 8× more credits every month.</p>
              {renderActions(
                <button type="button" className="credit-btn-primary" onClick={() => openUpgrade("pro", "monthlyEmpty")}>
                  Go Pro · $30/mo
                </button>,
                <button type="button" className="credit-btn-ghost" onClick={() => openUpgrade("topup", "monthlyEmpty")}>
                  See top-up packs
                </button>,
              )}
            </>
          ) : (
            renderActions(
              <button type="button" className="credit-btn-primary" onClick={() => openUpgrade("topup", "monthlyEmpty")}>
                Top up credits
              </button>,
            )
          )}
        </>
      );
      break;
    case "runningLow":
      body = (
        <>
          <h4>Running low</h4>
          <p><strong style={{ color: "#F2F5F2" }}>{remaining.toLocaleString()}</strong> credits left · resets {snapshot.monthlyResetLabel}</p>
          {willRunOutBeforeReset(snapshot) ? (
            <p>At your current pace, you'll run out in about {daysUntilMonthlyEmpty(snapshot)} days.</p>
          ) : null}
          <p>
            ~{actionsRemaining(snapshot, "docUpload")} doc uploads · ~{actionsRemaining(snapshot, "aiChat")} AI messages left
            {snapshot.plan === "pro" ? ` · ~${actionsRemaining(snapshot, "playbookRun")} playbook runs` : ""}
          </p>
          <p>{dailyLeft} daily credits left today.</p>
          {renderActions(
            <button type="button" className="credit-btn-primary" onClick={() => openUpgrade(isFree ? "pro" : "topup", "runningLow")}>
              {isFree ? "Go Pro · $30/mo" : "Top up credits"}
            </button>,
            isFree ? (
              <button type="button" className="credit-btn-ghost" onClick={() => openUpgrade("topup", "runningLow")}>
                Top up instead
              </button>
            ) : undefined,
          )}
        </>
      );
      break;
    case "justUnblocked":
      body = (
        <>
          <h4>You're unblocked</h4>
          <p>Daily credits are available again — {dailyLeft} of {snapshot.dailyLimit} today.</p>
          <p>{remaining.toLocaleString()} monthly credits remaining.</p>
          {isFree ? (
            <p style={{ marginTop: 8 }}>Pro resets daily limits in 6 hours, not 24.</p>
          ) : null}
          {isFree ? renderActions(
            <button type="button" className="credit-btn-ghost" onClick={() => openUpgrade("pro", "healthy")}>
              See Pro
            </button>,
          ) : null}
        </>
      );
      break;
    default:
      body = (
        <>
          <h4>{remaining.toLocaleString()} credits left</h4>
          <p>Resets {snapshot.monthlyResetLabel} · {dailyLeft} daily credits left today</p>
          <div className="credit-cost-list">
            {creditCostRows().map(row => (
              <div key={row.action} className="credit-cost-row">
                <span>{row.label}</span>
                <span>{row.cost} cr</span>
              </div>
            ))}
          </div>
          {isFree ? renderActions(
            <button type="button" className="credit-btn-ghost" onClick={() => openUpgrade("pro", "healthy")}>
              Upgrade to Pro
            </button>,
          ) : renderActions(
            <button type="button" className="credit-btn-ghost" onClick={() => openUpgrade("topup", "healthy")}>
              Top up credits
            </button>,
          )}
        </>
      );
  }

  return (
    <div className="credit-popover" role="dialog" aria-label="Credit usage">
      {body}
    </div>
  );
}
