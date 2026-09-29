import type { ProfileModuleId } from "./profile-modules";

export type CreditPlanSlug = "free" | "pro";

export type CreditActionType =
  | "docUpload"
  | "aiChat"
  | "generateSource"
  | "playbookRun"
  | "hubspotSync"
  | "granolaSync"
  | "slackSync";

export type UpgradeReason = "monthlyEmpty" | "dailyBlocked" | "runningLow" | "healthy";

export type PopoverState =
  | "dailyBlocked"
  | "monthlyEmpty"
  | "runningLow"
  | "healthy"
  | "justUnblocked";

export type MonthlyUsageStats = {
  signals: number;
  docs: number;
  messages: number;
};

export type CreditSnapshot = {
  plan: CreditPlanSlug;
  /** Active Pro billing cycle when known from the Stripe period window. */
  billingCycle: "monthly" | "annual" | null;
  /** True when Stripe will cancel at current_period_end (access retained until then). */
  cancelAtPeriodEnd: boolean;
  /** Unix ms when the current Stripe billing period ends (Pro). */
  periodEndsAt: number | null;
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
  /** Free earnable modules completed (company / R&D / GTM / G&A). */
  profileModules: ProfileModuleId[];
  benchmarkEarned: boolean;
  setupIncomplete: boolean;
  profilePromptDismissed: boolean;
  remainingEarnable: number;
  qualifiedForRefill: boolean;
  /** Catalog monthly limit from credit_plans (not the Free spendable cap). */
  planMonthlyLimit: number;
  /** floor(planMonthlyLimit / 5) — each of the 5 Free earn blocks. */
  creditsPerBlock: number;
  /** Catalog audience this snapshot was priced from. */
  catalogFlow: "founder" | "investor";
};

export type ActionCostRow = {
  action: string;
  label: string;
  cost: number;
};

export type TopUpPackDto = {
  slug: string;
  label: string;
  credits: number;
  price: number;
  /** Optional compare-at USD for strike-through (admin-set list_price_cents). */
  listPrice?: number;
  blurb: string;
  discount?: string;
  popular?: boolean;
};

export type ProPlanDto = {
  monthlyPrice: number;
  annualPrice: number;
  /** Optional compare-at USD for monthly catalog strike (admin-set list_price_cents). */
  monthlyListPrice?: number;
  /** Optional compare-at USD for annual catalog strike (admin-set annual_list_price_cents). */
  annualListPrice?: number;
  monthlyLimit: number;
  dailyLimit: number;
  flow?: "founder" | "investor";
};

/** What Pro subscriber actually pays on their Stripe subscription item. */
export type SubscribedBilling = {
  amountCents: number;
  interval: "month" | "year";
  priceId: string;
};

export type TryActionResult =
  | { allowed: true; snapshot: CreditSnapshot }
  | {
      allowed: false;
      reason: "blocked" | "insufficient";
      snapshot: CreditSnapshot;
      balance?: number;
      required?: number;
    };

export type UsagePeriod = "1d" | "7d" | "30d" | "mtd" | "last-month";

/** One credit-consuming action on the Usage tab (F20A-168). */
export type CreditUsageActivityRow = {
  id: string;
  date: string;
  dateKey: string;
  email: string;
  action: string;
  actionSlug: string | null;
  credits: number;
};

export type CreditUsageReport = {
  range: { start: string; end: string; label: string };
  summary: {
    totalCredits: number;
    totalRuns: number;
    amountSpent: number;
    planSpend: number;
    topUpSpend: number;
  };
  activity: CreditUsageActivityRow[];
  users: string[];
};

export type BillingInvoiceTransactionType = "subscription" | "topup" | "other";

/** Frontend-safe Stripe invoice row for Account → Billing. */
export type BillingInvoiceDto = {
  /** Fuel auto-increment display id. */
  invoiceId: string;
  /** Stripe invoice `number` as returned — null when Stripe has none yet. */
  invoiceNumber: string | null;
  invoiceDate: string;
  invoiceStatus: string;
  hostedInvoiceUrl: string | null;
  /**
   * Stripe `invoice_pdf` retained for reference only.
   * Billing Download uses `fuelPdfDownloadPath` (Fuel-branded PDF).
   */
  invoicePdfUrl: string | null;
  /** True when Fuel branded PDF is stored (or download can generate it for paid). */
  hasFuelPdf: boolean;
  /** Account-scoped inline-view path for Fuel PDF — never a raw S3 key. */
  fuelPdfViewPath: string | null;
  /** Account-scoped download path for Fuel PDF — never a raw S3 key. */
  fuelPdfDownloadPath: string | null;
};

export type BillingInvoiceListResponse = {
  invoices: BillingInvoiceDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
