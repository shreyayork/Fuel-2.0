import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  accounts,
  advisors,
  benchmarkCohorts,
  couponCampaigns,
  couponRecipients,
  faqEntries,
  playbooks,
  serviceProviders,
  signals,
  workspaceCreditLedger,
  yorkChipHeadlines,
} from "@/db/schema";

export type SuperAdminOverviewStats = {
  accounts: number;
  members: number;
  proWorkspaces: number;
  freeWorkspaces: number;
  cancelingPro: number;
  accountsLast7d: number;
  activeCampaigns: number;
  couponRedeemed: number;
  couponPendingSend: number;
  globalSignals: number;
  cohortRows: number;
  livePlaybooks: number;
  serviceProviders: number;
  advisors: number;
  advisorsActive: number;
  chipOverrides: number;
  faqPublished: number;
  faqDrafts: number;
};

const EMPTY: SuperAdminOverviewStats = {
  accounts: 0,
  members: 0,
  proWorkspaces: 0,
  freeWorkspaces: 0,
  cancelingPro: 0,
  accountsLast7d: 0,
  activeCampaigns: 0,
  couponRedeemed: 0,
  couponPendingSend: 0,
  globalSignals: 0,
  cohortRows: 0,
  livePlaybooks: 0,
  serviceProviders: 0,
  advisors: 0,
  advisorsActive: 0,
  chipOverrides: 0,
  faqPublished: 0,
  faqDrafts: 0,
};

function n(rows: Array<{ c: number }>): number {
  return Number(rows[0]?.c ?? 0);
}

/**
 * Platform-wide aggregates for Super Admin Overview analytics.
 * Postgres only — never Cognito ListUsers (rate-limit / scan caps).
 */
export async function loadSuperAdminOverviewStats(): Promise<SuperAdminOverviewStats> {
  try {
    const db = await getDb();

    const [
      accountsRows,
      membersRows,
      proRows,
      freeRows,
      cancelingRows,
      recentAccounts,
      activeCampaigns,
      redeemed,
      pendingSend,
      signalRows,
      cohortRows,
      playbookRows,
      providerRows,
      advisorRows,
      advisorActiveRows,
      chipRows,
      faqPub,
      faqDraft,
    ] = await Promise.all([
      db.select({ c: count() }).from(accounts),
      db.select({ c: count() }).from(accountMembers),
      db
        .select({ c: count() })
        .from(workspaceCreditLedger)
        .where(eq(workspaceCreditLedger.planSlug, "pro")),
      db
        .select({ c: count() })
        .from(workspaceCreditLedger)
        .where(eq(workspaceCreditLedger.planSlug, "free")),
      db
        .select({ c: count() })
        .from(workspaceCreditLedger)
        .where(
          and(
            eq(workspaceCreditLedger.planSlug, "pro"),
            eq(workspaceCreditLedger.cancelAtPeriodEnd, true),
          ),
        ),
      db
        .select({ c: count() })
        .from(accounts)
        .where(sql`${accounts.createdAt} >= now() - interval '7 days'`),
      db
        .select({ c: count() })
        .from(couponCampaigns)
        .where(eq(couponCampaigns.status, "active")),
      db
        .select({ c: count() })
        .from(couponRecipients)
        .where(isNotNull(couponRecipients.redeemedAt)),
      db
        .select({ c: count() })
        .from(couponRecipients)
        .where(eq(couponRecipients.sendStatus, "pending")),
      db
        .select({ c: count() })
        .from(signals)
        .where(eq(signals.scope, "global")),
      db.select({ c: count() }).from(benchmarkCohorts),
      db
        .select({ c: count() })
        .from(playbooks)
        .where(and(isNull(playbooks.accountId), isNull(playbooks.deletedAt))),
      db.select({ c: count() }).from(serviceProviders),
      db.select({ c: count() }).from(advisors).where(isNull(advisors.accountId)),
      db
        .select({ c: count() })
        .from(advisors)
        .where(and(isNull(advisors.accountId), eq(advisors.status, "active"))),
      db.select({ c: count() }).from(yorkChipHeadlines),
      db
        .select({ c: count() })
        .from(faqEntries)
        .where(eq(faqEntries.published, true)),
      db
        .select({ c: count() })
        .from(faqEntries)
        .where(eq(faqEntries.published, false)),
    ]);

    return {
      accounts: n(accountsRows),
      members: n(membersRows),
      proWorkspaces: n(proRows),
      freeWorkspaces: n(freeRows),
      cancelingPro: n(cancelingRows),
      accountsLast7d: n(recentAccounts),
      activeCampaigns: n(activeCampaigns),
      couponRedeemed: n(redeemed),
      couponPendingSend: n(pendingSend),
      globalSignals: n(signalRows),
      cohortRows: n(cohortRows),
      livePlaybooks: n(playbookRows),
      serviceProviders: n(providerRows),
      advisors: n(advisorRows),
      advisorsActive: n(advisorActiveRows),
      chipOverrides: n(chipRows),
      faqPublished: n(faqPub),
      faqDrafts: n(faqDraft),
    };
  } catch (error) {
    Sentry.setTag("integration", "postgres");
    Sentry.setContext("operation", { name: "loadSuperAdminOverviewStats" });
    Sentry.captureException(error);
    return EMPTY;
  }
}
