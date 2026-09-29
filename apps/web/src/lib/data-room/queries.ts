import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contextItems, dataRoomDocumentVersions } from "@/db/schema";
import { listContextForCompany, deleteContextItem } from "@/lib/context";
import {
  clampListLimit,
  clampListOffset,
  type PaginatedResponse,
} from "@/lib/list-pagination";
import { DATA_ROOM_DOCUMENT_TYPES } from "./constants";
import { formatUploadedAt, getFileFormat } from "./format";
import { createDocumentContextItem } from "./ingest";
import type {
  DataRoomDocumentSlot,
  DataRoomFeedAttachment,
  DataRoomFileRecord,
  DataRoomSnapshot,
  IntelligenceSourceItem,
} from "./types";
import type { DataRoomUploadSource } from "./validate-file";
import { loadIntelligenceStats } from "@/lib/intelligence/queries";
import { countActiveDocuments } from "./slots";
import {
  mergeIntelligenceStats,
  pageSourceKeys,
  toHubspotIntelligenceSourceItem,
  toIntelligenceSourceItem,
  type SourceListKey,
} from "./sources-map";

type VersionRow = typeof dataRoomDocumentVersions.$inferSelect;

type ContextAttachment = {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  uploadedAt: string;
  uploadedByEmail: string;
};

async function loadObservationStats(contextItemIds: string[], versionIds: string[] = []) {
  return loadIntelligenceStats({ contextItemIds, documentVersionIds: versionIds });
}

function toFileRecord(
  row: VersionRow,
  companyUuid: string,
  obsStats: Map<string, { count: number; ids: string[] }>,
  contextTitles: Map<string, string>,
): DataRoomFileRecord {
  const byContext = row.contextItemId ? obsStats.get(row.contextItemId) : undefined;
  const byVersion = obsStats.get(row.id);
  const stats = mergeIntelligenceStats(byVersion, byContext);
  const contextTitle = row.contextItemId
    ? contextTitles.get(row.contextItemId)
    : undefined;
  return {
    id: row.id,
    name: contextTitle || row.filename,
    typeId: row.typeId,
    typeLabel: row.typeLabel,
    format: getFileFormat(row.filename),
    uploadedAt: formatUploadedAt(row.uploadedAt),
    uploadedAtMs: row.uploadedAt.getTime(),
    source: row.source,
    intelligenceCount: stats?.count ?? 0,
    contextItemId: row.contextItemId,
    observationIds: stats?.ids ?? [],
    downloadPath: `/api/company/${companyUuid}/data-room/download/${row.id}`,
  };
}

function buildSlots(
  rows: VersionRow[],
  companyUuid: string,
  obsStats: Map<string, { count: number; ids: string[] }>,
  contextTitles: Map<string, string>,
): DataRoomDocumentSlot[] {
  const byType = new Map<string, DataRoomDocumentSlot>();

  for (const row of rows) {
    const existing =
      byType.get(row.typeId) ??
      ({
        typeId: row.typeId,
        typeLabel: row.typeLabel,
        current: null,
        history: [],
      } satisfies DataRoomDocumentSlot);

    const record = toFileRecord(row, companyUuid, obsStats, contextTitles);
    if (row.isCurrent) {
      existing.current = record;
    } else {
      existing.history.push(record);
    }
    byType.set(row.typeId, existing);
  }

  for (const slot of byType.values()) {
    slot.history.sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);
  }

  return [...byType.values()];
}

function formatFeedSource(source: string): string {
  if (source.startsWith("data_room:")) return "Data Room";
  if (source.startsWith("intelligence:")) return "Intelligence";
  if (source.startsWith("hubspot:")) return "HubSpot";
  if (source.startsWith("granola:")) return "Granola";
  if (source === "user") return "Manual note";
  return source;
}

