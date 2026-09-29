// Shared between the Next app and the migrations Lambda — no "server-only".
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { faqEntries, type FaqPoint } from "./schema";
import {
  DEFAULT_FAQ_SEED,
  FAQ_SEED_CURATOR,
} from "@/lib/faq-defaults";
import { normalizeFaqRichText } from "@/lib/faq-rich-text";

function normalizeSeedPoints(points: FaqPoint[]): FaqPoint[] {
  return points.map((p) => ({
    label: normalizeFaqRichText(p.label),
    body: normalizeFaqRichText(p.body),
  }));
}

/**
 * Idempotent FAQ seed from design-library `FUEL_HELP_FAQ`.
 *
 * - Insert when id missing.
 * - Refresh content only when row still owned by `FAQ_SEED_CURATOR`
 *   (never overwrite Super Admin–edited rows — different curator email).
 */
export async function seedFaqDefaults(
  db: NodePgDatabase<Record<string, unknown>>,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of DEFAULT_FAQ_SEED) {
    const answer = normalizeFaqRichText(item.answer);
    const points = normalizeSeedPoints(item.points);
    const footnote = item.footnote ? normalizeFaqRichText(item.footnote) : null;

    const insertedRows = await db
      .insert(faqEntries)
      .values({
        id: item.id,
        question: item.question,
        answer,
        points,
        footnote,
        sortOrder: item.sortOrder,
        published: true,
        curatedByEmail: FAQ_SEED_CURATOR,
      })
      .onConflictDoNothing({ target: faqEntries.id })
      .returning({ id: faqEntries.id });

    if (insertedRows.length > 0) {
      inserted += 1;
      continue;
    }

    // Refresh system-owned rows only (admin edits keep their curatedByEmail).
    const refreshed = await db
      .update(faqEntries)
      .set({
        question: item.question,
        answer,
        points,
        footnote,
        sortOrder: item.sortOrder,
        published: true,
        updatedAt: new Date(),
      })
      .where(
        and(eq(faqEntries.id, item.id), eq(faqEntries.curatedByEmail, FAQ_SEED_CURATOR)),
      )
      .returning({ id: faqEntries.id });

    if (refreshed.length > 0) updated += 1;
    else skipped += 1;
  }

  return { inserted, updated, skipped };
}
