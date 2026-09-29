import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { seedSignalCatalog } from "@/db/seed-signals";
import {
  portfolioUpdates,
  signalObservations,
  signals,
  type PortfolioUpdate,
} from "@/db/schema";

export type PortfolioUpdateInput = Omit<
  PortfolioUpdate,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "submittedAt"
  | "status"
  | "signals"
  | "sourceObservationIds"
> & {
  status?: "draft" | "submitted";
  signals?: Record<string, number | string | boolean | null> | null;
  sourceObservationIds?: string[] | null;
};

/** Default reporting period = current calendar quarter, e.g. "2026-q2". */
export function currentPeriod(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${year}-q${q}`;
}

export async function listForCompany(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
}): Promise<PortfolioUpdate[]> {
  const db = await getDb();
  return db
    .select()
    .from(portfolioUpdates)
    .where(
      and(
        eq(portfolioUpdates.accountId, opts.accountId),
        eq(portfolioUpdates.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(desc(portfolioUpdates.period))
    .limit(opts.limit ?? 20);
}

export async function getForPeriod(opts: {
  accountId: string;
  companyUuid: string;
  period: string;
}): Promise<PortfolioUpdate | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(portfolioUpdates)
    .where(
      and(
        eq(portfolioUpdates.accountId, opts.accountId),
        eq(portfolioUpdates.companyUuid, opts.companyUuid),
        eq(portfolioUpdates.period, opts.period),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getLatestForCompany(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<PortfolioUpdate | null> {
  const [row] = await listForCompany({ ...opts, limit: 1 });
  return row ?? null;
}

/**
 * Latest update that has actually been submitted by a human — i.e. the
 * load-bearing "we have user-verified numbers on file for this company"
 * signal. Drafts (whether human or agent-saved) are ignored. The founder
 * dashboard uses this to decide between "AI ESTIMATE" and "USER VERIFIED"
 * states on the benchmark banner.
 */
export async function getLatestSubmittedForCompany(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<PortfolioUpdate | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(portfolioUpdates)
    .where(
      and(
        eq(portfolioUpdates.accountId, opts.accountId),
        eq(portfolioUpdates.companyUuid, opts.companyUuid),
        eq(portfolioUpdates.status, "submitted"),
      ),
    )
    .orderBy(desc(portfolioUpdates.submittedAt))
    .limit(1);
  return row ?? null;
}

/**
 * One latest row per companyUuid for the given account, keyed for easy
 * joining to a portfolio/watchlist's company list.
 */
export async function listLatestByCompanies(opts: {
  accountId: string;
  companyUuids: string[];
}): Promise<Map<string, PortfolioUpdate>> {
  if (opts.companyUuids.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select()
    .from(portfolioUpdates)
    .where(
      and(
        eq(portfolioUpdates.accountId, opts.accountId),
        inArray(portfolioUpdates.companyUuid, opts.companyUuids),
      ),
    )
    .orderBy(desc(portfolioUpdates.period));
  // Rows come back newest-period-first; keep the first seen for each company.
  const map = new Map<string, PortfolioUpdate>();
  for (const row of rows) {
    if (!map.has(row.companyUuid)) map.set(row.companyUuid, row);
  }
  return map;
}

/**
 * Upsert a quarterly update — one row per (account, company, period).
 * When `status` is "submitted" we stamp `submittedAt` on the first transition;
 * drafts leave it null so the UI can distinguish in-progress vs finalized.
 *
 * Every successful save fans out into signal_observations so the portfolio
 * distribution grid and the email-extraction feed share the same data
 * plane. See fanOutUpdateToObservations for the field → signal mapping.
 */
export async function upsertUpdate(
  input: PortfolioUpdateInput,
): Promise<PortfolioUpdate> {
  const db = await getDb();
  const now = new Date();
  const existing = await getForPeriod({
    accountId: input.accountId,
    companyUuid: input.companyUuid,
    period: input.period,
  });
  const status = input.status ?? "draft";
  let row: PortfolioUpdate;
  if (existing) {
    [row] = await db
      .update(portfolioUpdates)
      .set({
        ...input,
        status,
        submittedAt:
          status === "submitted"
            ? (existing.submittedAt ?? now)
            : null,
        updatedAt: now,
      })
      .where(eq(portfolioUpdates.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(portfolioUpdates)
      .values({
        ...input,
        id: `pu_${randomUUID()}`,
        status,
        submittedAt: status === "submitted" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  }
  await fanOutUpdateToObservations(row);
  return row;
}

// ---------------------------------------------------------------------------
// Field → signal mapping — the heart of the unification. Each row says
// "column X on portfolio_updates corresponds to signal Y in the catalog
// with this value shape." Quantitative rows populate valueNumeric;
// qualitative strings populate valueText; the one boolean populates
// valueBool. Null/empty values don't produce an observation.
// ---------------------------------------------------------------------------
interface FieldSpec {
  column: keyof PortfolioUpdate;
  signalId: string;
  kind: "numeric" | "text" | "boolean";
}

const PORTFOLIO_UPDATE_FIELD_MAP: FieldSpec[] = [
  // Scale / growth / retention / efficiency / capital — match the catalog's
  // _pct / _usd / _months suffixes exactly.
  { column: "arrUsd", signalId: "arr_usd", kind: "numeric" },
  { column: "fteCount", signalId: "fte_count", kind: "numeric" },
  { column: "paidCustomerCount", signalId: "paid_customer_count", kind: "numeric" },
  { column: "arrGrowthYoyPct", signalId: "arr_growth_yoy_pct", kind: "numeric" },
  { column: "nrrPct", signalId: "nrr_pct", kind: "numeric" },
  { column: "logoRetentionPct", signalId: "logo_retention_pct", kind: "numeric" },
  { column: "grossMarginPct", signalId: "gross_margin_pct", kind: "numeric" },
  { column: "cacPaybackMonths", signalId: "cac_payback_months", kind: "numeric" },
  { column: "burnMultiple", signalId: "burn_multiple", kind: "numeric" },
  { column: "ruleOf40Pct", signalId: "rule_of_40_pct", kind: "numeric" },
  { column: "cashOnHandUsd", signalId: "cash_on_hand_usd", kind: "numeric" },
  { column: "monthlyBurnUsd", signalId: "monthly_burn_usd", kind: "numeric" },

  // Qualitative narrative captured in the survey.
  { column: "notableCustomers", signalId: "notable_customers", kind: "text" },
  { column: "notableHires", signalId: "notable_hires", kind: "text" },
  { column: "otherUpdates", signalId: "other_updates", kind: "text" },
  { column: "challenges", signalId: "quarter_challenges", kind: "text" },

  // Vendor stack.
  { column: "bankingPartner", signalId: "banking_partner", kind: "text" },
  { column: "legalCounsel", signalId: "legal_counsel", kind: "text" },
  { column: "cloudProvider", signalId: "cloud_provider", kind: "text" },
  { column: "capTablePlatform", signalId: "cap_table_platform", kind: "text" },
  { column: "doInsuranceProvider", signalId: "do_insurance_provider", kind: "text" },
  { column: "crmPlatform", signalId: "crm_platform", kind: "text" },

  // Opt-in flag.
  { column: "openToInvestorIntros", signalId: "open_to_investor_intros", kind: "boolean" },
];

/** Signal ids referenced by portfolio-update fan-out — must exist in `signals`. */
const PORTFOLIO_FANOUT_SIGNAL_IDS = [
  ...new Set(PORTFOLIO_UPDATE_FIELD_MAP.map((s) => s.signalId)),
];

/**
 * Migrations seed only a subset of catalog signals inline; the full catalog
 * lands via seedSignalCatalog (Lambda post-migrate, or `db:seed:libs` locally).
 * Before fan-out, ensure every mapped signal row exists so FK inserts don't fail.
 */
async function ensurePortfolioUpdateSignals(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<void> {
  const existing = await db
    .select({ id: signals.id })
    .from(signals)
    .where(inArray(signals.id, PORTFOLIO_FANOUT_SIGNAL_IDS));
  if (existing.length >= PORTFOLIO_FANOUT_SIGNAL_IDS.length) return;
  await seedSignalCatalog(db);
}

/**
 * Mirror a portfolio_update row into signal_observations. Supersedes the
 * previous period's fan-out (same source tag + same period) so edits
 * don't stack; keeps extractions from emails / notes intact because they
 * carry different source tags.
 *
 * Every row we emit is marked confidence=1.0 and source=
 * "portfolio_update:<id>" — downstream dedupes preferring manual/survey
 * over model-extracted data treat this as authoritative for the period.
 */
export async function fanOutUpdateToObservations(
  update: PortfolioUpdate,
): Promise<void> {
  const db = await getDb();
  await ensurePortfolioUpdateSignals(db);
  // Supersede any observations the *same submission* produced previously.
  // We scope on source prefix + period so re-submitting the quarter kills
  // the prior fan-out without touching email-extracted rows on the same
  // (company, signal, period).
  const sourceTag = `portfolio_update:${update.id}`;
  await db
    .update(signalObservations)
    .set({ supersededAt: sql`now()` })
    .where(
      and(
        eq(signalObservations.accountId, update.accountId),
        eq(signalObservations.companyUuid, update.companyUuid),
        eq(signalObservations.period, update.period),
        eq(signalObservations.source, sourceTag),
        isNull(signalObservations.supersededAt),
      ),
    );

  const rows: Array<typeof signalObservations.$inferInsert> = [];
  for (const spec of PORTFOLIO_UPDATE_FIELD_MAP) {
    const raw = update[spec.column];
    if (raw == null || raw === "") continue;
    const obs: typeof signalObservations.$inferInsert = {
      id: `obs_${randomUUID()}`,
      accountId: update.accountId,
      companyUuid: update.companyUuid,
      signalId: spec.signalId,
      period: update.period,
      valueNumeric: null,
      valueText: null,
      valueBool: null,
      confidence: 1.0,
      source: sourceTag,
      contextItemId: null,
      agentRunId: null,
      authorEmail: update.submittedByEmail,
    };
    if (spec.kind === "numeric" && typeof raw === "number") {
      obs.valueNumeric = raw;
    } else if (spec.kind === "text" && typeof raw === "string") {
      obs.valueText = raw;
    } else if (spec.kind === "boolean" && typeof raw === "boolean") {
      obs.valueBool = raw;
    } else {
      continue;
    }
    rows.push(obs);
  }
  if (rows.length > 0) {
    await db.insert(signalObservations).values(rows);
  }
}
