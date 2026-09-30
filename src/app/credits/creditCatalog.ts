import { useEffect, useState } from "react";
import {
  ACTION_LABELS,
  CREDIT_COSTS,
  INVESTOR_CREDIT_COSTS,
  INVESTOR_PLAN_LIMITS,
  INVESTOR_TOP_UP_OPTIONS,
  PLAN_LIMITS,
  PRO_INCLUDES,
  TOP_UP_OPTIONS,
  type TopUpPack,
} from "./constants";
import type { CreditActionType, CreditCosts, CreditPlan } from "./types";

const STORAGE_KEY = "fuel-credit-catalog-v2";
const LEGACY_STORAGE_KEY = "fuel-credit-catalog-v1";

export type CreditAudience = "founder" | "investor";

export type CatalogPlan = {
  id: CreditPlan;
  name: string;
  slug: string;
  monthly: number;
  daily: number;
  blockMs: number;
  feeMonthly: number | null;
  feeYearly: number | null;
  stripePrices: string[];
  deleted: boolean;
};

export type CatalogAction = {
  id: CreditActionType;
  label: string;
  cost: number;
  deleted: boolean;
};

export type CatalogTopUp = TopUpPack & {
  stripePrice?: string;
  deleted: boolean;
};

export type CreditFlow = {
  plans: CatalogPlan[];
  actions: CatalogAction[];
  topUps: CatalogTopUp[];
};

export type CreditCatalog = Record<CreditAudience, CreditFlow>;

type Listener = (catalog: CreditCatalog) => void;

const listeners = new Set<Listener>();

let activeAudience: CreditAudience = "founder";

export function getActiveCreditAudience(): CreditAudience {
  return activeAudience;
}

export function setActiveCreditAudience(audience: CreditAudience) {
  activeAudience = audience;
}

function defaultPlans(
  limits: Record<CreditPlan, { monthly: number; daily: number; blockMs: number }>,
  fees: { monthly: number | null; yearly: number | null },
): CatalogPlan[] {
  return [
    {
      id: "free",
      name: "Free",
      slug: "free",
      monthly: limits.free.monthly,
      daily: limits.free.daily,
      blockMs: limits.free.blockMs,
      feeMonthly: null,
      feeYearly: null,
      stripePrices: [],
      deleted: false,
    },
    {
      id: "pro",
      name: "Pro",
      slug: "pro",
      monthly: limits.pro.monthly,
      daily: limits.pro.daily,
      blockMs: limits.pro.blockMs,
      feeMonthly: fees.monthly,
      feeYearly: fees.yearly,
      stripePrices: [],
      deleted: false,
    },
  ];
}

function defaultActions(costs: CreditCosts): CatalogAction[] {
  return (Object.keys(CREDIT_COSTS) as CreditActionType[]).map(id => ({
    id,
    label: ACTION_LABELS[id],
    cost: costs[id],
    deleted: false,
  }));
}

function defaultTopUps(packs: TopUpPack[]): CatalogTopUp[] {
  return packs.map(pack => ({ ...pack, deleted: false }));
}

function defaultFlow(audience: CreditAudience): CreditFlow {
  if (audience === "investor") {
    return {
      plans: defaultPlans(INVESTOR_PLAN_LIMITS, { monthly: 99, yearly: 990 }),
      actions: defaultActions(INVESTOR_CREDIT_COSTS),
      topUps: defaultTopUps(INVESTOR_TOP_UP_OPTIONS),
    };
  }
  return {
    plans: defaultPlans(PLAN_LIMITS, { monthly: 30, yearly: 300 }),
    actions: defaultActions(CREDIT_COSTS),
    topUps: defaultTopUps(TOP_UP_OPTIONS),
  };
}

function defaultCatalog(): CreditCatalog {
  return {
    founder: defaultFlow("founder"),
    investor: defaultFlow("investor"),
  };
}

function mergePlans(base: CatalogPlan[], stored: CatalogPlan[] | undefined): CatalogPlan[] {
  return base.map(plan => {
    const next = stored?.find(item => item.id === plan.id);
    return next ? { ...plan, ...next, id: plan.id, slug: plan.slug } : plan;
  });
}

function mergeActions(base: CatalogAction[], stored: CatalogAction[] | undefined): CatalogAction[] {
  return base.map(action => {
    const next = stored?.find(item => item.id === action.id);
    return next ? { ...action, ...next, id: action.id } : action;
  });
}

function mergeTopUps(base: CatalogTopUp[], stored: CatalogTopUp[] | undefined): CatalogTopUp[] {
  if (!stored?.length) return base;
  return stored.map(pack => ({
    id: pack.id,
    credits: Number(pack.credits) || 0,
    price: Number(pack.price) || 0,
    label: pack.label || "Pack",
    blurb: pack.blurb || "",
    discount: pack.discount,
    popular: pack.popular,
    stripePrice: pack.stripePrice,
    deleted: Boolean(pack.deleted),
  }));
}