async function listFeedAttachments(opts: {
  accountId: string;
  companyUuid: string;
  vaultContextItemIds: Set<string>;
  obsStats: Map<string, { count: number; ids: string[] }>;
}): Promise<DataRoomFeedAttachment[]> {
  const items = await listContextForCompany({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    limit: 200,
  });

  const feed: DataRoomFeedAttachment[] = [];

  for (const item of items) {
    if (opts.vaultContextItemIds.has(item.id)) continue;
    const attachments = (item.attachments ?? []) as ContextAttachment[];
    if (!attachments.length) continue;

    for (const attachment of attachments) {
      const stats = opts.obsStats.get(item.id);
      feed.push({
        id: `${item.id}:${attachment.id}`,
        contextItemId: item.id,
        attachmentId: attachment.id,
        name: attachment.filename,
        format: getFileFormat(attachment.filename),
        uploadedAt: formatUploadedAt(new Date(attachment.uploadedAt)),
        uploadedAtMs: new Date(attachment.uploadedAt).getTime(),
        source: formatFeedSource(item.source),
        intelligenceCount: stats?.count ?? 0,
        observationIds: stats?.ids ?? [],
        downloadPath: `/api/company/${opts.companyUuid}/data-room/download/context/${item.id}/${attachment.id}`,
      });
    }
  }

  return feed.sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);
}

function currentVersionsWhere(opts: { accountId: string; companyUuid: string }) {
  return and(
    eq(dataRoomDocumentVersions.accountId, opts.accountId),
    eq(dataRoomDocumentVersions.companyUuid, opts.companyUuid),
    eq(dataRoomDocumentVersions.isCurrent, true),
  );
}

/**
 * Context items that surface in the Intelligence Sources list as "notes":
 * HubSpot activities + Granola meeting transcripts.
 */
function integrationNoteSourceWhere(opts: {
  accountId: string;
  companyUuid: string;
}) {
  return and(
    eq(contextItems.accountId, opts.accountId),
    eq(contextItems.companyUuid, opts.companyUuid),
    or(
      eq(contextItems.kind, "hubspot_activity"),
      and(
        eq(contextItems.kind, "meeting_transcript"),
        like(contextItems.source, "granola:%"),
      ),
    ),
  );
}

/** Lightweight badge count — current vault docs only, no feed/slots hydration. */
export async function countDataRoomActiveDocuments(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dataRoomDocumentVersions)
    .where(currentVersionsWhere(opts));
  return row?.count ?? 0;
}

/** HubSpot activities + Granola meetings that appear as Sources notes. */
export async function countHubspotActivitySources(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contextItems)
    .where(integrationNoteSourceWhere(opts));
  return row?.count ?? 0;
}

/** Sources badge = vault docs ∪ HubSpot notes ∪ Granola meetings. */
export async function countIntelligenceSources(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const [docs, notes] = await Promise.all([
    countDataRoomActiveDocuments(opts),
    countHubspotActivitySources(opts),
  ]);
  return docs + notes;
}

/**
 * Paginated Sources sidebar — current Data Room versions ∪ HubSpot activities
 * ∪ Granola meeting transcripts. Does not build the full Data Room snapshot.
 */
