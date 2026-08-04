import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { PROFILE_TOTAL_CREDITS } from "./profileCredits";
import "./formConfirm.css";

export function GenerateInsightsConfirmDialog({
  open,
  creditAmount,
  currentBalance,
  onGenerateReport,
  onAnswerMore,
}: {
  open: boolean;
  creditAmount: number;
  currentBalance: number;
  onGenerateReport: () => void;
  onAnswerMore: () => void;
}) {
  const projectedBalance = currentBalance + creditAmount;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onAnswerMore();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onAnswerMore]);

  if (!open) return null;

  return createPortal(
    <div className="form-confirm-backdrop" onPointerDown={onAnswerMore} role="presentation">
      <div
        className="form-confirm-dialog form-confirm-dialog--insights"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="generate-insights-title"
        aria-describedby="generate-insights-desc"
        onPointerDown={event => event.stopPropagation()}
      >
        <div className="insights-confirm-credit-row" aria-hidden="true">
          <strong className="insights-confirm-credit-value">+{creditAmount}</strong>
          <span className="insights-confirm-credit-unit">credits unlocked</span>
        </div>

        <h3 id="generate-insights-title">Generate Better Insights</h3>
        <p id="generate-insights-desc">
          Required profile is complete. Generate your report now, or add more answers for sharper
          recommendations.
        </p>
        <p className="insights-confirm-balance">
          Balance after generating: <strong>{projectedBalance}</strong> / {PROFILE_TOTAL_CREDITS}
        </p>

        <div className="form-confirm-actions">
          <button type="button" className="form-confirm-btn secondary" onClick={onAnswerMore}>
            Answer More Questions
          </button>
          <button
            type="button"
            className="form-confirm-btn primary"
            autoFocus
            onClick={onGenerateReport}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
