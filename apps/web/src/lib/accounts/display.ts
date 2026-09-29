import type { Account } from "@/db/schema";

type AccountPlanFields = Pick<Account, "planTier" | "planId" | "status">;

/** Human-facing plan name — Fuel has Free and Pro only (no trial tier). */
export function formatAccountPlanLabel(account: AccountPlanFields): string {
  if (account.planTier === "pro" || account.planId === "pro") return "Pro";
  return "Free";
}

/** Billing/subscription status for display (not the plan name). */
export function formatAccountStatusLabel(account: AccountPlanFields): string {
  if (account.status === "PAST_DUE") return "Past due";
  if (account.status === "CANCELED") return "Canceled";
  // Legacy DB default `TRIAL` on free accounts — no trial product exists.
  if (account.status === "TRIAL" || account.status === "ACTIVE") return "Active";
  return account.status;
}

export function accountStatusChipTone(
  account: AccountPlanFields,
): "positive" | "warn" | "negative" | "ghost" {
  if (account.status === "ACTIVE" || account.status === "TRIAL") return "positive";
  if (account.status === "PAST_DUE") return "warn";
  if (account.status === "CANCELED") return "negative";
  return "ghost";
}

export function accountPlanChipTone(
  account: AccountPlanFields,
): "positive" | "warn" | "negative" | "ghost" {
  return formatAccountPlanLabel(account) === "Pro" ? "positive" : "ghost";
}
