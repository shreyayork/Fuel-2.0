import type { CreditActionType, CreditCosts, CreditPlan } from "./types";

export const CREDIT_COSTS: CreditCosts = {
  docUpload: 15,
  aiChat: 3,
  generateSource: 8,
  playbookRun: 40,
  crunchbaseEnrichment: 5,
};

export const PLAN_LIMITS: Record<CreditPlan, { monthly: number; daily: number; blockMs: number }> = {
  free: { monthly: 250, daily: 50, blockMs: 24 * 60 * 60 * 1000 },
  pro: { monthly: 4000, daily: 400, blockMs: 6 * 60 * 60 * 1000 },
};

export const TOP_UP_OPTIONS = [
  { id: "starter", credits: 300, price: 3, label: "Starter", blurb: "~20 AI messages or 3 doc uploads" },
  { id: "builder", credits: 800, price: 7, label: "Builder", blurb: "~50 AI messages or 8 doc uploads", popular: true },
  { id: "scale", credits: 2000, price: 15, label: "Scale", blurb: "~130 AI messages or 20 doc uploads" },
] as const;

export const ACTION_LABELS: Record<CreditActionType, string> = {
  docUpload: "Doc upload + signal",
  aiChat: "AI chat message",
  generateSource: "Generate source",
  playbookRun: "Playbook run",
  crunchbaseEnrichment: "Crunchbase enrichment",
};
