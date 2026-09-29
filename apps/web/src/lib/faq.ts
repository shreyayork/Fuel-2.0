import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { faqEntries, type FaqEntry, type FaqPoint } from "@/db/schema";
import type { FaqPointInput } from "./faq-constants";
import { normalizeFaqRichText } from "./faq-rich-text";

export type { FaqPointInput };

function faqId(): string {
  return `faq_${randomUUID()}`;
}

function normalizePoints(points: FaqPointInput[] | null | undefined): FaqPoint[] {
  if (!points?.length) return [];
  return points
    .map((p) => ({
      label: normalizeFaqRichText(p.label.trim()),
      body: normalizeFaqRichText(p.body.trim()),
    }))
    .filter((p) => p.label.length > 0);
}

/** Live Help page — published rows only, display order. */
export async function listPublishedFaqEntries(): Promise<FaqEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(faqEntries)
    .where(eq(faqEntries.published, true))
    .orderBy(asc(faqEntries.sortOrder), asc(faqEntries.createdAt));
}

/** Super Admin — every row including drafts. */
export async function listFaqEntriesAdmin(): Promise<FaqEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(faqEntries)
    .orderBy(asc(faqEntries.sortOrder), asc(faqEntries.createdAt));
}

export async function getFaqEntry(id: string): Promise<FaqEntry | null> {
  const db = await getDb();
  const [row] = await db.select().from(faqEntries).where(eq(faqEntries.id, id));
  return row ?? null;
}

export async function upsertFaqEntry(opts: {
  id?: string;
  curatedByEmail: string;
  values: {
    question: string;
    answer: string;
    points?: FaqPointInput[] | null;
    footnote?: string | null;
    published?: boolean;
    sortOrder?: number;
  };
}): Promise<FaqEntry> {
  const db = await getDb();
  const now = new Date();
  const points = normalizePoints(opts.values.points);
  const answer = normalizeFaqRichText(opts.values.answer.trim());
  const footnoteRaw = opts.values.footnote?.trim() || null;
  const footnote = footnoteRaw ? normalizeFaqRichText(footnoteRaw) : null;
  const published = opts.values.published ?? false;

  if (opts.id) {
    const [row] = await db
      .update(faqEntries)
      .set({
        question: opts.values.question.trim(),
        answer,
        points,
        footnote,
        published,
        ...(opts.values.sortOrder != null ? { sortOrder: opts.values.sortOrder } : {}),
        updatedAt: now,
      })
      .where(eq(faqEntries.id, opts.id))
      .returning();
    if (row) return row;
  }

  const id = opts.id ?? faqId();
  let sortOrder = opts.values.sortOrder;
  if (sortOrder == null) {
    const [top] = await db
      .select({ sortOrder: faqEntries.sortOrder })
      .from(faqEntries)
      .orderBy(desc(faqEntries.sortOrder))
      .limit(1);
    sortOrder = (top?.sortOrder ?? 0) + 10;
  }

  const [row] = await db
    .insert(faqEntries)
    .values({
      id,
      curatedByEmail: opts.curatedByEmail,
      question: opts.values.question.trim(),
      answer,
      points,
      footnote,
      published,
      sortOrder,
    })
    .returning();
  return row;
}

export async function deleteFaqEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(faqEntries).where(eq(faqEntries.id, id));
}

/**
 * Persist full list order after drag-and-drop.
 * Concurrent Super Admin edits: last-write-wins on the full ordered id list
 * (same pattern as other curated catalogs with no locking).
 */
export async function setFaqSortOrder(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const db = await getDb();
  const now = new Date();
  const existing = await db
    .select({ id: faqEntries.id })
    .from(faqEntries)
    .where(inArray(faqEntries.id, orderedIds));
  const known = new Set(existing.map((r) => r.id));
  const filtered = orderedIds.filter((id) => known.has(id));
  if (filtered.length === 0) return;

  await db.transaction(async (tx) => {
    for (let i = 0; i < filtered.length; i++) {
      await tx
        .update(faqEntries)
        .set({ sortOrder: (i + 1) * 10, updatedAt: now })
        .where(eq(faqEntries.id, filtered[i]!));
    }
  });
}
