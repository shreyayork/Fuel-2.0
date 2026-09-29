import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  signalObservations,
  signals,
  type Signal,
  type SignalObservation,
} from "@/db/schema";

/**
 * For the portfolio distribution grid: latest non-superseded numeric
 * observation per (company, signal), scoped to the account. One SELECT
 * with DISTINCT ON across a bounded cross-section (companies × selected
 * signals) so the page stays O(rows) instead of fanning out queries.
 *
 * Returns a two-level map keyed by signalId → companyUuid for O(1) lookup
 * when the grid renders one DistributionStrip per selected signal.
 */
export async function listLatestQuantitativeObservationsForCompanies(opts: {
  accountId: string;
  companyUuids: string[];
  signalIds: string[];
}): Promise<
  Map<
    string,
    Map<
      string,
      { valueNumeric: number; period: string; observedAt: Date }
    >
  >
> {
  const out = new Map<
    string,
    Map<string, { valueNumeric: number; period: string; observedAt: Date }>
  >();
  if (opts.companyUuids.length === 0 || opts.signalIds.length === 0) return out;
  const db = await getDb();
  // Drizzle's sql template expands a JS array into comma-separated
  // positional params rather than a pg array literal, so `= ANY($1)` with a
  // raw array fails with "op ANY/ALL (array) requires array on right side".
  // sql.join emits "$1, $2, $3 …" which IN (…) accepts natively.
  const companyList = sql.join(opts.companyUuids.map((u) => sql`${u}`), sql`, `);
  const signalList = sql.join(opts.signalIds.map((s) => sql`${s}`), sql`, `);
  const rows = await db.execute<{
    signal_id: string;
    company_uuid: string;
    value_numeric: string | number;
    period: string;
    created_at: Date;
  }>(sql`
    SELECT DISTINCT ON (signal_id, company_uuid)
      signal_id, company_uuid, value_numeric, period, created_at
    FROM signal_observations
    WHERE account_id = ${opts.accountId}
      AND company_uuid IN (${companyList})
      AND signal_id IN (${signalList})
      AND superseded_at IS NULL
      AND value_numeric IS NOT NULL
    ORDER BY signal_id, company_uuid, created_at DESC
  `);
  for (const r of rows.rows) {
    const bySignal = out.get(r.signal_id) ?? new Map();
    bySignal.set(r.company_uuid, {
      valueNumeric: typeof r.value_numeric === "string" ? Number(r.value_numeric) : r.value_numeric,
      period: r.period,
      observedAt: r.created_at,
    });
    out.set(r.signal_id, bySignal);
  }
  return out;
}

/**
 * Soft-delete a single observation by stamping supersededAt. The row stays in
 * place so the provenance drawer can still show "deleted by user at …", but
 * every live query (timeline, footnotes, benchmark aggregation) filters on
 * supersededAt IS NULL and will stop surfacing it. Scoped to accountId to
 * prevent cross-account deletion.
 */
export async function supersedeObservation(opts: {
  accountId: string;
  id: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(signalObservations)
    .set({ supersededAt: sql`now()` })
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        eq(signalObservations.id, opts.id),
      ),
    );
}

/**
 * Insert a manually-entered observation. Source is stamped "manual:<email>"
 * so downstream consumers (timeline dedupe, initiative current-value lookup)
 * can prefer operator entries over model extractions. When `supersedeFor` is
 * supplied — the id of an existing observation the operator is correcting —
 * we stamp its supersededAt so the bad row disappears from the timeline but
 * stays on record for audit.
 */
export async function createManualObservation(opts: {
  accountId: string;
  companyUuid: string;
  signalId: string;
  period: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueBool?: boolean | null;
  rawSnippet?: string | null;
  authorEmail: string;
  /** If correcting a bad extraction, the id of the row to supersede. */
  supersedeFor?: string | null;
}): Promise<SignalObservation> {
  const db = await getDb();
  const id = `obs_${randomUUID()}`;
  const [row] = await db
    .insert(signalObservations)
    .values({
      id,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      signalId: opts.signalId,
      period: opts.period,
      valueNumeric: opts.valueNumeric ?? null,
      valueText: opts.valueText ?? null,
      valueBool: opts.valueBool ?? null,
      // Manual entries are authoritative by definition — 1.0 confidence so
      // any downstream "low-confidence" filters treat them as gold.
      confidence: 1.0,
      rawSnippet: opts.rawSnippet ?? null,
      source: `manual:${opts.authorEmail}`,
      contextItemId: null,
      authorEmail: opts.authorEmail,
    })
    .returning();
  if (opts.supersedeFor) {
    await supersedeObservation({ accountId: opts.accountId, id: opts.supersedeFor });
  }
  return row;
}

