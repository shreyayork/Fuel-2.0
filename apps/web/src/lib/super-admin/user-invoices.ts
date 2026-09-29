import "server-only";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  accounts,
  billingInvoices,
  couponRecipients,
  type BillingInvoice,
} from "@/db/schema";
import { toBillingInvoiceDto } from "@/lib/credits/invoices-map";
import { reconcileAccountInvoices } from "@/lib/credits/invoices";

export type SuperAdminUserInvoiceRow = ReturnType<typeof toBillingInvoiceDto> & {
  accountId: string;
  totalCents: number;
  currency: string;
  couponApplied: boolean;
  couponCode: string | null;
  couponDiscountCents: number | null;
};

/** All billing invoices across accounts the user belongs to (super-admin). */
export async function listInvoicesForUserEmail(
  email: string,
): Promise<SuperAdminUserInvoiceRow[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  const db = await getDb();
  const memberships = await db
    .select({ accountId: accountMembers.accountId })
    .from(accountMembers)
    .where(sql`lower(${accountMembers.userEmail}) = ${normalized}`);

  if (memberships.length === 0) return [];

  const accountIds = memberships.map((m) => m.accountId);
  const invoices = await db
    .select()
    .from(billingInvoices)
    .where(inArray(billingInvoices.accountId, accountIds))
    .orderBy(desc(billingInvoices.invoiceDate));

  if (invoices.length === 0) return [];

  const stripeInvoiceIds = invoices
    .map((inv) => inv.stripeInvoiceId)
    .filter(Boolean);

  const redeemRows =
    stripeInvoiceIds.length > 0
      ? await db
          .select({
            stripeInvoiceId: couponRecipients.stripeInvoiceId,
            promotionCode: couponRecipients.promotionCode,
            amountDiscountCents: couponRecipients.amountDiscountCents,
          })
          .from(couponRecipients)
          .where(inArray(couponRecipients.stripeInvoiceId, stripeInvoiceIds))
      : [];

  const couponByInvoice = new Map<
    string,
    { code: string; discountCents: number | null }
  >();
  for (const row of redeemRows) {
    if (!row.stripeInvoiceId) continue;
    couponByInvoice.set(row.stripeInvoiceId, {
      code: row.promotionCode,
      discountCents: row.amountDiscountCents,
    });
  }

  return invoices.map((inv: BillingInvoice) => {
    const coupon = couponByInvoice.get(inv.stripeInvoiceId);
    const dto = toBillingInvoiceDto(inv);
    const pdfBase = dto.hasFuelPdf
      ? `/api/super-admin/invoices/${dto.invoiceId}/pdf`
      : null;
    return {
      ...dto,
      accountId: inv.accountId,
      totalCents: inv.total,
      currency: inv.currency,
      couponApplied: Boolean(coupon),
      couponCode: coupon?.code ?? null,
      couponDiscountCents: coupon?.discountCents ?? null,
      // Super-admin PDF routes (account-agnostic).
      fuelPdfViewPath: pdfBase ? `${pdfBase}?disposition=inline` : null,
      fuelPdfDownloadPath: pdfBase,
    };
  });
}

/**
 * Pull Stripe invoices into `billing_invoices` for every account this email
 * belongs to. DEV often has Cognito users but empty invoice tables until sync.
 */
export async function reconcileInvoicesForUserEmail(
  email: string,
): Promise<{ accounts: number; upserted: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { accounts: 0, upserted: 0 };

  const db = await getDb();
  const memberships = await db
    .select({
      accountId: accountMembers.accountId,
      stripeCustomerId: accounts.stripeCustomerId,
    })
    .from(accountMembers)
    .innerJoin(accounts, eq(accounts.id, accountMembers.accountId))
    .where(sql`lower(${accountMembers.userEmail}) = ${normalized}`);

  let upserted = 0;
  const seen = new Set<string>();
  for (const row of memberships) {
    if (seen.has(row.accountId)) continue;
    seen.add(row.accountId);
    upserted += await reconcileAccountInvoices(
      row.accountId,
      row.stripeCustomerId,
    );
  }

  return { accounts: seen.size, upserted };
}

export async function getBillingInvoiceByDisplayNumber(
  displayNumber: number,
): Promise<BillingInvoice | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.displayNumber, displayNumber))
    .limit(1);
  return row ?? null;
}
