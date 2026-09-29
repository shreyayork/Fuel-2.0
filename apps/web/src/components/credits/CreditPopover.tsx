"use client";

import React, { useEffect, type CSSProperties, type ReactNode } from "react";
import {
  actionsRemaining,
  dailyRemaining,
  daysUntilMonthlyEmpty,
  formatCountdown,
  hasActiveBlockCountdown,
  totalRemaining,
  willRunOutBeforeReset,
} from "@/lib/credits/logic";
import { popoverShowsActionCosts } from "@/lib/credits/action-cost-display";
import { PRO_TAGLINE, proFromPriceLabel, proPriceFrame } from "@/lib/credits/constants";
import type { ActionCostRow, CreditSnapshot, PopoverState, ProPlanDto } from "@/lib/credits/types";
import type { Theme } from "@/lib/theme";
import { useTheme } from "../ThemeContext";
import { ActionCostList } from "./ActionCostList";
import { useCredits } from "./CreditProvider";
import {
  creditGhostButton,
  creditPopoverActions,
  creditPopoverCountdown,
  creditPopoverEmphasis,
  creditPopoverStatRow,
  creditPopoverStats,
  creditPopoverSurface,
  creditPopoverText,
  creditPopoverTitle,
  creditPrimaryButton,
} from "./styles";

export type CreditPopoverContentProps = {
  t: Theme;
  snapshot: CreditSnapshot;
  actionCosts: ActionCostRow[];
  proPlan: ProPlanDto;
  popoverState: PopoverState;
  blockCountdownMs: number;
  openUpgrade: (
    tab: "pro" | "topup",
    reason: "monthlyEmpty" | "dailyBlocked" | "runningLow" | "healthy",
  ) => void;
  setPopoverOpen: (open: boolean) => void;
  style?: CSSProperties;
};

