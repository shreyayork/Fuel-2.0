"use client";

import { formatCountdown, hasActiveBlockCountdown } from "@/lib/credits/logic";
import { proFromPriceLabel } from "@/lib/credits/constants";
import type { Theme } from "@/lib/theme";
import { useTheme } from "../ThemeContext";
import { CreditSeeCostsControl } from "./ActionCostList";
import { useCredits } from "./CreditProvider";
import {
  creditBlockBanner,
  creditBlockBannerAction,
  creditBlockBannerActions,
  creditBlockBannerCountdown,
  creditBlockBannerLeading,
  creditBlockBannerStickyShell,
  creditBlockBannerText,
} from "./styles";

function BlockBannerIcon({ t }: { t: Theme }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke={t.warn}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CreditBlockBanner() {
  const t = useTheme();
  const { snapshot, blockCountdownMs, openUpgrade, popoverState, loading, proPlan } =
    useCredits();
  if (loading || popoverState !== "dailyBlocked" || !snapshot) return null;

  const isFree = snapshot.plan === "free";
  const showCountdown = hasActiveBlockCountdown(blockCountdownMs);
  const countdown = showCountdown ? formatCountdown(blockCountdownMs) : null;
  const cancelBannerVisible =
    snapshot.plan === "pro" && snapshot.cancelAtPeriodEnd;
  const fromPrice = proFromPriceLabel(proPlan);

  return (
    <div style={creditBlockBannerStickyShell(t, { flushTop: !cancelBannerVisible })}>
      <div role="status" style={creditBlockBanner(t)}>
        <div style={creditBlockBannerLeading()}>
          <BlockBannerIcon t={t} />
          <span style={creditBlockBannerText(t)}>
            {isFree ? (
              <>
                <strong style={{ color: t.ink, fontWeight: 600 }}>Free limit reached</strong>
                {" · "}
                Get your AI advisor back with Pro ({fromPrice})
                {countdown ? (
                  <>
                    {" "}
                    or wait <span style={creditBlockBannerCountdown(t)}>{countdown}</span>
                  </>
                ) : null}
                <CreditSeeCostsControl t={t} />
              </>
            ) : (
              <>
                <strong style={{ color: t.ink, fontWeight: 600 }}>Pro daily pause</strong>
                {" · "}
                Top up to continue now
                {countdown ? (
                  <>
                    {" "}
                    or wait <span style={creditBlockBannerCountdown(t)}>{countdown}</span> for
                    daily credits to reset
                  </>
                ) : (
                  " — daily credits will reset soon"
                )}
                <CreditSeeCostsControl t={t} />
              </>
            )}
          </span>
        </div>
        <div style={creditBlockBannerActions()}>
          <button
            type="button"
            style={creditBlockBannerAction(t)}
            onClick={() => openUpgrade(isFree ? "pro" : "topup", "dailyBlocked")}
          >
            {isFree ? "Go Pro" : "Top up"}
          </button>
        </div>
      </div>
    </div>
  );
}
