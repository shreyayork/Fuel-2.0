"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import { totalRemaining } from "@/lib/credits/logic";
import type { ProfileCreditReward } from "@/lib/credits/profile-modules";
import { onAccentText } from "@/lib/theme";
import { useOverviewTheme } from "./overview-theme";
import { overviewStatusGoodLine, OVERVIEW_STATUS } from "./overviewTokens";
import { HoverBtn } from "./drawerShared";

const AUTO_DISMISS_MS = 4800;

/** Ported from Design ProfileCreditRewardToast — bottom-centred credits confirmation. */
export function ProfileCreditRewardToast({
  reward,
  onDismiss,
}: {
  reward: ProfileCreditReward;
  onDismiss: () => void;
}) {
  const t = useOverviewTheme();
  const credits = useCreditsOptional();
  const remaining = credits?.snapshot ? totalRemaining(credits.snapshot) : reward.balance;

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss, reward]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      onClick={onDismiss}
      style={{
        alignItems: "flex-end",
        background: t.overlay,
        display: "flex",
        inset: 0,
        justifyContent: "center",
        padding: 24,
        position: "fixed",
        zIndex: 260,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel,
          border: `1px solid ${overviewStatusGoodLine(t)}`,
          borderRadius: 16,
          boxShadow: "0 20px 48px rgba(12, 26, 37, 0.28)",
          fontFamily: t.sans,
          padding: "20px 22px 18px",
          width: "min(380px, calc(100vw - 32px))",
        }}
      >
        <span
          style={{
            color: OVERVIEW_STATUS.good,
            display: "block",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.1em",
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Credits added
        </span>
        <div style={{ alignItems: "baseline", display: "flex", gap: 8, marginBottom: 6 }}>
          <strong
            style={{
              color: t.ink,
              fontSize: 34,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            +{reward.amount}
          </strong>
          <span style={{ color: t.muted, fontSize: 14, fontWeight: 700 }}>credits</span>
        </div>
        <p
          style={{
            color: t.ink,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            margin: "0 0 6px",
          }}
        >
          {reward.headline}
        </p>
        <p style={{ color: t.inkSoft, fontSize: 13, lineHeight: 1.5, margin: "0 0 12px" }}>{reward.message}</p>
        <p style={{ color: t.inkSoft, fontSize: 12, lineHeight: 1.45, margin: "0 0 16px" }}>
          You now have{" "}
          <strong style={{ color: OVERVIEW_STATUS.good, fontWeight: 800 }}>{remaining}</strong> credits to spend.
        </p>
        <HoverBtn
          type="button"
          onClick={onDismiss}
          styleFor={(hovered) => ({
            background: t.accent,
            border: "none",
            borderRadius: 999,
            color: onAccentText(t),
            cursor: "pointer",
            filter: hovered ? "brightness(1.06)" : undefined,
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: 700,
            padding: "10px 18px",
            width: "100%",
          })}
        >
          Got it
        </HoverBtn>
      </div>
    </div>,
    document.body,
  );
}
