import { ACTION_LABELS, CREDIT_COSTS, PLAN_LIMITS } from "./constants";
import { createDemoFreeSnapshot, getDemoBlockMs, isDemoCreditMode } from "./demoFlow";
import type { CreditActionType, CreditPlan, CreditSnapshot, PopoverState, UpgradeReason } from "./types";

export function totalRemaining(snapshot: CreditSnapshot): number {
  return Math.max(0, snapshot.monthlyLimit + snapshot.topUpBalance - snapshot.monthlyUsed);
}

export function monthlyRemainingRatio(snapshot: CreditSnapshot): number {
  const cap = snapshot.monthlyLimit + snapshot.topUpBalance;
  if (cap <= 0) return 0;
  return totalRemaining(snapshot) / cap;
}

export function dailyRemaining(snapshot: CreditSnapshot): number {
  return Math.max(0, snapshot.dailyLimit - snapshot.dailyUsed);
}

export function isDailyBlocked(snapshot: CreditSnapshot, now = Date.now()): boolean {
  return snapshot.blockUntil != null && snapshot.blockUntil > now;
}

export function isMonthlyEmpty(snapshot: CreditSnapshot): boolean {
  return totalRemaining(snapshot) <= 0;
}

export function isGenerationBlocked(snapshot: CreditSnapshot, now = Date.now()): boolean {
  return isDailyBlocked(snapshot, now) || isMonthlyEmpty(snapshot);
}

export function getBarTone(snapshot: CreditSnapshot, now = Date.now()): "teal" | "amber" | "red" {
  if (isGenerationBlocked(snapshot, now)) return "red";
  const ratio = monthlyRemainingRatio(snapshot);
  if (ratio <= 0.1) return "red";
  if (ratio <= 0.3) return "amber";
  return "teal";
}

export function getPopoverState(snapshot: CreditSnapshot, now = Date.now()): PopoverState {
  if (snapshot.justUnblocked) return "justUnblocked";
  if (isDailyBlocked(snapshot, now)) return "dailyBlocked";
  if (isMonthlyEmpty(snapshot)) return "monthlyEmpty";
  const ratio = monthlyRemainingRatio(snapshot);
  if (ratio <= 0.3) return "runningLow";
  return "healthy";
}

export function getUpgradeReason(snapshot: CreditSnapshot, now = Date.now()): UpgradeReason {
  if (isMonthlyEmpty(snapshot)) return "monthlyEmpty";
  if (isDailyBlocked(snapshot, now)) return "dailyBlocked";
  if (monthlyRemainingRatio(snapshot) <= 0.3) return "runningLow";
  return "healthy";
}

export function blockRemainingMs(snapshot: CreditSnapshot, now = Date.now()): number {
  if (!snapshot.blockUntil) return 0;
  return Math.max(0, snapshot.blockUntil - now);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return "0m";
}

export function actionsRemaining(snapshot: CreditSnapshot, action: CreditActionType): number {
  const cost = CREDIT_COSTS[action];
  if (cost <= 0) return 0;
  return Math.floor(totalRemaining(snapshot) / cost);
}

export function daysUntilMonthlyEmpty(snapshot: CreditSnapshot): number | null {
  const remaining = totalRemaining(snapshot);
  if (remaining <= 0) return 0;
  const daysInMonth = 30;
  const used = snapshot.monthlyUsed;
  if (used <= 0) return null;
  const dailyAvg = used / Math.max(1, daysInMonth - 15);
  if (dailyAvg <= 0) return null;
  const daysLeft = Math.ceil(remaining / dailyAvg);
  if (daysLeft >= daysInMonth) return null;
  return daysLeft;
}

export function willRunOutBeforeReset(snapshot: CreditSnapshot): boolean {
  const days = daysUntilMonthlyEmpty(snapshot);
  return days != null && days < 30;
}

export function minCostForAction(action: CreditActionType): number {
  return CREDIT_COSTS[action];
}

export function canAfford(snapshot: CreditSnapshot, action: CreditActionType, now = Date.now()): boolean {
  if (isGenerationBlocked(snapshot, now)) return false;
  return totalRemaining(snapshot) >= CREDIT_COSTS[action];
}

export function applyDeduction(snapshot: CreditSnapshot, action: CreditActionType, now = Date.now()): CreditSnapshot {
  const cost = CREDIT_COSTS[action];
  let next = { ...snapshot, justUnblocked: false };
  let remainingCost = cost;

  const monthlyRoom = Math.max(0, next.monthlyLimit - next.monthlyUsed);
  const fromMonthly = Math.min(remainingCost, monthlyRoom);
  next.monthlyUsed += fromMonthly;
  remainingCost -= fromMonthly;

  if (remainingCost > 0) {
    next.topUpBalance = Math.max(0, next.topUpBalance - remainingCost);
  }

  next.dailyUsed += cost;

  if (action === "docUpload") next.stats = { ...next.stats, docs: next.stats.docs + 1, signals: next.stats.signals + 1 };
  if (action === "aiChat") next.stats = { ...next.stats, messages: next.stats.messages + 1 };
  if (action === "generateSource") next.stats = { ...next.stats, signals: next.stats.signals + 1 };

  const limits = PLAN_LIMITS[next.plan];
  if (next.dailyUsed >= next.dailyLimit) {
    const blockMs = isDemoCreditMode() ? getDemoBlockMs(next.plan) : limits.blockMs;
    next.blockUntil = now + blockMs;
  }

  if (totalRemaining(next) <= 0 && next.monthlyUsed >= next.monthlyLimit + next.topUpBalance) {
    // fully empty
  }

  return next;
}

export function createDefaultSnapshot(plan: CreditPlan = "free"): CreditSnapshot {
  if (isDemoCreditMode() && plan === "free") {
    return createDemoFreeSnapshot();
  }
  const limits = PLAN_LIMITS[plan];
  return {
    plan,
    monthlyUsed: plan === "free" ? 50 : 800,
    monthlyLimit: limits.monthly,
    dailyUsed: plan === "free" ? 20 : 90,
    dailyLimit: limits.daily,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Apr 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 12, docs: 2, messages: 18 },
  };
}

export function creditCostRows() {
  return (Object.keys(CREDIT_COSTS) as CreditActionType[]).map(key => ({
    action: key,
    label: ACTION_LABELS[key],
    cost: CREDIT_COSTS[key],
  }));
}
