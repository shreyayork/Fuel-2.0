import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { getDb } from "@/db/client";
import {
  couponCampaigns,
  couponRecipients,
  type CouponCampaign,
  type CouponRecipient,
} from "@/db/schema";
import { getActiveAccountForUser } from "@/lib/accounts";
import { sendEmail } from "@/lib/email";
import { renderCouponPromoEmail } from "@/lib/email/coupon-promo";
import {
  createPromotionCodesBatched,
  createStripeCoupon,
  createStripePromotionCode,
  generatePromotionCodeValue,
  setStripePromotionCodeActive,
  type CouponBenefitInput,
  type CouponDurationInput,
} from "./coupon-admin";
import {
  normalizeRecipientEmails,
  parseEmailList,
} from "./coupon-emails";
import { getProPlanDto } from "./queries";
import { isStripeConfigured } from "./stripe";
import {
  campaignModificationBlockReason,
} from "./coupon-campaign-status";

export { normalizeRecipientEmails, parseEmailList } from "./coupon-emails";
export {
  campaignBlocksModifications,
  campaignModificationBlockReason,
  isCampaignExpired,
} from "./coupon-campaign-status";

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export type CampaignStats = {
  issued: number;
  pendingSend: number;
  sent: number;
  failedSend: number;
  redeemed: number;
};

export type CampaignListRow = CouponCampaign & { stats: CampaignStats };

function campaignId(): string {
  return `cc_${randomUUID()}`;
}

function recipientId(): string {
  return `cr_${randomUUID()}`;
}

export async function listCouponCampaigns(): Promise<CampaignListRow[]> {
  const db = await getDb();
  const campaigns = await db
    .select()
    .from(couponCampaigns)
    .orderBy(desc(couponCampaigns.createdAt));

  if (campaigns.length === 0) return [];

  // BUG-04: expired redeem-by → archive so listing shows Archived (not active + Archive).
  for (const campaign of campaigns) {
    if (
      campaign.status !== "archived" &&
      campaignModificationBlockReason(campaign) === "expired"
    ) {
      await archiveCouponCampaign(campaign.id);
      campaign.status = "archived";
    }
  }

  const ids = campaigns.map((c) => c.id);
  const recipients = await db
    .select({
      campaignId: couponRecipients.campaignId,
      sendStatus: couponRecipients.sendStatus,
      redeemedAt: couponRecipients.redeemedAt,
    })
    .from(couponRecipients)
    .where(inArray(couponRecipients.campaignId, ids));

  const byCampaign = new Map<string, CampaignStats>();
  for (const id of ids) {
    byCampaign.set(id, {
      issued: 0,
      pendingSend: 0,
      sent: 0,
      failedSend: 0,
      redeemed: 0,
    });
  }
  for (const row of recipients) {
    const stats = byCampaign.get(row.campaignId);
    if (!stats) continue;
    stats.issued += 1;
    if (row.redeemedAt) stats.redeemed += 1;
    if (row.sendStatus === "pending") stats.pendingSend += 1;
    else if (row.sendStatus === "sent") stats.sent += 1;
    else if (row.sendStatus === "failed") stats.failedSend += 1;
  }

  return campaigns.map((c) => ({
    ...c,
    stats: byCampaign.get(c.id) ?? {
      issued: 0,
      pendingSend: 0,
      sent: 0,
      failedSend: 0,
      redeemed: 0,
    },
  }));
}

export async function getCouponCampaign(
  id: string,
): Promise<CouponCampaign | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(couponCampaigns)
    .where(eq(couponCampaigns.id, id))
    .limit(1);
  return row ?? null;
}

export async function listCampaignRecipients(
  campaignId: string,
): Promise<CouponRecipient[]> {
  const db = await getDb();
  return db
    .select()
    .from(couponRecipients)
    .where(eq(couponRecipients.campaignId, campaignId))
    .orderBy(asc(couponRecipients.email));
}

export async function getCampaignStats(
  campaignId: string,
): Promise<CampaignStats> {
  const db = await getDb();
  const rows = await db
    .select({
      sendStatus: couponRecipients.sendStatus,
      redeemedAt: couponRecipients.redeemedAt,
    })
    .from(couponRecipients)
    .where(eq(couponRecipients.campaignId, campaignId));

  const stats: CampaignStats = {
    issued: rows.length,
    pendingSend: 0,
    sent: 0,
    failedSend: 0,
    redeemed: 0,
  };
  for (const row of rows) {
    if (row.redeemedAt) stats.redeemed += 1;
    if (row.sendStatus === "pending") stats.pendingSend += 1;
    else if (row.sendStatus === "sent") stats.sent += 1;
    else if (row.sendStatus === "failed") stats.failedSend += 1;
  }
  return stats;
}