/** Presentational popover body — testable without CreditProvider. */
export function CreditPopoverContent({
  t,
  snapshot,
  actionCosts,
  proPlan,
  popoverState,
  blockCountdownMs,
  openUpgrade,
  setPopoverOpen,
  style,
}: CreditPopoverContentProps) {
  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);
  const isFree = snapshot.plan === "free";
  const fromPrice = proFromPriceLabel(proPlan);
  const priceFrame = proPriceFrame(proPlan);
  const showBlockCountdown = hasActiveBlockCountdown(blockCountdownMs);
  const blockCountdownLabel = showBlockCountdown
    ? formatCountdown(blockCountdownMs)
    : null;
  const showCosts = popoverShowsActionCosts(popoverState);

  const renderActions = (primary: ReactNode, secondary?: ReactNode) => (
    <div style={creditPopoverActions()}>
      {primary}
      {secondary}
    </div>
  );

  const costFor = (action: string) =>
    actionCosts.find((row) => row.action === action)?.cost ?? 0;

  const costs = showCosts ? <ActionCostList t={t} actionCosts={actionCosts} /> : null;

  let body: ReactNode;

  switch (popoverState) {
    case "dailyBlocked":
      body = (
        <>
          <h4 style={creditPopoverTitle(t)}>
            {isFree ? "Free limit reached" : "Pro daily pause"}
          </h4>
          <p style={creditPopoverText(t)}>
            {isFree
              ? `Your free advisor allowance is paused for today. Pro keeps you moving — ${fromPrice}, not equity.`
              : "You've used today's Pro allowance. Top up for more, or wait 6 hours for daily credits to reset."}
          </p>
          {blockCountdownLabel ? (
            <div style={creditPopoverCountdown(t)}>{blockCountdownLabel}</div>
          ) : null}
          {costs}
          <p style={creditPopoverText(t)}>
            {remaining.toLocaleString()} monthly credits remain on your account.
          </p>
          {renderActions(
            <button
              type="button"
              style={creditPrimaryButton(t)}
              onClick={() => openUpgrade(isFree ? "pro" : "topup", "dailyBlocked")}
            >
              {isFree ? `Get your AI advisor · ${fromPrice}` : "Top up credits"}
            </button>,
            <button
              type="button"
              style={creditGhostButton(t)}
              onClick={() => setPopoverOpen(false)}
            >
              {blockCountdownLabel ? `Wait · ${blockCountdownLabel}` : "Wait"}
            </button>,
          )}
        </>
      );
      break;
    case "monthlyEmpty":
      body = (
        <>
          <h4 style={creditPopoverTitle(t)}>Monthly credits used up</h4>
          <div style={creditPopoverStats(t)}>
            <div style={creditPopoverStatRow(t)}>
              <span>Signals generated</span>
              <strong>{snapshot.stats.signals}</strong>
            </div>
            <div style={creditPopoverStatRow(t)}>
              <span>Docs uploaded</span>
              <strong>{snapshot.stats.docs}</strong>
            </div>
            <div style={creditPopoverStatRow(t)}>
              <span>AI messages</span>
              <strong>{snapshot.stats.messages}</strong>
            </div>
          </div>
          {costs}
          <p style={creditPopoverText(t)}>Your existing intelligence is safe — nothing is lost.</p>
          {isFree ? (
            <>
              <p style={creditPopoverText(t)}>{PRO_TAGLINE}</p>
              <p style={creditPopoverText(t)}>{priceFrame}</p>
              {renderActions(
                <button
                  type="button"
                  style={creditPrimaryButton(t)}
                  onClick={() => openUpgrade("pro", "monthlyEmpty")}
                >
                  Go Pro · {fromPrice}
                </button>,
              )}
            </>
          ) : (
            renderActions(
              <button
                type="button"
                style={creditPrimaryButton(t)}
                onClick={() => openUpgrade("topup", "monthlyEmpty")}
              >
                Top up credits
              </button>,
            )
          )}
        </>
      );
      break;
    case "runningLow":
      body = (
        <>
          <h4 style={creditPopoverTitle(t)}>Running low</h4>
          <p style={creditPopoverText(t)}>
            <strong style={creditPopoverEmphasis(t)}>{remaining.toLocaleString()}</strong> credits
            left · resets {snapshot.monthlyResetLabel}
          </p>
          {willRunOutBeforeReset(snapshot) ? (
            <p style={creditPopoverText(t)}>
              At your current pace, you&apos;ll run out in about{" "}
              {daysUntilMonthlyEmpty(snapshot)} days.
            </p>
          ) : null}
          <p style={creditPopoverText(t)}>
            ~{actionsRemaining(snapshot, "docUpload", costFor("docUpload"))} doc uploads · ~
            {actionsRemaining(snapshot, "aiChat", costFor("aiChat"))} AI messages left
            {snapshot.plan === "pro"
              ? ` · ~${actionsRemaining(snapshot, "playbookRun", costFor("playbookRun"))} playbook runs`
              : ""}
          </p>
          <p style={creditPopoverText(t)}>{dailyLeft} daily credits left today.</p>
          {costs}
          {isFree ? <p style={creditPopoverText(t)}>{priceFrame}</p> : null}
          {renderActions(
            <button
              type="button"
              style={creditPrimaryButton(t)}
              onClick={() => openUpgrade(isFree ? "pro" : "topup", "runningLow")}
            >
              {isFree ? `Go Pro · ${fromPrice}` : "Top up credits"}
            </button>,
          )}
        </>
      );
      break;
    case "justUnblocked":
      body = (
        <>
          <h4 style={creditPopoverTitle(t)}>You&apos;re unblocked</h4>
          <p style={creditPopoverText(t)}>
            Daily credits are available again — {dailyLeft} of {snapshot.dailyLimit} today.
          </p>
          <p style={creditPopoverText(t)}>
            {remaining.toLocaleString()} monthly credits remaining.
          </p>
          {costs}
          {isFree ? (
            <p style={{ ...creditPopoverText(t), marginTop: 8 }}>
              Pro keeps your AI advisor available — daily resets in 6 hours, {fromPrice}.
            </p>
          ) : null}
          {isFree
            ? renderActions(
                <button
                  type="button"
                  style={creditGhostButton(t)}
                  onClick={() => openUpgrade("pro", "healthy")}
                >
                  See Pro · {fromPrice}
                </button>,
              )
            : null}
        </>
      );
      break;
    default:
      body = (
        <>
          <h4 style={creditPopoverTitle(t)}>{remaining.toLocaleString()} credits left</h4>
          <p style={creditPopoverText(t)}>
            Resets {snapshot.monthlyResetLabel} · {dailyLeft} daily credits left today
          </p>
          {costs}
          {isFree
            ? renderActions(
                <button
                  type="button"
                  style={creditGhostButton(t)}
                  onClick={() => openUpgrade("pro", "healthy")}
                >
                  Get your AI advisor · {fromPrice}
                </button>,
              )
            : renderActions(
                <button
                  type="button"
                  style={creditGhostButton(t)}
                  onClick={() => openUpgrade("topup", "healthy")}
                >
                  Top up credits
                </button>,
              )}
        </>
      );
  }

  return (
    <div style={creditPopoverSurface(t, style)} role="dialog" aria-label="Credit usage">
      {body}
    </div>
  );
}

export function CreditPopover({ style }: { style?: CSSProperties }) {
  const t = useTheme();
  const {
    snapshot,
    actionCosts,
    proPlan,
    popoverState,
    blockCountdownMs,
    openUpgrade,
    clearJustUnblocked,
    setPopoverOpen,
  } = useCredits();

  useEffect(() => {
    if (popoverState === "justUnblocked") {
      const timer = window.setTimeout(clearJustUnblocked, 8000);
      return () => window.clearTimeout(timer);
    }
  }, [clearJustUnblocked, popoverState]);

  if (!snapshot) return null;

  return (
    <CreditPopoverContent
      t={t}
      snapshot={snapshot}
      actionCosts={actionCosts}
      proPlan={proPlan}
      popoverState={popoverState}
      blockCountdownMs={blockCountdownMs}
      openUpgrade={openUpgrade}
      setPopoverOpen={setPopoverOpen}
      style={style}
    />
  );
}
