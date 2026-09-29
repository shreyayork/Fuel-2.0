import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { yorkChipHeadlines } from "@/db/schema";
import {
  DEFAULT_CHIP_HEADLINES,
  defaultChipHeadlineMap,
  defaultChipRowsForCategory,
  normalizeChipKey,
  YORK_PARTNER_CATEGORIES,
  type ChipAdminRow,
  type YorkChipHeadlineMap,
  type YorkPartnerCategoryId,
} from "@/lib/york-partner";

export type { ChipAdminRow };

function headlineId(): string {
  return `ych_${randomUUID()}`;
}

function isCategory(value: string): value is YorkPartnerCategoryId {
  return (YORK_PARTNER_CATEGORIES as readonly string[]).includes(value);
}

/** Defaults merged with Super Admin overrides (override wins). */
export async function getMergedChipHeadlineMap(): Promise<YorkChipHeadlineMap> {
  const map = defaultChipHeadlineMap();
  const db = await getDb();
  const rows = await db.select().from(yorkChipHeadlines);
  for (const row of rows) {
    if (!isCategory(row.category)) continue;
    map[row.category][normalizeChipKey(row.chipLabel)] = row.headline;
  }
  return map;
}

/** Super Admin table rows: defaults with any saved overrides applied. */
export async function listChipHeadlinesForAdmin(): Promise<ChipAdminRow[]> {
  const db = await getDb();
  const overrides = await db.select().from(yorkChipHeadlines);
  const overrideByKey = new Map<string, string>();
  for (const row of overrides) {
    overrideByKey.set(
      `${row.category}::${normalizeChipKey(row.chipLabel)}`,
      row.headline,
    );
  }

  const out: ChipAdminRow[] = [];
  for (const category of YORK_PARTNER_CATEGORIES) {
    for (const row of defaultChipRowsForCategory(category)) {
      const key = `${category}::${normalizeChipKey(row.chipLabel)}`;
      const override = overrideByKey.get(key);
      out.push({
        category,
        chipLabel: row.chipLabel,
        headline: override ?? row.headline,
        isOverride: override != null,
      });
    }
  }
  return out;
}

export async function upsertChipHeadline(opts: {
  category: YorkPartnerCategoryId;
  chipLabel: string;
  headline: string;
  updatedByEmail: string;
}): Promise<void> {
  const headline = opts.headline.trim();
  if (!headline) throw new Error("Headline is required");
  if (headline.length > 120) throw new Error("Headline must be 120 characters or fewer");

  const db = await getDb();
  const chipLabel = opts.chipLabel.trim();
  const now = new Date();
  const existing = await db
    .select()
    .from(yorkChipHeadlines)
    .where(
      and(
        eq(yorkChipHeadlines.category, opts.category),
        eq(yorkChipHeadlines.chipLabel, chipLabel),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(yorkChipHeadlines)
      .set({
        headline,
        updatedByEmail: opts.updatedByEmail,
        updatedAt: now,
      })
      .where(eq(yorkChipHeadlines.id, existing[0].id));
    return;
  }

  await db.insert(yorkChipHeadlines).values({
    id: headlineId(),
    category: opts.category,
    chipLabel,
    headline,
    updatedByEmail: opts.updatedByEmail,
    createdAt: now,
    updatedAt: now,
  });
}

export async function resetChipHeadline(opts: {
  category: YorkPartnerCategoryId;
  chipLabel: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(yorkChipHeadlines)
    .where(
      and(
        eq(yorkChipHeadlines.category, opts.category),
        eq(yorkChipHeadlines.chipLabel, opts.chipLabel.trim()),
      ),
    );
}

export async function resetCategoryChipHeadlines(
  category: YorkPartnerCategoryId,
): Promise<void> {
  const db = await getDb();
  await db
    .delete(yorkChipHeadlines)
    .where(eq(yorkChipHeadlines.category, category));
}

/** Seed missing default rows is not required — defaults live in code. */
export function defaultHeadlineFor(
  category: YorkPartnerCategoryId,
  chipLabel: string,
): string | null {
  const key = normalizeChipKey(chipLabel);
  for (const [label, headline] of Object.entries(
    DEFAULT_CHIP_HEADLINES[category],
  )) {
    if (normalizeChipKey(label) === key) return headline;
  }
  return null;
}
