"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import { isCreditCatalogFlow, type CreditCatalogFlow } from "@/lib/credits/catalog-flow";
import {
  isValidCatalogSlug,
  restoreActionCost,
  restoreTopupPack,
  softDeleteActionCost,
  softDeleteTopupPack,
  upsertActionCost,
  upsertCreditPlan,
  upsertTopupPack,
} from "@/lib/credits/admin";

export type CreditsActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireSuperAdmin(): Promise<void> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) redirect("/");
}

function revalidateCreditsPaths() {
  revalidatePath("/super-admin/credits");
  revalidatePath("/", "layout");
}

function parseFlow(raw: FormDataEntryValue | null): CreditCatalogFlow | null {
  const value = String(raw ?? "").trim();
  return isCreditCatalogFlow(value) ? value : null;
}

function parseIntField(raw: FormDataEntryValue | null, fallback = 0): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Admin forms enter USD; DB stores cents. */
function parseUsdToCents(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const dollars = Number.parseFloat(s);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

function parseOptionalText(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "").trim();
  return s || null;
}

/** Empty → null (clear). Invalid non-empty → reject (do not wipe). */
function parsePriceIdField(
  raw: FormDataEntryValue | null,
): { ok: true; value: string | null } | { ok: false } {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: true, value: null };
  if (!s.startsWith("price_")) return { ok: false };
  return { ok: true, value: s };
}

export async function upsertCreditPlanAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();

  const flow = parseFlow(formData.get("flow"));
  const slug = String(formData.get("slug") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!flow) return { ok: false, error: "Catalog flow is required." };
  if (!slug || !displayName) {
    return { ok: false, error: "Display name is required." };
  }

  const monthlyPriceId = parsePriceIdField(formData.get("stripeMonthlyPriceId"));
  const annualPriceId = parsePriceIdField(formData.get("stripeAnnualPriceId"));
  if (!monthlyPriceId.ok || !annualPriceId.ok) {
    return {
      ok: false,
      error: "Stripe price IDs must be empty or start with price_.",
    };
  }

  try {
    const row = await upsertCreditPlan({
      flow,
      slug,
      displayName,
      monthlyLimit: parseIntField(formData.get("monthlyLimit")),
      dailyLimit: parseIntField(formData.get("dailyLimit")),
      blockDurationMs: parseIntField(formData.get("blockDurationMs"), 21_600_000),
      monthlyPriceCents: parseUsdToCents(formData.get("monthlyPrice")),
      annualPriceCents: parseUsdToCents(formData.get("annualPrice")),
      listPriceCents: parseUsdToCents(formData.get("listPrice")),
      annualListPriceCents: parseUsdToCents(formData.get("annualListPrice")),
      stripeMonthlyPriceId: monthlyPriceId.value,
      stripeAnnualPriceId: annualPriceId.value,
      syncStripe: formData.get("syncStripe") === "on",
    });
    if (!row) {
      return { ok: false, error: "Plan not found or could not be updated." };
    }
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "upsertCreditPlan" });
    Sentry.captureException(error);
    return {
      ok: false,
      error: "Could not save plan. Stripe sync may have failed — try again.",
    };
  }
}

export async function upsertActionCostAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();

  const flow = parseFlow(formData.get("flow"));
  const actionSlug = String(formData.get("actionSlug") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const cost = parseIntField(formData.get("cost"));
  if (!flow) return { ok: false, error: "Catalog flow is required." };
  if (!actionSlug || !label) {
    return { ok: false, error: "Action and label are required." };
  }

  try {
    const row = await upsertActionCost({ flow, actionSlug, label, cost });
    if (!row) {
      return {
        ok: false,
        error: "Could not save action cost. Check slug and cost.",
      };
    }
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, error: "Could not save action cost. Try again." };
  }
}

export async function deleteActionCostAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();
  const flow = parseFlow(formData.get("flow"));
  const actionSlug = String(formData.get("actionSlug") ?? "").trim();
  if (!flow || !actionSlug) return { ok: false, error: "Missing action slug." };

  try {
    const ok = await softDeleteActionCost(flow, actionSlug);
    if (!ok) return { ok: false, error: "Action cost not found." };
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, error: "Could not delete action cost. Try again." };
  }
}

export async function restoreActionCostAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();
  const flow = parseFlow(formData.get("flow"));
  const actionSlug = String(formData.get("actionSlug") ?? "").trim();
  if (!flow || !actionSlug) return { ok: false, error: "Missing action slug." };

  try {
    const ok = await restoreActionCost(flow, actionSlug);
    if (!ok) return { ok: false, error: "Action cost not found." };
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, error: "Could not restore action cost. Try again." };
  }
}

export async function upsertTopupPackAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();

  const flow = parseFlow(formData.get("flow"));
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const label = String(formData.get("label") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();
  if (!flow) return { ok: false, error: "Catalog flow is required." };
  if (!slug || !label || !blurb) {
    return { ok: false, error: "Slug, label, and blurb are required." };
  }
  if (!isValidCatalogSlug(slug)) {
    return {
      ok: false,
      error:
        "Slug must be kebab-case (start with a letter; letters, numbers, hyphens only).",
    };
  }

  const stripePriceId = parsePriceIdField(formData.get("stripePriceId"));
  if (!stripePriceId.ok) {
    return {
      ok: false,
      error: "Stripe price ID must be empty or start with price_.",
    };
  }

  const credits = parseIntField(formData.get("credits"));
  const priceCents = parseUsdToCents(formData.get("price"));
  if (credits <= 0) {
    return { ok: false, error: "Credits must be a positive integer." };
  }
  if (priceCents == null) {
    return { ok: false, error: "Price is required." };
  }

  try {
    const row = await upsertTopupPack({
      flow,
      slug,
      label,
      credits,
      priceCents,
      listPriceCents: parseUsdToCents(formData.get("listPrice")),
      blurb,
      discount: parseOptionalText(formData.get("discount")),
      popular: formData.get("popular") === "on",
      sortOrder: parseIntField(formData.get("sortOrder")),
      stripePriceId: stripePriceId.value,
      syncStripe: formData.get("syncStripe") === "on",
    });
    if (!row) {
      return { ok: false, error: "Could not save top-up pack. Check fields and try again." };
    }
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "upsertTopupPack" });
    Sentry.captureException(error);
    return {
      ok: false,
      error:
        "Could not save top-up pack. Stripe sync may have failed — try again or uncheck Stripe sync.",
    };
  }
}

export async function deleteTopupPackAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();
  const flow = parseFlow(formData.get("flow"));
  const slug = String(formData.get("slug") ?? "").trim();
  if (!flow || !slug) return { ok: false, error: "Missing pack slug." };

  try {
    const ok = await softDeleteTopupPack(flow, slug);
    if (!ok) return { ok: false, error: "Top-up pack not found." };
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, error: "Could not delete top-up pack. Try again." };
  }
}

export async function restoreTopupPackAction(
  formData: FormData,
): Promise<CreditsActionResult> {
  await requireSuperAdmin();
  const flow = parseFlow(formData.get("flow"));
  const slug = String(formData.get("slug") ?? "").trim();
  if (!flow || !slug) return { ok: false, error: "Missing pack slug." };

  try {
    const ok = await restoreTopupPack(flow, slug);
    if (!ok) return { ok: false, error: "Top-up pack not found." };
    revalidateCreditsPaths();
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, error: "Could not restore top-up pack. Try again." };
  }
}
