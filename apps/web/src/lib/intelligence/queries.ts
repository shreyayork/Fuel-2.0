import "server-only";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  companyIntelligence,
  contextItems,
  dataRoomDocumentVersions,
} from "@/db/schema";
import { currentPeriod } from "@/lib/portfolio-updates";
import type { IntelligenceCategory } from "./constants";
import type { CompanyIntelligenceRow } from "./types";

function metadataTitle(metadata: Record<string, unknown> | null): string | null {
  const title = metadata?.title;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Prefer the user-facing source title over document type labels. */
function resolveDocumentLabel(
  row: typeof companyIntelligence.$inferSelect,
  typeLabel: string | null,
  contextTitle: string | null,
): string | null {
  return (
    metadataTitle(row.metadata) ??
    (contextTitle?.trim() || null) ??
    (typeLabel?.trim() || null)
  );
}

function toRow(
  row: typeof companyIntelligence.$inferSelect,
  documentLabel: string | null,
): CompanyIntelligenceRow {
  const meta = row.metadata ?? null;
  return {
    id: row.id,
    companyUuid: row.companyUuid,
    category: row.category as IntelligenceCategory,
    headline: row.headline,
    keyDetail: row.keyDetail,
    summary: row.summary,
    confidence: row.confidence,
    source: row.source,
    generationPath: row.generationPath,
    period: row.period,
    contextItemId: row.contextItemId,
    documentVersionId: row.documentVersionId,
    documentLabel,
    rawSnippet: row.rawSnippet,
    isBenchmark: row.isBenchmark,
    authorEmail: row.authorEmail,
    createdAt: row.createdAt.toISOString(),
    signalId: metadataString(meta, "signalId"),
    overviewCategory: metadataString(meta, "overviewCategory"),
    evidenceSource: metadataString(meta, "evidenceSource"),
  };
}

export async function listIntelligenceForCompany(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
}): Promise<CompanyIntelligenceRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        isNull(companyIntelligence.dismissedAt),
      ),
    )
    .orderBy(desc(companyIntelligence.createdAt))
    .limit(opts.limit ?? 200);

  const versionIds = [
    ...new Set(rows.map((r) => r.documentVersionId).filter((id): id is string => Boolean(id))),
  ];
  const contextIds = [
    ...new Set(rows.map((r) => r.contextItemId).filter((id): id is string => Boolean(id))),
  ];
  const typeLabels = new Map<string, string>();
  if (versionIds.length > 0) {
    const versions = await db
      .select({
        id: dataRoomDocumentVersions.id,
        typeLabel: dataRoomDocumentVersions.typeLabel,
      })
      .from(dataRoomDocumentVersions)
      .where(inArray(dataRoomDocumentVersions.id, versionIds));
    for (const v of versions) {
      typeLabels.set(v.id, v.typeLabel);
    }
  }
  const contextTitles = new Map<string, string>();
  if (contextIds.length > 0) {
    const contexts = await db
      .select({ id: contextItems.id, title: contextItems.title })
      .from(contextItems)
      .where(inArray(contextItems.id, contextIds));
    for (const c of contexts) {
      if (c.title?.trim()) contextTitles.set(c.id, c.title.trim());
    }
  }

  return rows.map((row) =>
    toRow(
      row,
      resolveDocumentLabel(
        row,
        row.documentVersionId ? typeLabels.get(row.documentVersionId) ?? null : null,
        row.contextItemId ? contextTitles.get(row.contextItemId) ?? null : null,
      ),
    ),
  );
}

export async function loadIntelligenceStats(keys: {
  contextItemIds: string[];
  documentVersionIds: string[];
}): Promise<Map<string, { count: number; ids: string[] }>> {
  const out = new Map<string, { count: number; ids: string[] }>();
  const db = await getDb();
  const orClauses = [];
  if (keys.contextItemIds.length > 0) {
    orClauses.push(inArray(companyIntelligence.contextItemId, keys.contextItemIds));
  }
  if (keys.documentVersionIds.length > 0) {
    orClauses.push(inArray(companyIntelligence.documentVersionId, keys.documentVersionIds));
  }
  if (orClauses.length === 0) return out;

  const rows = await db
    .select({
      id: companyIntelligence.id,
      contextItemId: companyIntelligence.contextItemId,
      documentVersionId: companyIntelligence.documentVersionId,
    })
    .from(companyIntelligence)
    .where(and(isNull(companyIntelligence.dismissedAt), or(...orClauses)));

  for (const row of rows) {
    const keysForRow = [row.contextItemId, row.documentVersionId].filter(
      (k): k is string => Boolean(k),
    );
    for (const key of keysForRow) {
      const existing = out.get(key) ?? { count: 0, ids: [] };
      existing.count += 1;
      existing.ids.push(row.id);
      out.set(key, existing);
    }
  }
  return out;
}

