import { getActiveCreditAudience, getPlanLimits } from "./creditCatalog";
import { isDemoMode } from "./isDemoMode";
import type { CreditPlan, CreditSnapshot } from "./types";

/** Shorten wait timers during live demos. UI copy still says 24h / 6h. */
export const DEMO_ACCELERATED_WAITS = true;

export function getDemoBlockMs(plan: CreditPlan): number {
  const production = getPlanLimits()[plan].blockMs;
  if (!DEMO_ACCELERATED_WAITS) return production;
  return plan === "free" ? 2 * 60 * 1000 : 45 * 1000;
}

/** Founders start at earned profile credits. Investors get the full Free pool from Super Admin. */
export function createDemoFreeSnapshot(earnedCredits = 0): CreditSnapshot {
  const limits = getPlanLimits().free;
  const monthlyLimit = getActiveCreditAudience() === "investor"
    ? limits.monthly
    : Math.max(0, Math.min(limits.monthly, Math.round(earnedCredits)));
  return {
    plan: "free",
    monthlyUsed: 0,
    monthlyLimit,
    dailyUsed: 0,
    dailyLimit: limits.daily,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Apr 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 0, docs: 0, messages: 0 },
  };
}

export function createDemoProSnapshot(): CreditSnapshot {
  const limits = getPlanLimits().pro;
  return {
    plan: "pro",
    monthlyUsed: 0,
    monthlyLimit: limits.monthly,
    dailyUsed: 0,
    dailyLimit: limits.daily,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Apr 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 0, docs: 0, messages: 0 },
  };
}

export function isDemoCreditMode(): boolean {
  return isDemoMode;
}
