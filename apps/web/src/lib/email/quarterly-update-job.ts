import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  accounts,
  catalogCompanies,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { firstNameFrom } from "@/lib/email/light-layout";
import {
  isQuarterStartInNewYork,
  newYorkYmd,
  quarterLabelsForDate,
  renderQuarterlyUpdateEmail,
} from "@/lib/email/quarterly-update";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  getUserPreference,
  setUserPreference,
} from "@/lib/user-preferences";

const PREF_PREFIX = "email_quarterly_update";

export interface QuarterlyJobResult {
  considered: number;
  sent: number;
  skipped: number;
  errors: number;
  periodKey: string;
}

export { isQuarterStartInNewYork, newYorkYmd };

/**
 * Quarterly founder update — first day of each calendar quarter.
 *
 * Schedule: EventBridge `cron(0 20 1 1,4,7,10 ? *)` = 20:00 UTC on
 * 1 Jan / 1 Apr / 1 Jul / 1 Oct. Handler also no-ops unless NY-local date
 * is a quarter start (guards DST / retry skew). Idempotent per
 * (owner, account, completed-quarter period key).
 */
export async function runQuarterlyUpdateJob(now = new Date()): Promise<QuarterlyJobResult> {
  const { year, month } = newYorkYmd(now);
  const wall = new Date(Date.UTC(year, month - 1, 1));
  const labels = quarterLabelsForDate(wall);

  const result: QuarterlyJobResult = {
    considered: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    periodKey: labels.periodKey,
  };

  if (!isQuarterStartInNewYork(now)) {
    return result;
  }

  const db = await getDb();
  const rows = await db
    .select({
      accountId: accounts.id,
      companyUuid: accounts.primaryCompanyUuid,
      ownerEmail: accountMembers.userEmail,
      sources: catalogCompanies.sources,
    })
    .from(accounts)
    .innerJoin(
      accountMembers,
      and(
        eq(accountMembers.accountId, accounts.id),
        eq(accountMembers.role, "owner"),
      ),
    )
    .innerJoin(
      catalogCompanies,
      eq(catalogCompanies.id, accounts.primaryCompanyUuid),
    )
    .where(sql`${accounts.primaryCompanyUuid} is not null`);

  for (const row of rows) {
    if (!row.companyUuid) continue;
    result.considered += 1;

    const onboarding = (row.sources as { onboarding?: { flowType?: string } } | null)
      ?.onboarding;
    const flowType = onboarding?.flowType ?? "operating";
    if (flowType !== "operating") {
      result.skipped += 1;
      continue;
    }

    const prefKey = `${PREF_PREFIX}:${row.accountId}:${labels.periodKey}`;
    try {
      const already = await getUserPreference({
        userEmail: row.ownerEmail,
        key: prefKey,
      });
      if (already) {
        result.skipped += 1;
        continue;
      }

      const firstName = firstNameFrom({ email: row.ownerEmail });
      const rendered = renderQuarterlyUpdateEmail({
        firstName,
        companyUuid: row.companyUuid,
        completedQuarterLabel: labels.completedQuarterLabel,
        nextQuarterLabel: labels.nextQuarterLabel,
      });

      await sendEmail({
        to: row.ownerEmail,
        subject: `${labels.completedQuarterLabel} is done — update your Fuel profile`,
        html: rendered.html,
        text: rendered.text,
      });
      await setUserPreference({
        userEmail: row.ownerEmail,
        key: prefKey,
        value: now.toISOString(),
      });
      result.sent += 1;
    } catch (error) {
      result.errors += 1;
      captureIntegrationException(error, {
        integration: "ses",
        operation: "quarterly_update_email",
        context: { accountId: row.accountId, periodKey: labels.periodKey },
      });
    }
  }

  return result;
}