export type ObservationWithSignal = SignalObservation & {
  signal: Pick<Signal, "id" | "label" | "kind" | "unit" | "category" | "invertedGood">;
};

/**
 * Map a set of context_item IDs to the observations they produced. Joined
 * with signals so the footnote UI can render a label + unit without another
 * round trip. Only current (non-superseded) rows are returned.
 */
export async function listObservationsForContextItems(opts: {
  accountId: string;
  contextItemIds: string[];
}): Promise<Map<string, ObservationWithSignal[]>> {
  const out = new Map<string, ObservationWithSignal[]>();
  if (opts.contextItemIds.length === 0) return out;
  const db = await getDb();
  const rows = await db
    .select({
      obs: signalObservations,
      signal: {
        id: signals.id,
        label: signals.label,
        kind: signals.kind,
        unit: signals.unit,
        category: signals.category,
        invertedGood: signals.invertedGood,
      },
    })
    .from(signalObservations)
    .leftJoin(signals, eq(signals.id, signalObservations.signalId))
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        inArray(signalObservations.contextItemId, opts.contextItemIds),
        isNull(signalObservations.supersededAt),
      ),
    );
  for (const r of rows) {
    if (!r.signal) continue;
    const key = r.obs.contextItemId!;
    const arr = out.get(key) ?? [];
    arr.push({ ...r.obs, signal: r.signal });
    out.set(key, arr);
  }
  return out;
}

export async function listObservationsForCompany(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
}): Promise<SignalObservation[]> {
  const db = await getDb();
  return db
    .select()
    .from(signalObservations)
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        eq(signalObservations.companyUuid, opts.companyUuid),
        isNull(signalObservations.supersededAt),
      ),
    )
    .orderBy(desc(signalObservations.createdAt))
    .limit(opts.limit ?? 500);
}

/**
 * Same as listObservationsForCompany but joined with signal defs so the
 * Signals tab can render a full grouped view (category / label / unit /
 * kind) without a second round-trip. Only current, non-superseded rows.
 */
export async function listObservationsForCompanyWithSignal(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
}): Promise<ObservationWithSignal[]> {
  const db = await getDb();
  const rows = await db
    .select({
      obs: signalObservations,
      signal: {
        id: signals.id,
        label: signals.label,
        kind: signals.kind,
        unit: signals.unit,
        category: signals.category,
        invertedGood: signals.invertedGood,
      },
    })
    .from(signalObservations)
    .leftJoin(signals, eq(signals.id, signalObservations.signalId))
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        eq(signalObservations.companyUuid, opts.companyUuid),
        isNull(signalObservations.supersededAt),
      ),
    )
    .orderBy(desc(signalObservations.createdAt))
    .limit(opts.limit ?? 500);
  return rows
    .filter((r): r is { obs: SignalObservation; signal: NonNullable<typeof r.signal> } => !!r.signal)
    .map((r) => ({ ...r.obs, signal: r.signal }));
}

/**
 * Full history — current + superseded — for a (company, signal, period)
 * tuple, newest first. Powers the "how did this value change over time"
 * audit view.
 */
export async function listObservationHistory(opts: {
  accountId: string;
  companyUuid: string;
  signalId: string;
  period: string;
}): Promise<SignalObservation[]> {
  const db = await getDb();
  return db
    .select()
    .from(signalObservations)
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        eq(signalObservations.companyUuid, opts.companyUuid),
        eq(signalObservations.signalId, opts.signalId),
        eq(signalObservations.period, opts.period),
      ),
    )
    .orderBy(desc(signalObservations.createdAt));
}

/**
 * Mark every current observation for a context_item as superseded. Used by
 * retro-extract flows that run extraction separately from ingest. Keeps the
 * audit trail intact — prior rows stay in the table with supersededAt set.
 */
export async function replaceObservationsForContextItem(opts: {
  contextItemId: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(signalObservations)
    .set({ supersededAt: new Date() })
    .where(
      and(
        eq(signalObservations.contextItemId, opts.contextItemId),
        isNull(signalObservations.supersededAt),
      ),
    );
}
