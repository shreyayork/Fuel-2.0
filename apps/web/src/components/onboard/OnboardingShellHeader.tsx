"use client";

import type { ReactNode } from "react";
import { FuelMark } from "@/components/FuelMark";
import {
  onboardBrandSub,
  onboardBrandTitle,
  onboardStatusBadge,
  onboardTextButton,
  onboardTopBar,
} from "./styles";
import { SIGNAL, accentGradient, onAccentText } from "@/lib/theme";

export function OnboardingShellHeader({
  badge,
  badgeColor = SIGNAL.accent,
  badgeBg = SIGNAL.accentTint,
  badgeBorder = SIGNAL.accentSoft,
  onAction,
  actionLabel,
  leading,
}: {
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  onAction?: () => void;
  actionLabel?: string;
  leading?: ReactNode;
}) {
  return (
    <header style={onboardTopBar()}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {leading ?? (
          <>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: accentGradient(),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden
            >
              <FuelMark size={16} accent={onAccentText()} warm={SIGNAL.warn} deep={onAccentText()} />
            </div>
            <span style={onboardBrandTitle()}>Fuel</span>
            <span style={onboardBrandSub()}>by York IE</span>
          </>
        )}
        {badge ? (
          <span
            style={onboardStatusBadge({
              color: badgeColor,
              background: badgeBg,
              border: `1px solid ${badgeBorder}`,
              borderRadius: 4,
              padding: "2px 7px",
            })}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {onAction && actionLabel ? (
        <button type="button" onClick={onAction} className="fuel-onboard-text-btn" style={onboardTextButton()}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
