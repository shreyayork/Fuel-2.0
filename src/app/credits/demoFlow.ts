import { PLAN_LIMITS } from "./constants";
import { isDemoMode } from "./isDemoMode";
import type { CreditPlan, CreditSnapshot } from "./types";

/** Shorten wait timers during live demos. UI copy still says 24h / 6h. */
export const DEMO_ACCELERATED_WAITS = true;

export function getDemoBlockMs(plan: CreditPlan): number {
  const production = PLAN_LIMITS[plan].blockMs;
  if (!DEMO_ACCELERATED_WAITS) return production;
  return plan === "free" ? 2 * 60 * 1000 : 45 * 1000;
}

/** Post-onboarding free start: full trial balance (250), nothing pre-spent. */
export function createDemoFreeSnapshot(): CreditSnapshot {
  return {
    plan: "free",
    monthlyUsed: 0,
    monthlyLimit: PLAN_LIMITS.free.monthly,
    dailyUsed: 0,
    dailyLimit: PLAN_LIMITS.free.daily,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Apr 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 0, docs: 0, messages: 0 },
  };
}

export function createDemoProSnapshot(): CreditSnapshot {
  return {
    plan: "pro",
    monthlyUsed: 0,
    monthlyLimit: PLAN_LIMITS.pro.monthly,
    dailyUsed: 0,
    dailyLimit: PLAN_LIMITS.pro.daily,
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