function mergeFlow(base: CreditFlow, stored?: Partial<CreditFlow> | null): CreditFlow {
  if (!stored) return base;
  return {
    plans: mergePlans(base.plans, stored.plans),
    actions: mergeActions(base.actions, stored.actions),
    topUps: mergeTopUps(base.topUps, stored.topUps),
  };
}

function isLegacyCatalog(value: unknown): value is CreditFlow {
  return Boolean(value && typeof value === "object" && "plans" in value && !("founder" in value));
}

function mergeCatalog(stored: unknown): CreditCatalog {
  const base = defaultCatalog();
  if (!stored || typeof stored !== "object") return base;
  if (isLegacyCatalog(stored)) {
    return {
      founder: mergeFlow(base.founder, stored),
      investor: base.investor,
    };
  }
  const next = stored as Partial<CreditCatalog>;
  return {
    founder: mergeFlow(base.founder, next.founder),
    investor: mergeFlow(base.investor, next.investor),
  };
}

function readStored(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let catalog: CreditCatalog = mergeCatalog(typeof window === "undefined" ? null : readStored());

function persist(next: CreditCatalog) {
  catalog = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach(listener => listener(next));
}

export function getCreditCatalog(): CreditCatalog {
  return catalog;
}

export function getCreditFlow(audience: CreditAudience = activeAudience): CreditFlow {
  return catalog[audience];
}

export function subscribeCreditCatalog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveCreditCatalog(next: CreditCatalog) {
  persist(mergeCatalog(next));
}

export function saveCreditFlow(audience: CreditAudience, flow: CreditFlow) {
  persist(mergeCatalog({ ...catalog, [audience]: flow }));
}

export function useCreditCatalog(): CreditCatalog {
  const [value, setValue] = useState(catalog);
  useEffect(() => subscribeCreditCatalog(setValue), []);
  return value;
}

function flowOf(audience?: CreditAudience): CreditFlow {
  return catalog[audience ?? activeAudience];
}

export function getPlanLimits(audience?: CreditAudience): Record<CreditPlan, { monthly: number; daily: number; blockMs: number }> {
  const who = audience ?? activeAudience;
  const out = { ...(who === "investor" ? INVESTOR_PLAN_LIMITS : PLAN_LIMITS) };
  for (const plan of flowOf(who).plans) {
    out[plan.id] = { monthly: plan.monthly, daily: plan.daily, blockMs: plan.blockMs };
  }
  return out;
}

export function getCreditCosts(audience?: CreditAudience): CreditCosts {
  const who = audience ?? activeAudience;
  const out = { ...(who === "investor" ? INVESTOR_CREDIT_COSTS : CREDIT_COSTS) };
  for (const action of flowOf(who).actions) {
    out[action.id] = action.cost;
  }
  return out;
}

export function getActionLabels(audience?: CreditAudience): Record<CreditActionType, string> {
  const out = { ...ACTION_LABELS };
  for (const action of flowOf(audience).actions) {
    out[action.id] = action.label;
  }
  return out;
}

export function getPublicActions(audience?: CreditAudience): CatalogAction[] {
  return flowOf(audience).actions.filter(action => !action.deleted);
}

export function getTopUpOptions(audience?: CreditAudience): TopUpPack[] {
  return flowOf(audience).topUps
    .filter(pack => !pack.deleted)
    .map(({ deleted: _deleted, stripePrice: _stripe, ...pack }) => pack);
}

export function getProPlan(audience?: CreditAudience): CatalogPlan {
  return flowOf(audience).plans.find(plan => plan.id === "pro") ?? defaultFlow(audience ?? activeAudience).plans[1];
}

export function getAdvisorFromPrice(audience?: CreditAudience): number {
  const pro = getProPlan(audience);
  return pro.feeYearly != null ? Math.round(pro.feeYearly / 12) : pro.feeMonthly ?? 25;
}

export function getProPriceFrame(audience?: CreditAudience): string {
  const monthly = getAdvisorFromPrice(audience);
  const who = (audience ?? activeAudience) === "investor"
    ? "portfolio intelligence without another full-time hire"
    : "a fraction of advisory retainers, zero equity dilution";
  return `From $${monthly}/mo — ${who}.`;
}

export function getProIncludes(audience?: CreditAudience): string[] {
  const pro = getProPlan(audience);
  const isInvestor = (audience ?? activeAudience) === "investor";
  return PRO_INCLUDES.map(line => {
    if (line.includes("credits/month")) {
      return `${pro.monthly.toLocaleString()} credits/month — research, documents, and AI guidance ${isInvestor ? "across the portfolio" : "on demand"}`;
    }
    if (isInvestor && line.includes("operating advisor")) {
      return "Always-on operating advisor across the portfolio, diligence, and value creation";
    }
    return line;
  });
}

export function nextStripePriceId(): string {
  return `price_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 8)}`;
}
