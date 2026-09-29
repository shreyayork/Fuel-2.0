"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import {
  YORK_PARTNER_CATEGORIES,
  type YorkPartnerCategoryId,
} from "@/lib/york-partner";
import {
  resetCategoryChipHeadlines,
  resetChipHeadline,
  upsertChipHeadline,
} from "@/lib/york-partner/headlines";
import {
  setMarketingBannerDismissDays,
  validateMarketingBannerDismissDaysInput,
} from "@/lib/york-partner/banner-settings";

export type ChipsActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireSuperAdminEmail(): Promise<string> {
  const session = await getSession();
  if (!isSuperAdmin(session)) redirect("/");
  return session?.email ?? "super-admin";
}

function parseCategory(raw: FormDataEntryValue | null): YorkPartnerCategoryId | null {
  const value = String(raw ?? "").trim();
  return (YORK_PARTNER_CATEGORIES as readonly string[]).includes(value)
    ? (value as YorkPartnerCategoryId)
    : null;
}

export async function saveChipHeadlineAction(formData: FormData) {
  const email = await requireSuperAdminEmail();
  const category = parseCategory(formData.get("category"));
  const chipLabel = String(formData.get("chipLabel") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  if (!category || !chipLabel || !headline) return;
  try {
    await upsertChipHeadline({
      category,
      chipLabel,
      headline,
      updatedByEmail: email,
    });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
  revalidatePath("/super-admin/chips");
}

export async function resetChipHeadlineAction(formData: FormData) {
  await requireSuperAdminEmail();
  const category = parseCategory(formData.get("category"));
  const chipLabel = String(formData.get("chipLabel") ?? "").trim();
  if (!category || !chipLabel) return;
  try {
    await resetChipHeadline({ category, chipLabel });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
  revalidatePath("/super-admin/chips");
}

export async function resetCategoryChipHeadlinesAction(formData: FormData) {
  await requireSuperAdminEmail();
  const category = parseCategory(formData.get("category"));
  if (!category) return;
  try {
    await resetCategoryChipHeadlines(category);
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
  revalidatePath("/super-admin/chips");
}

export async function saveMarketingBannerDismissDaysAction(
  formData: FormData,
): Promise<ChipsActionResult> {
  const email = await requireSuperAdminEmail();
  const validated = validateMarketingBannerDismissDaysInput(
    formData.get("dismissHideDays"),
  );
  if (!validated.ok) {
    return { ok: false, error: validated.message };
  }
  try {
    await setMarketingBannerDismissDays({
      days: validated.days,
      updatedByEmail: email,
    });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
  revalidatePath("/super-admin/chips");
  return { ok: true };
}
