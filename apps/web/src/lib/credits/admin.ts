import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  creditActionCosts,
  creditPlans,
  topupPacks,
  type CreditActionCost,
  type CreditPlan,
  type TopupPack,
} from "@/db/schema";
import type { CreditCatalogFlow } from "./catalog-flow";
import { isCreditActionType } from "./constants";
import {
  archiveStripePrice,
  createRecurringStripePrice,
  createOneTimeStripePrice,
  isStripeConfigured,
} from "./stripe";

const SLUG_REGEX = /^[a-z][a-z0-9-]{1,62}$/;

export function isValidCatalogSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

export async function listCreditPlansAdmin(): Promise<CreditPlan[]> {
  const db = await getDb();
  return db.select().from(creditPlans).orderBy(asc(creditPlans.slug));
}

export async function listActionCostsAdmin(): Promise<CreditActionCost[]> {
  const db = await getDb();
  return db.select().from(creditActionCosts).orderBy(asc(creditActionCosts.actionSlug));
}

export async function listTopupPacksAdmin(): Promise<TopupPack[]> {
  const db = await getDb();
  return db.select().from(topupPacks).orderBy(asc(topupPacks.sortOrder), asc(topupPacks.slug));
}

function proProductName(flow: CreditCatalogFlow, interval: "month" | "year"): string {
  const who = flow === "investor" ? "Fuel Pro Investor" : "Fuel Pro";
  return interval === "month" ? `${who} (monthly)` : `${who} (annual)`;
}

export type UpsertCreditPlanInput = {
  flow: CreditCatalogFlow;
  slug: string;
  displayName: string;
  monthlyLimit: number;
  dailyLimit: number;
  blockDurationMs: number;
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  /** Display-only compare-at for monthly fee. Not Stripe-synced. */
  listPriceCents: number | null;
  /** Display-only compare-at for annual fee. Not Stripe-synced. */
  annualListPriceCents: number | null;
  stripeMonthlyPriceId: string | null;
  stripeAnnualPriceId: string | null;
  /** When true and Stripe is configured, create new Prices for changed amounts. */
  syncStripe: boolean;
};

export async function upsertCreditPlan(
  input: UpsertCreditPlanInput,
): Promise<CreditPlan | null> {
  const db = await getDb();
  const planKey = and(eq(creditPlans.flow, input.flow), eq(creditPlans.slug, input.slug));
  const [existing] = await db.select().from(creditPlans).where(planKey).limit(1);
  if (!existing) return null;

  if (
    input.listPriceCents != null &&
    (!Number.isInteger(input.listPriceCents) || input.listPriceCents < 0)
  ) {
    return null;
  }
  if (
    input.annualListPriceCents != null &&
    (!Number.isInteger(input.annualListPriceCents) || input.annualListPriceCents < 0)
  ) {
    return null;
  }

  let stripeMonthlyPriceId = input.stripeMonthlyPriceId;
  let stripeAnnualPriceId = input.stripeAnnualPriceId;
  const pricesToArchive: string[] = [];

  if (input.syncStripe && isStripeConfigured() && input.slug === "pro") {
    if (
      input.monthlyPriceCents != null &&
      input.monthlyPriceCents > 0 &&
      (input.monthlyPriceCents !== existing.monthlyPriceCents || !stripeMonthlyPriceId)
    ) {
      const created = await createRecurringStripePrice({
        productName: proProductName(input.flow, "month"),
        amountCents: input.monthlyPriceCents,
        interval: "month",
        metadata: { planSlug: "pro", cycle: "monthly", flow: input.flow },
      });
      if (existing.stripeMonthlyPriceId) {
        pricesToArchive.push(existing.stripeMonthlyPriceId);
      }
      stripeMonthlyPriceId = created;
    }
    if (
      input.annualPriceCents != null &&
      input.annualPriceCents > 0 &&
      (input.annualPriceCents !== existing.annualPriceCents || !stripeAnnualPriceId)
    ) {
      const created = await createRecurringStripePrice({
        productName: proProductName(input.flow, "year"),
        amountCents: input.annualPriceCents,
        interval: "year",
        metadata: { planSlug: "pro", cycle: "annual", flow: input.flow },
      });
      if (existing.stripeAnnualPriceId) {
        pricesToArchive.push(existing.stripeAnnualPriceId);
      }
      stripeAnnualPriceId = created;
    }
  }

  const [row] = await db
    .update(creditPlans)
    .set({
      displayName: input.displayName,
      monthlyLimit: input.monthlyLimit,
      dailyLimit: input.dailyLimit,
      blockDurationMs: input.blockDurationMs,
      monthlyPriceCents: input.monthlyPriceCents,
      annualPriceCents: input.annualPriceCents,
      listPriceCents: input.listPriceCents,
      annualListPriceCents: input.annualListPriceCents,
      stripeMonthlyPriceId,
      stripeAnnualPriceId,
      updatedAt: sql`now()`,
    })
    .where(planKey)
    .returning();

  if (row) {
    for (const priceId of pricesToArchive) {
      await archiveStripePrice(priceId);
    }
  }
  return row ?? null;
}

export type UpsertActionCostInput = {
  flow: CreditCatalogFlow;
  actionSlug: string;
  label: string;
  cost: number;
};

