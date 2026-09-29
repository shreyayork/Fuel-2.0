"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { onAccentText, type Theme } from "@/lib/theme";
import { useTheme } from "../ThemeContext";
import { toastVariantIcon, type ToastVariant } from "./toast-variant-icon";

export type { ToastVariant };
export { toastVariantIcon };

export type ToastInput = {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss duration in ms. Defaults to 5s. */
  durationMs?: number;
};

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastContextValue = {
  showToast: (input: ToastInput | string) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;
const TOAST_EXIT_MS = 220;

let toastSeq = 0;

function variantAccent(t: Theme, variant: ToastVariant): string {
  switch (variant) {
    case "error":
      return t.negative;
    case "success":
      return t.positive;
    case "warning":
      return t.warn;
    case "info":
      return t.accent;
  }
}

function toastShellStyle(): CSSProperties {
  return {
    left: "50%",
    pointerEvents: "none",
    position: "fixed",
    top: 24,
    transform: "translateX(-50%)",
    zIndex: 2200,
  };
}

function toastCardStyle(t: Theme, variant: ToastVariant, phase: "in" | "out"): CSSProperties {
  const accent = variantAccent(t, variant);
  return {
    alignItems: "center",
    animation:
      phase === "in"
        ? "fuelToastIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both"
        : "fuelToastOut 0.22s ease both",
    background: `color-mix(in srgb, ${accent} 16%, ${t.panel})`,
    border: `1px solid ${accent}66`,
    borderRadius: 10,
    boxShadow: `0 12px 40px ${t.overlay}`,
    boxSizing: "border-box",
    color: t.inkSoft,
    display: "flex",
    fontFamily: t.sans,
    fontSize: 13,
    gap: 12,
    lineHeight: 1.45,
    maxWidth: "min(420px, calc(100vw - 32px))",
    minWidth: 280,
    padding: "12px 14px",
    pointerEvents: "auto",
  };
}

function toastIconStyle(t: Theme, variant: ToastVariant): CSSProperties {
  const accent = variantAccent(t, variant);
  return {
    alignItems: "center",
    background: accent,
    borderRadius: "50%",
    color: onAccentText(t),
    display: "inline-flex",
    flexShrink: 0,
    fontSize: 13,
    fontWeight: 800,
    height: 22,
    justifyContent: "center",
    lineHeight: 1,
    width: 22,
  };
}

function ToastHost({ toast, onDismiss }: { toast: ToastItem | null; onDismiss: () => void }) {
  const t = useTheme();
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
    if (!toastId || !toast) return;
    setPhase("in");
    const autoDismiss = window.setTimeout(beginDismiss, toast.durationMs);
    return () => window.clearTimeout(autoDismiss);
  }, [toastId, toast, beginDismiss]);

  useEffect(() => {
    if (phase !== "out" || !toastId) return;
    const id = window.setTimeout(() => {
      onDismiss();
    }, TOAST_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase, toastId, onDismiss]);

  if (!mounted || !toast || typeof document === "undefined") return null;

  const assertive = toast.variant === "error";

  return createPortal(
    <div style={toastShellStyle()}>
      <div
        role={assertive ? "alert" : "status"}
        aria-live={assertive ? "assertive" : "polite"}
        aria-atomic="true"
        style={toastCardStyle(t, toast.variant, phase)}
      >
        <span style={toastIconStyle(t, toast.variant)} aria-hidden="true">
          {toastVariantIcon(toast.variant)}
        </span>
        <span style={{ color: t.ink, flex: 1 }}>{toast.message}</span>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={beginDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: t.muted,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "inherit",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((input: ToastInput | string) => {
    const next = typeof input === "string" ? { message: input } : input;
    setToast({
      id: ++toastSeq,
      message: next.message,
      variant: next.variant ?? "info",
      durationMs: next.durationMs ?? DEFAULT_DURATION_MS,
    });
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast called outside of ToastProvider");
  return ctx;
}
