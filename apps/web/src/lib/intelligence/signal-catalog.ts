import "server-only";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { signals, type Signal } from "@/db/schema";
import { valueFieldForKind } from "./insight-value";

export type SignalCatalogDef = Pick<
  Signal,
  "id" | "label" | "category" | "kind" | "unit" | "description"
>;

/** Global + account-scoped signals for AI grounding (document + overview). */
export async function loadSignalCatalog(accountId: string): Promise<SignalCatalogDef[]> {
  const db = await getDb();
  return db
    .select({
      id: signals.id,
      label: signals.label,
      category: signals.category,
      kind: signals.kind,
      unit: signals.unit,
      description: signals.description,
    })
    .from(signals)
    .where(
      or(
        and(eq(signals.scope, "global"), isNull(signals.accountId)),
        and(eq(signals.scope, "account"), eq(signals.accountId, accountId)),
      ),
    )
    .orderBy(asc(signals.category), asc(signals.displayOrder));
}

export function formatSignalCatalogForPrompt(defs: SignalCatalogDef[]): string {
  return defs
    .map((d) => {
      const unit = d.unit ? ` ${d.unit}` : "";
      const desc = d.description ? ` — ${d.description}` : "";
      const valueField = valueFieldForKind(d.kind);
      return `- ${d.id}  [${d.kind}${unit}]  ${d.label}${desc}  → fill ${valueField} only`;
    })
    .join("\n");
}