export type CreateCampaignInput = {
  name: string;
  description?: string | null;
  benefit: CouponBenefitInput;
  duration: CouponDurationInput;
  redeemBy?: Date | null;
  appliesToPriceIds?: string[];
  codePrefix?: string;
  audience?: "targeted" | "global";
  /** Global only; null/omit = unlimited. */
  maxRedemptions?: number | null;
  createdByEmail: string;
};

export async function createCouponCampaign(
  input: CreateCampaignInput,
): Promise<CouponCampaign> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");
  const name = input.name.trim();
  if (!name) throw new Error("name_required");

  const audience = input.audience === "global" ? "global" : "targeted";
  const prefix = (input.codePrefix ?? "FUEL1")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toUpperCase() || "FUEL1";

  const coupon = await createStripeCoupon({
    name,
    benefit: input.benefit,
    duration: input.duration,
    redeemBy: input.redeemBy
      ? Math.floor(input.redeemBy.getTime() / 1000)
      : null,
    appliesToPriceIds: input.appliesToPriceIds,
    metadata: {
      purpose: "fuel_coupon_campaign",
      createdBy: input.createdByEmail,
      audience,
    },
  });

  const id = campaignId();
  const expiresAt = input.redeemBy
    ? Math.floor(input.redeemBy.getTime() / 1000)
    : null;

  let globalPromotionCode: string | null = null;
  let globalStripePromotionCodeId: string | null = null;
  let maxRedemptions: number | null = null;

  if (audience === "global") {
    maxRedemptions =
      input.maxRedemptions != null && input.maxRedemptions > 0
        ? Math.floor(input.maxRedemptions)
        : null;
    const code = generatePromotionCodeValue(prefix);
    const promo = await createStripePromotionCode({
      couponId: coupon.id,
      code,
      expiresAt,
      maxRedemptions,
      metadata: {
        purpose: "fuel_global_promo",
        campaignId: id,
      },
    });
    globalPromotionCode = promo.code;
    globalStripePromotionCodeId = promo.id;
  }

  const db = await getDb();
  const [row] = await db
    .insert(couponCampaigns)
    .values({
      id,
      name,
      description: input.description?.trim() || null,
      stripeCouponId: coupon.id,
      benefitType: input.benefit.type,
      percentOff:
        input.benefit.type === "percent_off" ? input.benefit.percentOff : null,
      amountOffCents:
        input.benefit.type === "amount_off"
          ? input.benefit.amountOffCents
          : null,
      currency:
        input.benefit.type === "amount_off"
          ? (input.benefit.currency ?? "usd").toLowerCase()
          : "usd",
      duration: input.duration.duration,
      durationInMonths:
        input.duration.duration === "repeating"
          ? input.duration.durationInMonths
          : null,
      redeemBy: input.redeemBy ?? null,
      appliesToPriceIds: input.appliesToPriceIds ?? [],
      codePrefix: prefix,
      audience,
      globalPromotionCode,
      globalStripePromotionCodeId,
      maxRedemptions,
      createdByEmail: input.createdByEmail,
    })
    .returning();

  if (!row) throw new Error("campaign_insert_failed");
  return row;
}

async function setPromotionCodesActiveForCampaign(
  campaign: CouponCampaign,
  active: boolean,
): Promise<void> {
  if (!isStripeConfigured()) return;
  const ids = new Set<string>();
  if (campaign.globalStripePromotionCodeId) {
    ids.add(campaign.globalStripePromotionCodeId);
  }
  const db = await getDb();
  const rows = await db
    .select({ id: couponRecipients.stripePromotionCodeId })
    .from(couponRecipients)
    .where(eq(couponRecipients.campaignId, campaign.id));
  for (const row of rows) ids.add(row.id);

  for (const promoId of ids) {
    try {
      await setStripePromotionCodeActive(promoId, active);
    } catch (error) {
      Sentry.setTag("integration", "stripe");
      Sentry.setContext("operation", {
        name: "setStripePromotionCodeActive",
        promotionCodeId: promoId,
        active,
      });
      Sentry.captureException(error);
    }
  }
}

/** Activate or deactivate (Stripe promo `active` + DB status). Not archive. */
export async function setCouponCampaignActive(
  id: string,
  active: boolean,
): Promise<void> {
  const campaign = await getCouponCampaign(id);
  if (!campaign) throw new Error("campaign_not_found");
  await assertCampaignModifiable(campaign);

  const nextStatus = active ? "active" : "inactive";
  await setPromotionCodesActiveForCampaign(campaign, active);

  const db = await getDb();
  await db
    .update(couponCampaigns)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(couponCampaigns.id, id));
}

