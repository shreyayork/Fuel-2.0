"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Theme } from "@/lib/theme";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";

function useDrawerEscape(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export function PortfolioCompanyOverviewSheet({
  t,
  open,
  onClose,
  companyUuid,
  companyName,
}: {
  t: Theme;
  open: boolean;
  onClose: () => void;
  companyUuid: string | null;
  companyName: string | null;
}) {
  const { mounted, visible, durationMs } = useDrawerPresence(open);
  useDrawerEscape(open, onClose);
  if (!mounted || !companyUuid) return null;

  const root: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    display: "flex",
    justifyContent: "flex-end",
  };
  const scrim: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(15, 23, 32, 0.45)",
  };
  const panel: CSSProperties = {
    position: "relative",
    width: "min(480px, 100vw)",
    height: "100%",
    background: t.panel,
    borderLeft: `1px solid ${t.rule}`,
    boxShadow: "-12px 0 40px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    fontFamily: t.sans,
  };

  return createPortal(
    <div style={root}>
      <div
        style={{ ...scrim, ...drawerScrimMotionStyle(visible, durationMs) }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={companyName ? `${companyName} overview` : "Company overview"}
        style={{ ...panel, ...drawerPanelMotionStyle(visible, durationMs) }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: `1px solid ${t.rule}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.muted,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Overview
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: t.ink,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {companyName ?? companyUuid.slice(0, 8)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link
              href={`/company/${companyUuid}?tab=overview`}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: t.accent,
                textDecoration: "none",
                padding: "6px 10px",
              }}
            >
              Open full page
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                border: `1px solid ${t.rule}`,
                background: t.panelAlt,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontFamily: t.sans,
                fontSize: 12,
                color: t.inkSoft,
              }}
            >
              Close
            </button>
          </div>
        </header>
        <iframe
          title={companyName ? `${companyName} overview` : "Company overview"}
          src={`/company/${companyUuid}?tab=overview`}
          style={{
            flex: 1,
            width: "100%",
            border: "none",
            background: t.bg,
          }}
        />
      </aside>
    </div>,
    document.body,
  );
}

export function CompanyOverviewTrigger({
  t,
  children,
  onOpen,
  style,
}: {
  t: Theme;
  children: ReactNode;
  onOpen: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: t.ink,
        textDecoration: "none",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
        textAlign: "left",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
