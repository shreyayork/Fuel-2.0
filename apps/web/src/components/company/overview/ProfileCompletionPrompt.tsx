"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import { DEFAULT_FREE_MONTHLY_LIMIT, computeEarnedCredits } from "@/lib/credits/profile-modules";
import { useOverviewTheme } from "./overview-theme";
import { ctaPrimaryStyle, ctaTertiaryStyle } from "@/lib/theme";
import { HoverBtn } from "./drawerShared";

const PROMPT_CSS = `
.fuel-profile-prompt-overlay {
  align-items: center;
  box-sizing: border-box;
  display: flex;
  inset: 0;
  justify-content: center;
  padding:
    max(12px, var(--fuel-safe-top, 0px))
    max(12px, var(--fuel-safe-right, 0px))
    max(12px, var(--fuel-safe-bottom, 0px))
    max(12px, var(--fuel-safe-left, 0px));
  position: fixed;
  z-index: 240;
}
.fuel-profile-prompt-dialog {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: min(92dvh, 720px);
  overflow: hidden;
  width: min(100%, 520px);
}
.fuel-profile-prompt-body {
  -webkit-overflow-scrolling: touch;
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 28px 28px 8px;
}
.fuel-profile-prompt-title {
  font-size: clamp(1.25rem, 1.05rem + 1vw, 1.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}
.fuel-profile-prompt-desc {
  font-size: 14px;
  line-height: 1.55;
  margin: 0 0 22px;
}
.fuel-profile-prompt-perks {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.fuel-profile-prompt-perk {
  align-items: flex-start;
  border-radius: 14px;
  display: flex;
  gap: 14px;
  padding: 14px 16px;
}
.fuel-profile-prompt-perk-icon {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  height: 36px;
  justify-content: center;
  line-height: 1;
  width: 36px;
}
.fuel-profile-prompt-benefits {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
}
.fuel-profile-prompt-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 28px 24px;
}
.fuel-profile-prompt-actions .fuel-profile-prompt-btn {
  align-items: center;
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
}
@media (max-width: 767px) {
  .fuel-profile-prompt-overlay {
    align-items: flex-end;
    padding:
      max(8px, var(--fuel-safe-top, 0px))
      max(8px, var(--fuel-safe-right, 0px))
      max(8px, var(--fuel-safe-bottom, 0px))
      max(8px, var(--fuel-safe-left, 0px));
  }
  .fuel-profile-prompt-dialog {
    border-radius: 16px 16px 12px 12px;
    max-height: min(94dvh, 100%);
    width: 100%;
  }
  .fuel-profile-prompt-body {
    padding: 20px 16px 4px;
  }
  .fuel-profile-prompt-title {
    font-size: clamp(1.125rem, 0.95rem + 1.2vw, 1.35rem);
    margin-bottom: 8px;
  }
  .fuel-profile-prompt-desc {
    font-size: 14px;
    margin-bottom: 16px;
  }
  .fuel-profile-prompt-perks {
    gap: 10px;
    margin-bottom: 14px;
  }
  .fuel-profile-prompt-perk {
    gap: 12px;
    padding: 12px 14px;
  }
  .fuel-profile-prompt-actions {
    border-top: 1px solid var(--fuel-profile-prompt-rule);
    flex-direction: column-reverse;
    gap: 8px;
    padding: 12px 16px max(16px, var(--fuel-safe-bottom, 0px));
  }
  .fuel-profile-prompt-actions .fuel-profile-prompt-btn {
    flex: 1 1 auto;
    justify-content: center;
    width: 100%;
  }
}
@media (max-width: 767px) and (orientation: landscape) {
  .fuel-profile-prompt-overlay {
    align-items: center;
  }
  .fuel-profile-prompt-dialog {
    border-radius: 14px;
    max-height: min(92dvh, 100%);
    max-width: min(560px, 100%);
  }
  .fuel-profile-prompt-body {
    padding: 16px 16px 4px;
  }
  .fuel-profile-prompt-actions {
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: stretch;
    padding: 10px 16px max(12px, var(--fuel-safe-bottom, 0px));
  }
  .fuel-profile-prompt-actions .fuel-profile-prompt-btn {
    flex: 1 1 0;
    width: auto;
  }
}
@media (max-height: 520px) {
  .fuel-profile-prompt-dialog {
    max-height: min(96dvh, 100%);
  }
  .fuel-profile-prompt-body {
    padding-top: 14px;
  }
  .fuel-profile-prompt-desc {
    margin-bottom: 12px;
  }
  .fuel-profile-prompt-perks {
    margin-bottom: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fuel-profile-prompt-dialog {
    scroll-behavior: auto;
  }
}
`;

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onContinue]);

  if (!open || !mounted) return null;

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
      className="fuel-profile-prompt-perk"
      style={{
        background: credit ? `${t.accent}12` : t.panelInner,
        border: `1px solid ${credit ? `${t.accent}30` : t.rule}`,
      }}
    >
      <span
        aria-hidden
        className="fuel-profile-prompt-perk-icon"
        style={{
          background: credit ? `${t.accent}1f` : t.panel,
          border: `1px solid ${credit ? `${t.accent}3d` : t.rule}`,
          color: t.accent,
        }}
      >
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <strong
          style={{
            color: t.ink,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </strong>
        <span style={{ color: t.inkSoft, fontSize: 14, lineHeight: 1.45 }}>{body}</span>
      </div>
    </article>
  );

  const benefit = (lead: string, rest: string) => (
    <li
      style={{
        alignItems: "flex-start",
        color: t.inkSoft,
        display: "flex",
        fontSize: 14,
        gap: 10,
        lineHeight: 1.45,
        padding: "5px 0",
      }}
    >
      <span
        aria-hidden
        style={{ color: t.accent, flexShrink: 0, fontSize: 12, fontWeight: 800, marginTop: 1 }}
      >
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
      className="fuel-profile-prompt-overlay"
      style={{ background: t.overlay }}
      onClick={onContinue}
    >
      <style>{PROMPT_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-completion-prompt-title"
        aria-describedby="profile-completion-prompt-desc"
        className="fuel-profile-prompt-dialog"
        style={
          {
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 16,
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.28)",
            color: t.ink,
            fontFamily: t.sans,
            // Token for action-bar rule on mobile (no hardcoded York palette).
            "--fuel-profile-prompt-rule": t.rule,
          } as CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fuel-profile-prompt-body">
          <h2 id="profile-completion-prompt-title" className="fuel-profile-prompt-title">
            Complete your profile. Unlock more intelligence.
          </h2>
          <p
            id="profile-completion-prompt-desc"
            className="fuel-profile-prompt-desc"
            style={{ color: t.inkSoft }}
          >
            The more we know about your company and priorities, the smarter your insights become.
          </p>

          <div className="fuel-profile-prompt-perks">
            {perk(
              "✦",
              <>
                Up to{" "}
                <em style={{ color: t.accent, fontStyle: "normal", fontWeight: 800 }}>
                  {planMonthlyLimit}
                </em>{" "}
                credits
              </>,
              `You have ${earned} of ${planMonthlyLimit} today. Complete your profile and onboarding questions to earn the rest — same credits you spend in Fuel.`,
              true,
            )}
            {perk(
              "◎",
              "Sharper intelligence",
              "Get recommendations tailored to your company and stage.",
            )}
          </div>

          <ul className="fuel-profile-prompt-benefits">
            {benefit("Personalized intelligence", "and recommendations")}
            {benefit("More relevant insights", "across Overview and Intelligence")}
            {benefit("Credits", "to spend on chat, uploads, and playbooks")}
          </ul>
        </div>

        <div className="fuel-profile-prompt-actions">
          <HoverBtn
            type="button"
            className="fuel-profile-prompt-btn"
            styleFor={(hovered) => ({
              ...ctaTertiaryStyle(t),
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 550,
              opacity: hovered ? 0.88 : 1,
              padding: "9px 16px",
            })}
            onClick={onContinue}
          >
            Continue to Overview
          </HoverBtn>
          <HoverBtn
            type="button"
            className="fuel-profile-prompt-btn"
            autoFocus
            styleFor={(hovered) => ({
              ...ctaPrimaryStyle(t),
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 600,
              opacity: hovered ? 0.92 : 1,
              padding: "9px 16px",
            })}
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
