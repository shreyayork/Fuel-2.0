import { CREDIT_COSTS, PLAN_LIMITS } from "./constants";
import { isDemoMode } from "./isDemoMode";
import type { CreditPlan, CreditSnapshot } from "./types";

/** Shorten wait timers during live demos. UI copy still says 24h / 6h. */
export const DEMO_ACCELERATED_WAITS = true;

const DEMO_FREE_ACTION_BUDGET = CREDIT_COSTS.docUpload * 2;
const DEMO_PRO_ACTION_BUDGET = CREDIT_COSTS.docUpload * 3;

export function getDemoBlockMs(plan: CreditPlan): number {
  const production = PLAN_LIMITS[plan].blockMs;
  if (!DEMO_ACCELERATED_WAITS) return production;
  return plan === "free" ? 2 * 60 * 1000 : 45 * 1000;
}

export function createDemoFreeSnapshot(): CreditSnapshot {
  return {
    plan: "free",
    monthlyUsed: 40,
    monthlyLimit: PLAN_LIMITS.free.monthly,
    dailyUsed: 0,
    dailyLimit: DEMO_FREE_ACTION_BUDGET,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Apr 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 4, docs: 1, messages: 6 },
  };
}

export function createDemoProSnapshot(): CreditSnapshot {
  return {
    plan: "pro",
    monthlyUsed: 120,
    monthlyLimit: PLAN_LIMITS.pro.monthly,
    dailyUsed: 0,
    dailyLimit: DEMO_PRO_ACTION_BUDGET,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Apr 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 18, docs: 3, messages: 24 },
  };
}

export function isDemoCreditMode(): boolean {
  return isDemoMode;
}
