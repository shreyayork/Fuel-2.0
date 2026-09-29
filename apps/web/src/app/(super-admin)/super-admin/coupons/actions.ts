"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import {
  archiveCouponCampaign,
  createCouponCampaign,
  ensureRecipientsForEmails,
  generateCodesForEmails,
  parseEmailList,
  sendCouponEmails,
  setCouponCampaignActive,
} from "@/lib/credits/coupon-campaigns";
import { parseRecipientIdList } from "@/lib/credits/coupon-emails";
import { getCreditPlan } from "@/lib/credits/queries";
import { isStripeConfigured } from "@/lib/credits/stripe";

export type CouponsActionResult =
  | {
      ok: true;
      message?: string;
      campaignId?: string;
      /** Newly minted recipient row ids (generate action only). */
      createdRecipientIds?: string[];
    }
  | { ok: false; error: string };

async function requireSuperAdmin(): Promise<string> {
  const session = await getSession();
  const devEmail = process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie";
  if (!isSuperAdmin(session, devEmail)) redirect("/");
  return session?.email ?? "mike@york.ie";
}

function revalidateCoupons(campaignId?: string) {
  revalidatePath("/super-admin/coupons");
  if (campaignId) revalidatePath(`/super-admin/coupons/${campaignId}`);
  revalidatePath("/super-admin/users");
}

export async function createCouponCampaignAction(
  formData: FormData,
): Promise<CouponsActionResult> {
  const email = await requireSuperAdmin();
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured in this environment." };
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "Name is required." };

    const benefitType = String(formData.get("benefitType") ?? "percent_off");
    const durationRaw = String(formData.get("duration") ?? "once");
    const durationInMonths = Number(formData.get("durationInMonths") ?? 0);
    const percentOff = Number(formData.get("percentOff") ?? 0);
    const amountOffDollars = Number(formData.get("amountOffDollars") ?? 0);
    const codePrefix = String(formData.get("codePrefix") ?? "FUEL1").trim();
    const description = String(formData.get("description") ?? "").trim();
    const redeemByRaw = String(formData.get("redeemBy") ?? "").trim();
    const applyMonthly = formData.get("applyMonthly") === "on";
    const applyAnnual = formData.get("applyAnnual") === "on";
    const audience =
      String(formData.get("audience") ?? "targeted") === "global"
        ? ("global" as const)
        : ("targeted" as const);
    const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "").trim();
    const maxRedemptions = maxRedemptionsRaw
      ? Number(maxRedemptionsRaw)
      : null;

    let redeemBy: Date | null = null;
    if (redeemByRaw) {
      // Prefer ISO UTC from the client (`datetimeLocalToIsoUtc`). Bare
      // `YYYY-MM-DDTHH:mm` is ambiguous on UTC servers — reject it.
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(redeemByRaw)) {
        return {
          ok: false,
          error:
            "Expiration must include a timezone (refresh and try again).",
        };
      }
      const d = new Date(redeemByRaw);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid expiration date." };
      }
      redeemBy = d;
    }

    const duration =
      durationRaw === "repeating"
        ? ({ duration: "repeating" as const, durationInMonths })
        : durationRaw === "forever"
          ? ({ duration: "forever" as const })
          : ({ duration: "once" as const });

    if (duration.duration === "repeating" && durationInMonths < 1) {
      return { ok: false, error: "Repeating duration needs months ≥ 1." };
    }

    const benefit =
      benefitType === "amount_off"
        ? {
            type: "amount_off" as const,
            amountOffCents: Math.round(amountOffDollars * 100),
            currency: "usd",
          }
        : {
            type: "percent_off" as const,
            percentOff: Math.round(percentOff),
          };

    if (benefit.type === "percent_off") {
      if (benefit.percentOff < 1 || benefit.percentOff > 100) {
        return { ok: false, error: "Percent off must be 1–100." };
      }
    } else if (benefit.amountOffCents < 1) {
      return { ok: false, error: "Amount off must be greater than 0." };
    }

    if (
      audience === "global" &&
      maxRedemptions != null &&
      (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)
    ) {
      return {
        ok: false,
        error: "Global max redemptions must be blank (unlimited) or ≥ 1.",
      };
    }

    const appliesToPriceIds: string[] = [];
    if (applyMonthly || applyAnnual) {
      const plan = await getCreditPlan("pro", "founder");
      if (applyMonthly && plan.stripeMonthlyPriceId) {
        appliesToPriceIds.push(plan.stripeMonthlyPriceId);
      }
      if (applyAnnual && plan.stripeAnnualPriceId) {
        appliesToPriceIds.push(plan.stripeAnnualPriceId);
      }
      if (appliesToPriceIds.length === 0) {
        return {
          ok: false,
          error:
            "Pro Stripe Price ids are not configured — leave price restriction unchecked or set prices first.",
        };
      }
    }

    const campaign = await createCouponCampaign({
      name,
      description: description || null,
      benefit,
      duration,
      redeemBy,
      appliesToPriceIds,
      codePrefix,
      audience,
      maxRedemptions,
      createdByEmail: email,
    });

    revalidateCoupons(campaign.id);
    const globalNote =
      campaign.audience === "global" && campaign.globalPromotionCode
        ? ` Shared code: ${campaign.globalPromotionCode}.`
        : "";
    return {
      ok: true,
      campaignId: campaign.id,
      message: `Campaign created (Stripe coupon ${campaign.stripeCouponId}).${globalNote}`,
    };
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "createCouponCampaign" });
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "create_failed";
    return { ok: false, error: message };
  }
}

