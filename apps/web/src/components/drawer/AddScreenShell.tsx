"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Theme } from "@/lib/theme";
import { BackNav } from "@/components/atoms";
import { mobileAddScreenStyle } from "./styles";

/** Full-viewport create screen for plus-icon flows (replaces popovers / inline cards). */
export function AddScreenShell({
  t,
  title,
  onClose,
  children,
  footer,
  zIndex = 10040,
}: {
  t: Theme;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  zIndex?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fuel-add-screen"
      style={mobileAddScreenStyle(t, { background: t.panel, zIndex })}
    >
      <header
        style={{
          alignItems: "center",
          borderBottom: `1px solid ${t.ruleSoft}`,
          display: "flex",
          flexShrink: 0,
          gap: 8,
          padding: "8px 16px 10px 12px",
        }}
      >
        <BackNav t={t} label="Back" iconOnly onClick={onClose} />
        <h2
          style={{
            color: t.ink,
            flex: 1,
            fontFamily: t.sans,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </header>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          overflow: "auto",
          padding: 16,
        }}
      >
        {children}
      </div>
      {footer ? (
        <div
          style={{
            background: t.panel,
            borderTop: `1px solid ${t.ruleSoft}`,
            flexShrink: 0,
            padding: "12px 16px",
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
