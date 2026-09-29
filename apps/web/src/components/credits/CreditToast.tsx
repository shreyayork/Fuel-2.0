"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../ThemeContext";
import { CreditSeeCostsControl } from "./ActionCostList";
import { useCredits } from "./CreditProvider";
import {
  creditToast,
  creditToastDismiss,
  creditToastMessage,
  creditToastShell,
} from "./styles";

const TOAST_DURATION_MS = 6000;
const TOAST_EXIT_MS = 220;

export function CreditToastHost() {
  const t = useTheme();
  const { toast, dismissToast } = useCredits();
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const beginDismiss = useCallback(() => {
    setPhase("out");
  }, []);

  const toastId = toast?.id;

  useEffect(() => {
    if (!toastId) return;
    setPhase("in");
    const autoDismiss = window.setTimeout(beginDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(autoDismiss);
  }, [toastId, beginDismiss]);

  useEffect(() => {
    if (phase !== "out" || !toastId) return;
    const id = window.setTimeout(() => {
      dismissToast();
    }, TOAST_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase, toastId, dismissToast]);

  if (!mounted || !toast || typeof document === "undefined") return null;

  return createPortal(
    <div style={creditToastShell()}>
      <div role="status" aria-live="polite" style={creditToast(t, phase)}>
        <span style={creditToastMessage()}>
          {toast.message}
          {toast.seeCosts ? <CreditSeeCostsControl t={t} /> : null}
        </span>
        <button
          type="button"
          aria-label="Dismiss notification"
          style={creditToastDismiss(t)}
          onClick={beginDismiss}
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}