export async function setCouponCampaignActiveAction(
  formData: FormData,
): Promise<CouponsActionResult> {
  await requireSuperAdmin();
  const id = String(formData.get("campaignId") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { ok: false, error: "Missing campaign id." };
  try {
    await setCouponCampaignActive(id, active);
    revalidateCoupons(id);
    return {
      ok: true,
      message: active ? "Campaign activated." : "Campaign deactivated.",
    };
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "status_update_failed",
    };
  }
}

export async function archiveCouponCampaignAction(
  formData: FormData,
): Promise<CouponsActionResult> {
  await requireSuperAdmin();
  const id = String(formData.get("campaignId") ?? "").trim();
  if (!id) return { ok: false, error: "Missing campaign id." };
  try {
    await archiveCouponCampaign(id);
    revalidateCoupons(id);
    return { ok: true, message: "Campaign archived." };
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "archive_failed",
    };
  }
}

export async function generateCouponCodesAction(
  formData: FormData,
): Promise<CouponsActionResult> {
  await requireSuperAdmin();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const emailsRaw = String(formData.get("emails") ?? "");
  if (!campaignId) return { ok: false, error: "Missing campaign id." };

  const emails = parseEmailList(emailsRaw);
  if (emails.length === 0) {
    return { ok: false, error: "No valid emails found." };
  }
  if (emails.length > 500) {
    return {
      ok: false,
      error: "Max 500 emails per generate request. Split the list and retry.",
    };
  }

  try {
    const result = await generateCodesForEmails(campaignId, emails);
    revalidateCoupons(campaignId);
    const failNote =
      result.failed.length > 0
        ? ` ${result.failed.length} failed at Stripe.`
        : "";
    return {
      ok: true,
      message: `Generated ${result.created} new promotion code(s); skipped ${result.skippedExisting} already in this campaign.${failNote}`,
      createdRecipientIds: result.createdRecipientIds,
    };
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "generateCouponCodes" });
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "generate_failed",
    };
  }
}

export async function sendCouponEmailsAction(
  formData: FormData,
): Promise<CouponsActionResult> {
  await requireSuperAdmin();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, error: "Missing campaign id." };

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const recipientIdsRaw = String(formData.get("recipientIds") ?? "").trim();
  const mode = String(formData.get("mode") ?? "unsent");

  const recipientIds = recipientId
    ? [recipientId]
    : recipientIdsRaw
      ? parseRecipientIdList(recipientIdsRaw)
      : undefined;

  // Single-row Resend: force send even if already "sent".
  // Scoped batch + campaign-wide: only pending/failed.
  const forceResend = Boolean(recipientId) && !recipientIdsRaw;
  const onlyUnsent = forceResend ? false : mode !== "all";

  try {
    const result = await sendCouponEmails({
      campaignId,
      recipientIds,
      onlyUnsent,
    });
    revalidateCoupons(campaignId);
    const failNote =
      result.failed.length > 0
        ? ` ${result.failed.length} failed — check send errors in the table.`
        : "";
    return {
      ok: true,
      message: `Sent ${result.sent} email(s).${failNote}`,
    };
  } catch (error) {
    Sentry.setTag("integration", "ses");
    Sentry.setContext("operation", { name: "sendCouponEmails" });
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
}

/** Users Admin: mint (if needed) + email selected users for a campaign. */
export async function sendCouponsToUsersAction(
  formData: FormData,
): Promise<CouponsActionResult> {
  await requireSuperAdmin();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const emailsRaw = String(formData.get("emails") ?? "");
  if (!campaignId) return { ok: false, error: "Missing campaign id." };

  const emails = parseEmailList(emailsRaw);
  if (emails.length === 0) {
    return { ok: false, error: "Select at least one user." };
  }
  if (emails.length > 200) {
    return { ok: false, error: "Max 200 users per send. Narrow the selection." };
  }

  try {
    const ensured = await ensureRecipientsForEmails(campaignId, emails);
    const result = await sendCouponEmails({
      campaignId,
      recipientIds: ensured.recipientIds,
      onlyUnsent: true,
    });
    revalidateCoupons(campaignId);
    const failNote =
      result.failed.length > 0
        ? ` ${result.failed.length} failed.`
        : "";
    return {
      ok: true,
      message: `Prepared ${ensured.created} new code(s); emailed ${result.sent}.${failNote}`,
    };
  } catch (error) {
    Sentry.setTag("integration", "ses");
    Sentry.setContext("operation", { name: "sendCouponsToUsers" });
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
}
