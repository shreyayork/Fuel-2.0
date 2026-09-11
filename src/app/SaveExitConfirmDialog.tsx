import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./formConfirm.css";

export function SaveExitConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="form-confirm-backdrop" onPointerDown={onCancel} role="presentation">
      <div
        className="form-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="form-confirm-title"
        aria-describedby="form-confirm-desc"
        onPointerDown={event => event.stopPropagation()}
      >
        <h3 id="form-confirm-title">Save and exit?</h3>
        <p id="form-confirm-desc">
          Save your progress and exit? You can continue where you left off anytime.
        </p>
        <div className="form-confirm-actions">
          <button type="button" className="form-confirm-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="form-confirm-btn primary" autoFocus onClick={onConfirm}>
            Save and exit
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Prompt before saving partial drawer progress and closing. */
export function useSaveExitConfirm() {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestSaveExit = useCallback((action: () => void) => {
    setPendingAction(() => action);
  }, []);

  const cancelSaveExit = useCallback(() => {
    setPendingAction(null);
  }, []);

  const confirmSaveExit = useCallback(() => {
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const dialog = (
    <SaveExitConfirmDialog
      open={pendingAction != null}
      onCancel={cancelSaveExit}
      onConfirm={confirmSaveExit}
    />
  );

  return { requestSaveExit, dialog };
}