export async function upsertActionCost(
  input: UpsertActionCostInput,
): Promise<CreditActionCost | null> {
  if (!Number.isInteger(input.cost) || input.cost < 0) return null;
  const label = input.label.trim();
  if (!label) return null;

  const db = await getDb();
  const actionKey = and(
    eq(creditActionCosts.flow, input.flow),
    eq(creditActionCosts.actionSlug, input.actionSlug),
  );
  const [existing] = await db.select().from(creditActionCosts).where(actionKey).limit(1);

  // Existing rows (incl. restored catalog actions like crunchbaseEnrichment)
  // can always be edited. New rows must be a known chargeable action type.
  if (!existing && !isCreditActionType(input.actionSlug)) return null;

  if (existing) {
    const [row] = await db
      .update(creditActionCosts)
      .set({
        label,
        cost: input.cost,
        updatedAt: sql`now()`,
      })
      .where(actionKey)
      .returning();
    return row ?? null;
  }

  const [row] = await db
    .insert(creditActionCosts)
    .values({
      flow: input.flow,
      actionSlug: input.actionSlug,
      label,
      cost: input.cost,
      active: true,
    })
    .returning();
  return row ?? null;
}

export async function softDeleteActionCost(
  flow: CreditCatalogFlow,
  actionSlug: string,
): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(creditActionCosts)
    .set({ active: false, updatedAt: sql`now()` })
    .where(and(eq(creditActionCosts.flow, flow), eq(creditActionCosts.actionSlug, actionSlug)))
    .returning({ actionSlug: creditActionCosts.actionSlug });
  return Boolean(row);
}

export async function restoreActionCost(
  flow: CreditCatalogFlow,
  actionSlug: string,
): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(creditActionCosts)
    .set({ active: true, updatedAt: sql`now()` })
    .where(and(eq(creditActionCosts.flow, flow), eq(creditActionCosts.actionSlug, actionSlug)))
    .returning({ actionSlug: creditActionCosts.actionSlug });
  return Boolean(row);
}

export type UpsertTopupPackInput = {
  flow: CreditCatalogFlow;
  slug: string;
  label: string;
  credits: number;
  priceCents: number;
  /** Display-only compare-at. Not Stripe-synced. */
  listPriceCents: number | null;
  blurb: string;
  discount: string | null;
  popular: boolean;
  sortOrder: number;
  stripePriceId: string | null;
  syncStripe: boolean;
};

export async function upsertTopupPack(
  input: UpsertTopupPackInput,
): Promise<TopupPack | null> {
  if (!isValidCatalogSlug(input.slug)) return null;
  if (!Number.isInteger(input.credits) || input.credits <= 0) return null;
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) return null;
  if (
    input.listPriceCents != null &&
    (!Number.isInteger(input.listPriceCents) || input.listPriceCents < 0)
  ) {
    return null;
  }
  const label = input.label.trim();
  const blurb = input.blurb.trim();
  if (!label || !blurb) return null;

  const db = await getDb();
  const packKey = and(eq(topupPacks.flow, input.flow), eq(topupPacks.slug, input.slug));
  const [existing] = await db.select().from(topupPacks).where(packKey).limit(1);

  let stripePriceId = input.stripePriceId;
  let priceToArchive: string | null = null;

  if (input.syncStripe && isStripeConfigured()) {
    if (
      !existing ||
      input.priceCents !== existing.priceCents ||
      !stripePriceId
    ) {
      const created = await createOneTimeStripePrice({
        productName:
          input.flow === "investor"
            ? `Fuel Investor top-up · ${label}`
            : `Fuel top-up · ${label}`,
        amountCents: input.priceCents,
        metadata: { topupSlug: input.slug, flow: input.flow },
      });
      if (existing?.stripePriceId) {
        priceToArchive = existing.stripePriceId;
      }
      stripePriceId = created;
    }
  }

  if (existing) {
    // Recreate-via-upsert of a soft-deleted slug must reactivate the row.
    const [row] = await db
      .update(topupPacks)
      .set({
        label,
        credits: input.credits,
        priceCents: input.priceCents,
        listPriceCents: input.listPriceCents,
        blurb,
        discount: input.discount,
        popular: input.popular,
        sortOrder: input.sortOrder,
        stripePriceId,
        active: true,
        updatedAt: sql`now()`,
      })
      .where(packKey)
      .returning();
    if (row && priceToArchive) {
      await archiveStripePrice(priceToArchive);
    }
    return row ?? null;
  }

  const [row] = await db
    .insert(topupPacks)
    .values({
      flow: input.flow,
      slug: input.slug,
      label,
      credits: input.credits,
      priceCents: input.priceCents,
      listPriceCents: input.listPriceCents,
      blurb,
      discount: input.discount,
      popular: input.popular,
      sortOrder: input.sortOrder,
      stripePriceId,
      active: true,
    })
    .returning();
  if (row && priceToArchive) {
    await archiveStripePrice(priceToArchive);
  }
  return row ?? null;
}

export async function softDeleteTopupPack(
  flow: CreditCatalogFlow,
  slug: string,
): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(topupPacks)
    .set({ active: false, updatedAt: sql`now()` })
    .where(and(eq(topupPacks.flow, flow), eq(topupPacks.slug, slug)))
    .returning({ slug: topupPacks.slug });
  return Boolean(row);
}

export async function restoreTopupPack(flow: CreditCatalogFlow, slug: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(topupPacks)
    .set({ active: true, updatedAt: sql`now()` })
    .where(and(eq(topupPacks.flow, flow), eq(topupPacks.slug, slug)))
    .returning({ slug: topupPacks.slug });
  return Boolean(row);
}

