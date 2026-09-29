"use client";

import {
  daysUntilPeriodEnd,
  formatDaysRemaining,
  formatPeriodEndLabel,
} from "@/lib/credits/logic";
import type { Theme } from "@/lib/theme";
import { useTheme } from "../ThemeContext";
import { useCredits } from "./CreditProvider";
import {
  creditBlockBanner,
  creditBlockBannerAction,
  creditBlockBannerActions,
  creditBlockBannerCountdown,
  creditBlockBannerLeading,
  creditBlockBannerStickyShell,
  creditBlockBannerText,
  creditCancelBannerBackground,
} from "./styles";
import { resumeSubscription } from "@/lib/credits/client";
import { useState } from "react";

function CancelBannerIcon({ t }: { t: Theme }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <circle cx={12} cy={12} r={9} stroke={t.warn} strokeWidth={1.8} />
      <path
        d="M12 7v5m0 4h.01"
        stroke={t.warn}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CreditCancelBanner() {
  const t = useTheme();
  const { snapshot, now, openUpgrade, refreshSnapshot, loading } = useCredits();
  const [busy, setBusy] = useState(false);

  if (loading || !snapshot || snapshot.plan !== "pro" || !snapshot.cancelAtPeriodEnd) {
    return null;
  }

  const days = daysUntilPeriodEnd(snapshot.periodEndsAt, now);
  const daysLabel = formatDaysRemaining(days);
  const endLabel = formatPeriodEndLabel(snapshot.periodEndsAt);

  const onKeepPro = async () => {
    setBusy(true);
    try {
      await resumeSubscription();
      await refreshSnapshot();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        ...creditBlockBannerStickyShell(t),
        background: creditCancelBannerBackground(t),
      }}
    >
      <div
        role="status"
        style={{
          ...creditBlockBanner(t),
          background: creditCancelBannerBackground(t),
        }}
      >
        <div style={creditBlockBannerLeading()}>
          <CancelBannerIcon t={t} />
          <span style={creditBlockBannerText(t)}>
            <strong style={{ color: t.ink, fontWeight: 600 }}>Subscription cancelled</strong>
            {" · "}
            <span style={creditBlockBannerCountdown(t)}>{daysLabel}</span> of Pro left
            {" · "}
            After {endLabel} you move to the Free plan
          </span>
        </div>
        <div style={creditBlockBannerActions()}>
          <button
            type="button"
            style={creditBlockBannerAction(t)}
            disabled={busy}
            onClick={() => void onKeepPro()}
          >
            Keep Pro
          </button>
          <button
            type="button"
            style={{
              ...creditBlockBannerAction(t),
              border: `1px solid ${t.borderSubtle}`,
              color: t.muted,
            }}
            onClick={() => openUpgrade("pro", "healthy")}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
