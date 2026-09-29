"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import { DEFAULT_FREE_MONTHLY_LIMIT, computeEarnedCredits } from "@/lib/credits/profile-modules";
import { useOverviewTheme } from "./overview-theme";
import { benchActionBtnStyle } from "./drawerStyles";
import { HoverBtn } from "./drawerShared";

/** Ported from Design ProfileCompletionPrompt + profileCompletionPrompt.css. */
export function ProfileCompletionPrompt({
  open,
  onCompleteProfile,
  onContinue,
}: {
  open: boolean;
  onCompleteProfile: () => void;
  onContinue: () => void;
}) {
  const t = useOverviewTheme();
  const credits = useCreditsOptional();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onContinue]);

  if (!open || typeof document === "undefined") return null;

  const planMonthlyLimit = credits?.snapshot?.planMonthlyLimit ?? DEFAULT_FREE_MONTHLY_LIMIT;
  const earned = credits?.snapshot
    ? computeEarnedCredits(
        {
          modules: credits.snapshot.profileModules,
          benchmark: credits.snapshot.benchmarkEarned,
        },
        planMonthlyLimit,
      )
    : 0;

  const perk = (icon: string, title: ReactNode, body: string, credit = false) => (
    <article
      style={{
        alignItems: "flex-start",
        background: credit ? `${t.accent}12` : t.panelInner,
        border: `1px solid ${credit ? `${t.accent}30` : t.rule}`,
        borderRadius: 14,
        display: "flex",
        gap: 14,
        padding: "14px 16px",
      }}
    >
      <span
        aria-hidden
        style={{
          alignItems: "center",
          background: credit ? `${t.accent}1f` : t.panel,
          border: `1px solid ${credit ? `${t.accent}3d` : t.rule}`,
          borderRadius: 999,
          color: t.accent,
          display: "inline-flex",
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 700,
          height: 36,
          justifyContent: "center",
          lineHeight: 1,
          width: 36,
        }}
      >
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <strong style={{ color: t.ink, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
          {title}
        </strong>
        <span style={{ color: t.inkSoft, fontSize: 13, lineHeight: 1.45 }}>{body}</span>
      </div>
    </article>
  );

  const benefit = (lead: string, rest: string) => (
    <li style={{ alignItems: "flex-start", color: t.inkSoft, display: "flex", fontSize: 13, gap: 10, lineHeight: 1.45, padding: "5px 0" }}>
      <span aria-hidden style={{ color: t.accent, flexShrink: 0, fontSize: 12, fontWeight: 800, marginTop: 1 }}>
        ✓
      </span>
      <span>
        <strong style={{ color: t.ink, fontWeight: 700 }}>{lead}</strong> {rest}
      </span>
    </li>
  );

  return createPortal(
    <div
      role="presentation"
      style={{
        alignItems: "center",
        background: t.overlay,
        display: "flex",
        inset: 0,
        justifyContent: "center",
        padding: 24,
        position: "fixed",
        zIndex: 240,
      }}
      onClick={onContinue}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-completion-prompt-title"
        aria-describedby="profile-completion-prompt-desc"
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.28)",
          color: t.ink,
          fontFamily: t.sans,
          overflow: "hidden",
          padding: "28px 28px 24px",
          width: "min(100%, 520px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="profile-completion-prompt-title"
          style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, margin: "0 0 10px" }}
        >
          Complete your profile. Unlock more intelligence.
        </h2>
        <p
          id="profile-completion-prompt-desc"
          style={{ color: t.inkSoft, fontSize: 14, lineHeight: 1.55, margin: "0 0 22px" }}
        >
          The more we know about your company and priorities, the smarter your insights become.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {perk(
            "✦",
            <>
              Up to{" "}
              <em style={{ color: t.accent, fontStyle: "normal", fontWeight: 800 }}>{planMonthlyLimit}</em>{" "}
              credits
            </>,
            `You have ${earned} of ${planMonthlyLimit} today. Complete your profile and onboarding questions to earn the rest — same credits you spend in Fuel.`,
            true,
          )}
          {perk("◎", "Sharper intelligence", "Get recommendations tailored to your company and stage.")}
        </div>

        <ul style={{ listStyle: "none", margin: "0 0 22px", padding: 0 }}>
          {benefit("Personalized intelligence", "and recommendations")}
          {benefit("More relevant insights", "across Overview and Intelligence")}
          {benefit("Credits", "to spend on chat, uploads, and playbooks")}
        </ul>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <HoverBtn
            type="button"
            styleFor={(hovered) => benchActionBtnStyle(t, "cancel", { hovered })}
            onClick={onContinue}
          >
            Continue to Overview
          </HoverBtn>
          <HoverBtn
            type="button"
            autoFocus
            styleFor={(hovered) => benchActionBtnStyle(t, "save", { hovered })}
            onClick={onCompleteProfile}
          >
            Complete My Profile
          </HoverBtn>
        </div>
      </div>
    </div>,
    document.body,
  );
}