export async function archiveCouponCampaign(id: string): Promise<void> {
  const campaign = await getCouponCampaign(id);
  if (!campaign) throw new Error("campaign_not_found");
  if (campaign.status === "archived") return;

  await setPromotionCodesActiveForCampaign(campaign, false);

  const db = await getDb();
  await db
    .update(couponCampaigns)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(couponCampaigns.id, id));
}

/**
 * Shared gate for generate / email / activate.
 * Expired redeem-by → auto-archive then reject (no raw Stripe errors).
 */
async function assertCampaignModifiable(campaign: CouponCampaign): Promise<void> {
  const reason = campaignModificationBlockReason(campaign);
  if (reason === "archived") throw new Error("campaign_archived");
  if (reason === "expired") {
    await archiveCouponCampaign(campaign.id);
    throw new Error("campaign_expired_archived");
  }
}

/**
 * Idempotent: skips emails that already have a row for this campaign.
 * Creates Stripe Promotion Codes in batches for new emails only.
 * Targeted campaigns only.
 */
export async function generateCodesForEmails(
  campaignId: string,
  emailsRaw: string[],
): Promise<{
  created: number;
  createdRecipientIds: string[];
  skippedExisting: number;
  failed: Array<{ email: string; error: string }>;
}> {
  const campaign = await getCouponCampaign(campaignId);
  if (!campaign) throw new Error("campaign_not_found");
  if (campaign.audience === "global") throw new Error("campaign_is_global");
  await assertCampaignModifiable(campaign);
  if (campaign.status === "inactive") throw new Error("campaign_inactive");
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");

  const emails = normalizeRecipientEmails(emailsRaw);
  if (emails.length === 0) {
    return { created: 0, createdRecipientIds: [], skippedExisting: 0, failed: [] };
  }

  const db = await getDb();
  const existing = await db
    .select({ email: couponRecipients.email })
    .from(couponRecipients)
    .where(
      and(
        eq(couponRecipients.campaignId, campaignId),
        inArray(couponRecipients.email, emails),
      ),
    );
  const existingSet = new Set(existing.map((r) => r.email));
  const toCreate = emails.filter((e) => !existingSet.has(e));
  const skippedExisting = emails.length - toCreate.length;

  if (toCreate.length === 0) {
    return {
      created: 0,
      createdRecipientIds: [],
      skippedExisting,
      failed: [],
    };
  }

  const expiresAt = campaign.redeemBy
    ? Math.floor(campaign.redeemBy.getTime() / 1000)
    : null;

  const items = await Promise.all(
    toCreate.map(async (email) => {
      const account = await getActiveAccountForUser(email);
      return {
        couponId: campaign.stripeCouponId,
        code: generatePromotionCodeValue(campaign.codePrefix),
        email,
        expiresAt,
        customer: account?.stripeCustomerId ?? null,
        maxRedemptions: 1 as number | null,
      };
    }),
  );

  const results = await createPromotionCodesBatched(items);
  const failed: Array<{ email: string; error: string }> = [];
  const inserts: Array<typeof couponRecipients.$inferInsert> = [];
  const now = new Date();

  for (const result of results) {
    if (!result.ok) {
      failed.push({ email: result.email, error: result.error });
      continue;
    }
    inserts.push({
      id: recipientId(),
      campaignId,
      email: result.email,
      promotionCode: result.code,
      stripePromotionCodeId: result.promotionCodeId,
      sendStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (inserts.length > 0) {
    await db.insert(couponRecipients).values(inserts);
  }

  return {
    created: inserts.length,
    createdRecipientIds: inserts.map((row) => row.id!),
    skippedExisting,
    failed,
  };
}

/**
 * Ensure recipient rows exist for emails against a campaign, then return ids to email.
 * Targeted: mint unique codes. Global: reuse shared promo (send-tracking rows only).
 */
export async function ensureRecipientsForEmails(
  campaignId: string,
  emailsRaw: string[],
): Promise<{
  recipientIds: string[];
  created: number;
  skippedExisting: number;
  failed: Array<{ email: string; error: string }>;
}> {
  const campaign = await getCouponCampaign(campaignId);
  if (!campaign) throw new Error("campaign_not_found");
  await assertCampaignModifiable(campaign);
  if (campaign.status === "inactive") throw new Error("campaign_inactive");

  const emails = normalizeRecipientEmails(emailsRaw);
  if (emails.length === 0) {
    return { recipientIds: [], created: 0, skippedExisting: 0, failed: [] };
  }

  if (campaign.audience === "targeted") {
    const gen = await generateCodesForEmails(campaignId, emails);
    const db = await getDb();
    const rows = await db
      .select({ id: couponRecipients.id })
      .from(couponRecipients)
      .where(
        and(
          eq(couponRecipients.campaignId, campaignId),
          inArray(couponRecipients.email, emails),
        ),
      );
    return {
      recipientIds: rows.map((r) => r.id),
      created: gen.created,
      skippedExisting: gen.skippedExisting,
      failed: gen.failed,
    };
  }

  // Global: one shared code — create send-tracking rows pointing at it.
  if (!campaign.globalPromotionCode || !campaign.globalStripePromotionCodeId) {
    throw new Error("global_promo_missing");
  }

  const db = await getDb();
  const existing = await db
    .select({ id: couponRecipients.id, email: couponRecipients.email })
    .from(couponRecipients)
    .where(
      and(
        eq(couponRecipients.campaignId, campaignId),
        inArray(couponRecipients.email, emails),
      ),
    );
  const existingByEmail = new Map(existing.map((r) => [r.email, r.id]));
  const toCreate = emails.filter((e) => !existingByEmail.has(e));
  const now = new Date();
  const inserts: Array<typeof couponRecipients.$inferInsert> = [];
  for (const email of toCreate) {
    inserts.push({
      id: recipientId(),
      campaignId,
      email,
      promotionCode: campaign.globalPromotionCode,
      stripePromotionCodeId: campaign.globalStripePromotionCodeId,
      sendStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
  }
  if (inserts.length > 0) {
    await db.insert(couponRecipients).values(inserts);
  }

  const allIds = [
    ...existing.map((r) => r.id),
    ...inserts.map((r) => r.id!),
  ];
  return {
    recipientIds: allIds,
    created: inserts.length,
    skippedExisting: emails.length - toCreate.length,
    failed: [],
  };
}

function benefitLabel(campaign: CouponCampaign): string {
  if (campaign.benefitType === "percent_off" && campaign.percentOff != null) {
    return `${campaign.percentOff}% off`;
  }
  if (
    campaign.benefitType === "amount_off" &&
    campaign.amountOffCents != null
  ) {
    const dollars = (campaign.amountOffCents / 100).toFixed(2);
    return `$${dollars} off`;
  }
  return "a discount";
}

function expiryLabel(campaign: CouponCampaign): string {
  if (!campaign.redeemBy) return "No expiration date";
  return campaign.redeemBy.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function sendCouponEmails(opts: {
  campaignId: string;
  recipientIds?: string[];
  /**
   * When true (default): only pending/failed rows.
   * When false with recipientIds: force resend those rows (per-row Resend).
   */
  onlyUnsent?: boolean;
}): Promise<{ sent: number; failed: Array<{ email: string; error: string }> }> {
  const campaign = await getCouponCampaign(opts.campaignId);
  if (!campaign) throw new Error("campaign_not_found");
  await assertCampaignModifiable(campaign);

  const db = await getDb();
  const conditions = [eq(couponRecipients.campaignId, opts.campaignId)];

  // Explicit empty id list = send nobody (do not fall through to campaign-wide).
  if (opts.recipientIds !== undefined) {
    if (opts.recipientIds.length === 0) {
      return { sent: 0, failed: [] };
    }
    conditions.push(inArray(couponRecipients.id, opts.recipientIds));
  }

  // Campaign-wide bulk and scoped batch (checkbox): only unsent/failed.
  // Per-row Resend passes onlyUnsent: false to allow already-sent rows.
  if (opts.onlyUnsent !== false) {
    conditions.push(
      inArray(couponRecipients.sendStatus, ["pending", "failed"]),
    );
  }

  const rows = await db
    .select()
    .from(couponRecipients)
    .where(and(...conditions));

  const failed: Array<{ email: string; error: string }> = [];
  let sent = 0;
  const benefit = benefitLabel(campaign);
  const upgradeUrl = `${APP_URL}/account/billing`;
  const expiryRaw = expiryLabel(campaign);
  const expiresAtLabel =
    expiryRaw === "No expiration date" ? null : expiryRaw;

  let annualPriceUsd: number | null = null;
  try {
    const plan = await getProPlanDto("founder");
    if (plan.annualPrice > 0) annualPriceUsd = plan.annualPrice;
  } catch {
    // Catalog optional for email copy; template falls back without prices.
  }

  for (const row of rows) {
    try {
      const rendered = renderCouponPromoEmail({
        email: row.email,
        promotionCode: row.promotionCode,
        benefitLabel: benefit,
        benefitType: campaign.benefitType,
        percentOff: campaign.percentOff,
        amountOffCents: campaign.amountOffCents,
        expiresAtLabel,
        ctaHref: upgradeUrl,
        annualPriceUsd,
      });
      await sendEmail({
        to: row.email,
        subject:
          campaign.benefitType === "percent_off" && campaign.percentOff != null
            ? `Fuel 2.0 is live — claim your ${campaign.percentOff}% loyalty offer`
            : `Fuel 2.0 is live — claim your coupon ${row.promotionCode}`,
        html: rendered.html,
        text: rendered.text,
      });
      await db
        .update(couponRecipients)
        .set({
          sendStatus: "sent",
          sendError: null,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(couponRecipients.id, row.id));
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "send_failed";
      Sentry.setTag("integration", "ses");
      Sentry.setContext("coupon_email", {
        campaignId: opts.campaignId,
        recipientId: row.id,
      });
      Sentry.captureException(err);
      await db
        .update(couponRecipients)
        .set({
          sendStatus: "failed",
          sendError: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(couponRecipients.id, row.id));
      failed.push({ email: row.email, error: message });
    }
  }

  return { sent, failed };
}

/** Mark recipient redeemed from Checkout Session discount (idempotent). */
export async function markPromotionCodeRedeemed(opts: {
  stripePromotionCodeId: string | null;
  promotionCode?: string | null;
  accountId: string;
  checkoutSessionId: string;
  amountDiscountCents: number;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  redeemerEmail?: string | null;
}): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const patch = {
    redeemedAt: now,
    redeemedAccountId: opts.accountId,
    redeemedCheckoutSessionId: opts.checkoutSessionId,
    amountDiscountCents: opts.amountDiscountCents,
    stripeInvoiceId: opts.stripeInvoiceId ?? null,
    stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
    updatedAt: now,
  };

  if (opts.stripePromotionCodeId) {
    // Prefer matching email when multiple rows share a global promo id.
    if (opts.redeemerEmail) {
      const email = opts.redeemerEmail.trim().toLowerCase();
      const updated = await db
        .update(couponRecipients)
        .set(patch)
        .where(
          and(
            eq(
              couponRecipients.stripePromotionCodeId,
              opts.stripePromotionCodeId,
            ),
            eq(couponRecipients.email, email),
            isNull(couponRecipients.redeemedAt),
          ),
        )
        .returning({ id: couponRecipients.id });
      if (updated.length > 0) return true;
    }

    const updated = await db
      .update(couponRecipients)
      .set(patch)
      .where(
        and(
          eq(
            couponRecipients.stripePromotionCodeId,
            opts.stripePromotionCodeId,
          ),
          isNull(couponRecipients.redeemedAt),
        ),
      )
      .returning({ id: couponRecipients.id });
    if (updated.length > 0) return true;

    // Global promo with no send-tracking row yet — insert redemption audit row.
    const [campaign] = await db
      .select()
      .from(couponCampaigns)
      .where(
        eq(
          couponCampaigns.globalStripePromotionCodeId,
          opts.stripePromotionCodeId,
        ),
      )
      .limit(1);
    if (campaign && opts.redeemerEmail) {
      const email = opts.redeemerEmail.trim().toLowerCase();
      try {
        await db.insert(couponRecipients).values({
          id: recipientId(),
          campaignId: campaign.id,
          email,
          promotionCode:
            opts.promotionCode ?? campaign.globalPromotionCode ?? "GLOBAL",
          stripePromotionCodeId: opts.stripePromotionCodeId,
          sendStatus: "sent",
          redeemedAt: now,
          redeemedAccountId: opts.accountId,
          redeemedCheckoutSessionId: opts.checkoutSessionId,
          amountDiscountCents: opts.amountDiscountCents,
          stripeInvoiceId: opts.stripeInvoiceId ?? null,
          stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
          createdAt: now,
          updatedAt: now,
        });
        return true;
      } catch {
        // Unique (campaign, email) race — fall through to code match.
      }
    }
  }

  if (opts.promotionCode) {
    const updated = await db
      .update(couponRecipients)
      .set(patch)
      .where(
        and(
          eq(couponRecipients.promotionCode, opts.promotionCode),
          isNull(couponRecipients.redeemedAt),
        ),
      )
      .returning({ id: couponRecipients.id });
    return updated.length > 0;
  }

  return false;
}

/** Count redeemed for health checks / tests. */
export async function countRedeemedForCampaign(
  campaignId: string,
): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(couponRecipients)
    .where(
      and(
        eq(couponRecipients.campaignId, campaignId),
        isNotNull(couponRecipients.redeemedAt),
      ),
    );
  return Number(row?.n ?? 0);
}