export async function dismissIntelligence(opts: {
  accountId: string;
  companyUuid: string;
  id: string;
}): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: companyIntelligence.id,
      isBenchmark: companyIntelligence.isBenchmark,
    })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.id, opts.id),
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        isNull(companyIntelligence.dismissedAt),
      ),
    )
    .limit(1);
  if (!row || row.isBenchmark) return false;

  await db
    .update(companyIntelligence)
    .set({ dismissedAt: new Date() })
    .where(eq(companyIntelligence.id, opts.id));
  return true;
}

export async function createManualIntelligence(opts: {
  accountId: string;
  companyUuid: string;
  category: IntelligenceCategory;
  period: string;
  headline: string;
  keyDetail?: string | null;
  summary?: string | null;
  authorEmail: string;
}): Promise<CompanyIntelligenceRow> {
  const db = await getDb();
  const id = `intel_${randomUUID()}`;
  const now = new Date();
  const [row] = await db
    .insert(companyIntelligence)
    .values({
      id,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      category: opts.category,
      headline: opts.headline.slice(0, 120),
      keyDetail: opts.keyDetail?.slice(0, 240) ?? null,
      summary: opts.summary?.slice(0, 500) ?? opts.headline,
      confidence: 1,
      source: `manual:${opts.authorEmail}`,
      generationPath: null,
      period: opts.period || currentPeriod(now),
      metadata: { title: "User input" },
      isBenchmark: false,
      authorEmail: opts.authorEmail,
      createdAt: now,
    })
    .returning();
  return toRow(row!, null);
}

export async function getIntelligenceProvenance(opts: {
  accountId: string;
  id: string;
}) {
  const db = await getDb();
  const [intel] = await db
    .select()
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.id, opts.id),
        eq(companyIntelligence.accountId, opts.accountId),
      ),
    )
    .limit(1);
  if (!intel) return null;

  const [contextItem] = intel.contextItemId
    ? await db
        .select()
        .from(contextItems)
        .where(eq(contextItems.id, intel.contextItemId))
        .limit(1)
    : [null];

  const [document] = intel.documentVersionId
    ? await db
        .select()
        .from(dataRoomDocumentVersions)
        .where(eq(dataRoomDocumentVersions.id, intel.documentVersionId))
        .limit(1)
    : [null];

  return {
    intelligence: {
      id: intel.id,
      category: intel.category,
      headline: intel.headline,
      keyDetail: intel.keyDetail,
      summary: intel.summary,
      rawSnippet: intel.rawSnippet,
      source: intel.source,
      period: intel.period,
      isBenchmark: intel.isBenchmark,
      createdAt: intel.createdAt.toISOString(),
    },
    contextItem: contextItem
      ? {
          id: contextItem.id,
          title: contextItem.title,
          source: contextItem.source,
          kind: contextItem.kind,
        }
      : null,
    document: document
      ? {
          id: document.id,
          typeLabel: document.typeLabel,
          filename: document.filename,
          source: document.source,
        }
      : null,
  };
}

export async function listIntelligenceForDocument(opts: {
  accountId: string;
  companyUuid: string;
  documentVersionId?: string;
  contextItemId?: string;
}): Promise<CompanyIntelligenceRow[]> {
  const db = await getDb();
  const filters = [
    eq(companyIntelligence.accountId, opts.accountId),
    eq(companyIntelligence.companyUuid, opts.companyUuid),
    isNull(companyIntelligence.dismissedAt),
  ];
  if (opts.documentVersionId) {
    filters.push(eq(companyIntelligence.documentVersionId, opts.documentVersionId));
  } else if (opts.contextItemId) {
    filters.push(eq(companyIntelligence.contextItemId, opts.contextItemId));
  } else {
    return [];
  }

  const rows = await db
    .select()
    .from(companyIntelligence)
    .where(and(...filters))
    .orderBy(desc(companyIntelligence.createdAt));

  let typeLabel: string | null = null;
  if (opts.documentVersionId) {
    typeLabel =
      (
        await db
          .select({ typeLabel: dataRoomDocumentVersions.typeLabel })
          .from(dataRoomDocumentVersions)
          .where(eq(dataRoomDocumentVersions.id, opts.documentVersionId))
          .limit(1)
      )[0]?.typeLabel ?? null;
  }

  let contextTitle: string | null = null;
  const contextId = opts.contextItemId ?? rows[0]?.contextItemId ?? null;
  if (contextId) {
    contextTitle =
      (
        await db
          .select({ title: contextItems.title })
          .from(contextItems)
          .where(eq(contextItems.id, contextId))
          .limit(1)
      )[0]?.title ?? null;
  }

  return rows.map((row) =>
    toRow(row, resolveDocumentLabel(row, typeLabel, contextTitle)),
  );
}
