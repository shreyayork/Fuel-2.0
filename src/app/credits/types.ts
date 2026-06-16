export type CreditPlan = "free" | "pro";

export type CreditActionType =
  | "docUpload"
  | "aiChat"
  | "generateSource"
  | "playbookRun"
  | "crunchbaseEnrichment";

export type UpgradeReason = "monthlyEmpty" | "dailyBlocked" | "runningLow" | "healthy";

export type PopoverState = "dailyBlocked" | "monthlyEmpty" | "runningLow" | "healthy" | "justUnblocked";

export type MonthlyUsageStats = {
  signals: number;
  docs: number;
  messages: number;
};

export type CreditSnapshot = {
  plan: CreditPlan;
  monthlyUsed: number;
  monthlyLimit: number;
  dailyUsed: number;
  dailyLimit: number;
  topUpBalance: number;
  blockUntil: number | null;
  monthlyResetLabel: string;
  justUnblocked: boolean;
  monthlyLowToastShown: boolean;
  stats: MonthlyUsageStats;
};

export type CreditCosts = Record<CreditActionType, number>;

export type DemoPresetId =
  | "free-healthy"
  | "free-running-low"
  | "free-monthly-empty"
  | "free-daily-blocked"
  | "free-just-unblocked"
  | "pro-healthy"
  | "pro-running-low"
  | "pro-monthly-empty"
  | "pro-daily-blocked"
  | "pro-just-unblocked"
  | "pro-after-top-up";
