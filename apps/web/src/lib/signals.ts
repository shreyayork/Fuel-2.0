import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { signals, type Signal } from "@/db/schema";

export const SIGNAL_KINDS = ["quantitative", "qualitative", "boolean"] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

export const SIGNAL_UNITS = [
  "usd",
  "pct",
  "months",
  "count",
  "ratio",
  "days",
  "score",
] as const;
export type SignalUnit = (typeof SIGNAL_UNITS)[number];

export async function listGlobalSignals(): Promise<Signal[]> {
  const db = await getDb();
  return db
    .select()
    .from(signals)
    .where(and(eq(signals.scope, "global"), isNull(signals.accountId)))
    .orderBy(asc(signals.category), asc(signals.displayOrder), asc(signals.label));
}

export interface SignalUpsert {
  id: string;
  label: string;
  kind: SignalKind;
  category: string;
  unit?: string | null;
  invertedGood?: boolean;
  description?: string | null;
  extractionHint?: string | null;
  displayOrder?: number;
}

/**
 * Idempotent upsert of a global signal (scope = global, account_id = null).
 * IDs are the stable natural key and must not change once in use — the UI
 * enforces that by disabling the id field on edit.
 */
export async function upsertGlobalSignal(input: SignalUpsert): Promise<Signal> {
  const db = await getDb();
  const values = {
    id: input.id,
    label: input.label,
    kind: input.kind,
    category: input.category,
    unit: input.unit ?? null,
    invertedGood: input.invertedGood ?? false,
    description: input.description ?? null,
    extractionHint: input.extractionHint ?? null,
    displayOrder: input.displayOrder ?? 0,
    scope: "global" as const,
    accountId: null,
  };
  const [existing] = await db
    .select({ id: signals.id })
    .from(signals)
    .where(and(eq(signals.id, input.id), eq(signals.scope, "global")))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(signals)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(signals.id, input.id), eq(signals.scope, "global")))
      .returning();
    return row;
  }
  const [row] = await db.insert(signals).values(values).returning();
  return row;
}

export async function deleteGlobalSignal(id: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(signals)
    .where(and(eq(signals.id, id), eq(signals.scope, "global")));
}
