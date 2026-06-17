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
  pro: { monthly: 2000, daily: 200, blockMs: 6 * 60 * 60 * 1000 },
};

export type TopUpPack = {
  id: string;
  credits: number;
  price: number;
  label: string;
  blurb: string;
  discount?: string;
  popular?: boolean;
};

export const TOP_UP_OPTIONS: TopUpPack[] = [
  {
    id: "sprint",
    credits: 1000,
    price: 12,
    label: "Sprint",
    blurb: "A focused session — fundraising prep, board deck review, or a deep dive on one company.",
  },
  {
    id: "builder",
    credits: 2000,
    price: 20,
    label: "Builder",
    blurb: "A strong week — multiple document uploads, several playbook runs, and ongoing AI research.",
    discount: "Save 17%",
  },
  {
    id: "growth",
    credits: 5000,
    price: 48,
    label: "Growth",
    blurb: "A heavy month — full document library, deep playbook runs, and AI research across your whole portfolio.",
    discount: "Save 20%",
    popular: true,
  },
  {
    id: "scale",
    credits: 8000,
    price: 77,
    label: "Scale",
    blurb: "A full fundraising sprint or due diligence cycle — maximum intelligence generation across many sources.",
    discount: "Save 20%",
  },
];

export const TOP_UP_FOOTNOTE =
  "Credits added instantly · never expire · monthly credits used first · unblocks your day immediately";

export const ACTION_LABELS: Record<CreditActionType, string> = {
  docUpload: "Doc upload + signal",
  aiChat: "AI chat message",
  generateSource: "Generate source",
  playbookRun: "Playbook run",
  crunchbaseEnrichment: "Crunchbase enrichment",
};
