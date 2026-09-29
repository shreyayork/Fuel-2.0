"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { formatActionCostsTooltip } from "@/lib/credits/action-cost-display";
import { totalRemaining, dailyRemaining } from "@/lib/credits/logic";
import { useTheme } from "../ThemeContext";
import { useCredits } from "./CreditProvider";
import { CreditPopover } from "./CreditPopover";
import {
  creditBarFill,
  creditIndicatorAmount,
  creditIndicatorBtn,
  creditIndicatorSummary,
  creditIndicatorTotal,
  creditIndicatorTrack,
  creditIndicatorWrap,
  creditPlanBadge,
  creditPopoverPortal,
} from "./styles";

const POPOVER_MIN_WIDTH = 300;

export function CreditIndicator() {
  const t = useTheme();
  const {
    snapshot,
    actionCosts,
    barTone,
    barFill,
    togglePopover,
    popoverOpen,
    setPopoverOpen,
    loading,
  } = useCredits();
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);

  const updatePopoverPosition = useCallback(() => {
    const anchor = wrapRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPopoverStyle(
      creditPopoverPortal({
        left: rect.left,
        top: rect.top - 8,
        width: Math.max(rect.width, POPOVER_MIN_WIDTH),
        transform: "translateY(-100%)",
      }),
    );
  }, []);

  useEffect(() => {
    if (!popoverOpen) {
      setPopoverStyle(null);
      return;
    }
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [popoverOpen, updatePopoverPosition]);

  // Same dismiss pattern as sidebar user menu (portaled surface).
  useEffect(() => {
    if (!popoverOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setPopoverOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [popoverOpen, setPopoverOpen]);

  if (loading || !snapshot) return null;

  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);
  const totalCap = snapshot.monthlyLimit + snapshot.topUpBalance;
  const planLabel = snapshot.plan === "pro" ? "Pro" : "Free";
  const costsTip = formatActionCostsTooltip(actionCosts);
  const statusTip = `${remaining.toLocaleString()} / ${totalCap.toLocaleString()} credits · resets ${snapshot.monthlyResetLabel} · ${dailyLeft} daily left · ${costsTip}`;

  return (
    <div ref={wrapRef} style={creditIndicatorWrap()}>
      {popoverOpen && popoverStyle && typeof document !== "undefined"
        ? createPortal(
            <div ref={popoverRef}>
              <CreditPopover style={popoverStyle} />
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        style={creditIndicatorBtn(t)}
        aria-expanded={popoverOpen}
        aria-label={`${planLabel} plan · ${remaining.toLocaleString()} of ${totalCap.toLocaleString()} credits available. ${costsTip}`}
        title={statusTip}
        onClick={togglePopover}
      >
        <div style={creditIndicatorSummary()}>
          <span style={creditPlanBadge(t, snapshot.plan)}>{planLabel}</span>
          <span style={creditIndicatorAmount(t)}>
            {remaining.toLocaleString()}
            <span style={creditIndicatorTotal(t)}> / {totalCap.toLocaleString()}</span>
          </span>
        </div>
        <div style={creditIndicatorTrack(t)} aria-hidden="true">
          <div
            style={{
              ...creditBarFill(t, barTone),
              width: `${Math.max(Math.round(barFill * 100), 0)}%`,
            }}
          />
        </div>
      </button>
    </div>
  );
}