export async function listIntelligenceSourcesPage(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<IntelligenceSourceItem>> {
  const limit = clampListLimit(opts.limit);
  const offset = clampListOffset(opts.offset);
  const db = await getDb();
  const docWhere = currentVersionsWhere(opts);
  const noteWhere = integrationNoteSourceWhere(opts);

  const [docTotal, noteTotal, docKeyRows, noteKeyRows] = await Promise.all([
    countDataRoomActiveDocuments(opts),
    countHubspotActivitySources(opts),
    db
      .select({
        id: dataRoomDocumentVersions.id,
        uploadedAt: dataRoomDocumentVersions.uploadedAt,
      })
      .from(dataRoomDocumentVersions)
      .where(docWhere),
    db
      .select({
        id: contextItems.id,
        occurredAt: contextItems.occurredAt,
        createdAt: contextItems.createdAt,
      })
      .from(contextItems)
      .where(noteWhere),
  ]);

  const total = docTotal + noteTotal;
  const mergedKeys: SourceListKey[] = [
    ...docKeyRows.map((row) => ({
      id: row.id,
      kind: "doc" as const,
      sortAtMs: row.uploadedAt.getTime(),
    })),
    ...noteKeyRows.map((row) => ({
      id: row.id,
      kind: "note" as const,
      sortAtMs: (row.occurredAt ?? row.createdAt).getTime(),
    })),
  ];
  const pageKeys = pageSourceKeys(mergedKeys, limit, offset);
  if (pageKeys.length === 0) {
    return { data: [], meta: { total, limit, offset } };
  }

  const versionIds = pageKeys
    .filter((k) => k.kind === "doc")
    .map((k) => k.id);
  const noteIds = pageKeys.filter((k) => k.kind === "note").map((k) => k.id);

  const [docRows, noteRows] = await Promise.all([
    versionIds.length > 0
      ? db
          .select()
          .from(dataRoomDocumentVersions)
          .where(inArray(dataRoomDocumentVersions.id, versionIds))
      : Promise.resolve([] as Array<typeof dataRoomDocumentVersions.$inferSelect>),
    noteIds.length > 0
      ? db
          .select({
            id: contextItems.id,
            title: contextItems.title,
            source: contextItems.source,
            occurredAt: contextItems.occurredAt,
            createdAt: contextItems.createdAt,
          })
          .from(contextItems)
          .where(inArray(contextItems.id, noteIds))
      : Promise.resolve(
          [] as Array<{
            id: string;
            title: string | null;
            source: string;
            occurredAt: Date | null;
            createdAt: Date;
          }>,
        ),
  ]);

  const docById = new Map(docRows.map((row) => [row.id, row]));
  const noteById = new Map(noteRows.map((row) => [row.id, row]));

  const docContextItemIds = [
    ...new Set(
      docRows
        .map((row) => row.contextItemId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const statsContextIds = [...new Set([...docContextItemIds, ...noteIds])];

  const [obsStats, contextTitleRows] = await Promise.all([
    loadIntelligenceStats({
      contextItemIds: statsContextIds,
      documentVersionIds: versionIds,
    }),
    docContextItemIds.length > 0
      ? db
          .select({ id: contextItems.id, title: contextItems.title })
          .from(contextItems)
          .where(inArray(contextItems.id, docContextItemIds))
      : Promise.resolve([] as Array<{ id: string; title: string | null }>),
  ]);

  const contextTitles = new Map<string, string>();
  for (const item of contextTitleRows) {
    if (item.title?.trim()) contextTitles.set(item.id, item.title.trim());
  }

  const data: IntelligenceSourceItem[] = [];
  for (const key of pageKeys) {
    if (key.kind === "doc") {
      const row = docById.get(key.id);
      if (!row) continue;
      const byContext = row.contextItemId
        ? obsStats.get(row.contextItemId)
        : undefined;
      const byVersion = obsStats.get(row.id);
      data.push(
        toIntelligenceSourceItem(row, {
          contextTitle: row.contextItemId
            ? contextTitles.get(row.contextItemId)
            : undefined,
          stats: mergeIntelligenceStats(byVersion, byContext),
        }),
      );
      continue;
    }
    const note = noteById.get(key.id);
    if (!note) continue;
    data.push(
      toHubspotIntelligenceSourceItem(note, obsStats.get(note.id)),
    );
  }

  return { data: data, meta: { total, limit, offset } };
}

export async function listDataRoomSnapshot(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<DataRoomSnapshot> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(dataRoomDocumentVersions)
    .where(
      and(
        eq(dataRoomDocumentVersions.accountId, opts.accountId),
        eq(dataRoomDocumentVersions.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(desc(dataRoomDocumentVersions.uploadedAt));

  const vaultContextItemIds = new Set(
    rows.map((row) => row.contextItemId).filter((id): id is string => Boolean(id)),
  );

  const contextItemIds = new Set<string>(vaultContextItemIds);
  const contextRows = await listContextForCompany({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    limit: 200,
  });
  for (const item of contextRows) {
    if ((item.attachments as ContextAttachment[] | null)?.length) {
      contextItemIds.add(item.id);
    }
  }

  const obsStats = await loadObservationStats(
    [...contextItemIds],
    rows.map((row) => row.id),
  );
  const contextTitles = new Map<string, string>();
  for (const item of contextRows) {
    if (item.title?.trim()) contextTitles.set(item.id, item.title.trim());
  }
  const slots = buildSlots(rows, opts.companyUuid, obsStats, contextTitles);
  const feedAttachments = await listFeedAttachments({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    vaultContextItemIds,
    obsStats,
  });

  const activeCount = countActiveDocuments(slots);
  const noteSources = await countHubspotActivitySources(opts);
  return {
    slots,
    activeCount,
    sourcesTotal: activeCount + noteSources,
    feedAttachments,
  };
}

export async function getDataRoomVersion(opts: {
  accountId: string;
  companyUuid: string;
  versionId: string;
}) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(dataRoomDocumentVersions)
    .where(
      and(
        eq(dataRoomDocumentVersions.id, opts.versionId),
        eq(dataRoomDocumentVersions.accountId, opts.accountId),
        eq(dataRoomDocumentVersions.companyUuid, opts.companyUuid),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getContextFeedAttachment(opts: {
  accountId: string;
  companyUuid: string;
  contextItemId: string;
  attachmentId: string;
}) {
  const db = await getDb();
  const [item] = await db
    .select()
    .from(contextItems)
    .where(
      and(
        eq(contextItems.id, opts.contextItemId),
        eq(contextItems.accountId, opts.accountId),
        eq(contextItems.companyUuid, opts.companyUuid),
      ),
    )
    .limit(1);
  if (!item) return null;

  const attachments = (item.attachments ?? []) as ContextAttachment[];
  const attachment = attachments.find((a) => a.id === opts.attachmentId);
  if (!attachment) return null;
  return { item, attachment };
}

export async function uploadDataRoomDocument(opts: {
  accountId: string;
  companyUuid: string;
  typeId: string;
  typeLabel: string;
  /** User-facing source title (Add source form). */
  title?: string;
  filename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  uploadedByEmail: string;
  source: DataRoomUploadSource;
}): Promise<{
  snapshot: DataRoomSnapshot;
  versionId: string;
  contextItemId: string;
  attachmentId: string;
}> {
  let contextItemId: string | undefined;
  let attachmentId: string | undefined;
  const versionId = `drv_${randomUUID()}`;

  try {
    const created = await createDocumentContextItem({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      authorEmail: opts.uploadedByEmail,
      typeId: opts.typeId,
      typeLabel: opts.typeLabel,
      title: opts.title,
      filename: opts.filename,
      contentType: opts.contentType,
      byteSize: opts.byteSize,
      storageKey: opts.storageKey,
      source: opts.source,
    });
    contextItemId = created.contextItemId;
    attachmentId = created.attachmentId;

    const db = await getDb();
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(dataRoomDocumentVersions)
        .set({ isCurrent: false, supersededAt: now })
        .where(
          and(
            eq(dataRoomDocumentVersions.accountId, opts.accountId),
            eq(dataRoomDocumentVersions.companyUuid, opts.companyUuid),
            eq(dataRoomDocumentVersions.typeId, opts.typeId),
            eq(dataRoomDocumentVersions.isCurrent, true),
          ),
        );

      await tx.insert(dataRoomDocumentVersions).values({
        id: versionId,
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        typeId: opts.typeId,
        typeLabel: opts.typeLabel,
        filename: opts.filename,
        contentType: opts.contentType,
        byteSize: opts.byteSize,
        storageKey: opts.storageKey,
        source: opts.source,
        uploadedAt: now,
        uploadedByEmail: opts.uploadedByEmail,
        isCurrent: true,
        supersededAt: null,
        contextItemId,
      });
    });
  } catch (error) {
    if (contextItemId) {
      await deleteContextItem({ accountId: opts.accountId, id: contextItemId }).catch(() => {});
    }
    throw error;
  }

  return {
    snapshot: await listDataRoomSnapshot({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
    }),
    versionId,
    contextItemId: contextItemId!,
    attachmentId: attachmentId!,
  };
}

export function resolveUploadType(
  typeId: string,
  typeLabel: string,
): {
  typeId: string;
  typeLabel: string;
} | null {
  if (typeId === "custom") return null;
  if (typeId.startsWith("custom:")) {
    const label = typeLabel.trim() || typeId.slice(7).replace(/-/g, " ");
    if (!label) return null;
    return { typeId, typeLabel: label };
  }
  const predefined = DATA_ROOM_DOCUMENT_TYPES.find((type) => type.id === typeId);
  if (!predefined || predefined.id === "custom") return null;
  return { typeId: predefined.id, typeLabel: predefined.label };
}
