/**
 * Signal-kind value validation for AI-generated intelligence.
 * Source of truth for kinds/units: `signals.kind` / `signals.unit` (see SIGNAL_KINDS).
 * Display formatting reuses `formatSignalObservationValue` — no second type system.
 */
import {
  formatSignalObservationValue,
  type SignalCatalogItem,
} from "@/lib/signals/group-catalog";
import { signalCategoryToIntelligenceCategory } from "./category-map";
import type { ExtractedIntelligenceItem } from "./types";

export type InsightValueFields = {
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
};

export type ResolvedInsightValue = InsightValueFields & {
  keyDetail: string;
};

type SignalDef = Pick<
  SignalCatalogItem,
  "id" | "label" | "category" | "kind" | "unit"
>;

/**
 * Accept only the primitive field that matches the signal kind.
 * No string→boolean / free-text→number coercion — malformed AI output is omitted.
 */
export function resolveInsightValue(
  signal: Pick<SignalCatalogItem, "kind" | "unit">,
  raw: {
    value_numeric?: unknown;
    valueNumeric?: unknown;
    value_text?: unknown;
    valueText?: unknown;
    value_bool?: unknown;
    valueBool?: unknown;
  },
): ResolvedInsightValue | null {
  if (signal.kind === "boolean") {
    const valueBool = raw.value_bool ?? raw.valueBool;
    if (typeof valueBool !== "boolean") return null;
    return {
      valueNumeric: null,
      valueText: null,
      valueBool,
      keyDetail: formatSignalObservationValue({
        kind: "boolean",
        unit: signal.unit,
        valueNumeric: null,
        valueText: null,
        valueBool,
      }),
    };
  }

  if (signal.kind === "qualitative") {
    const rawText = raw.value_text ?? raw.valueText;
    if (typeof rawText !== "string") return null;
    const valueText = rawText.trim();
    if (!valueText) return null;
    return {
      valueNumeric: null,
      valueText,
      valueBool: null,
      keyDetail: formatSignalObservationValue({
        kind: "qualitative",
        unit: signal.unit,
        valueNumeric: null,
        valueText,
        valueBool: null,
      }),
    };
  }

  // quantitative (and unknown kinds treated as quantitative)
  const valueNumeric = raw.value_numeric ?? raw.valueNumeric;
  if (typeof valueNumeric !== "number" || !Number.isFinite(valueNumeric)) {
    return null;
  }
  return {
    valueNumeric,
    valueText: null,
    valueBool: null,
    keyDetail: formatSignalObservationValue({
      kind: "quantitative",
      unit: signal.unit,
      valueNumeric,
      valueText: null,
      valueBool: null,
    }),
  };
}

export function coerceInsightItem(
  raw: unknown,
  catalogById: Map<string, SignalDef>,
): ExtractedIntelligenceItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const signalId = String(item.signal_id ?? item.signalId ?? "").trim();
  const def = catalogById.get(signalId);
  if (!def) return null;

  const resolved = resolveInsightValue(def, item);
  if (!resolved) return null;

  const summary = String(item.summary ?? item.detail ?? "").trim();
  let raw_snippet = String(
    item.raw_snippet ?? item.rawSnippet ?? item.snippet ?? "",
  ).trim();

  if (!summary && !resolved.keyDetail) return null;
  if (!raw_snippet) raw_snippet = resolved.keyDetail || summary;

  return {
    category: signalCategoryToIntelligenceCategory(def.category),
    headline: def.label,
    key_detail: resolved.keyDetail,
    summary: summary || resolved.keyDetail,
    raw_snippet,
    signal_id: def.id,
    value_numeric: resolved.valueNumeric,
    value_text: resolved.valueText,
    value_bool: resolved.valueBool,
  };
}

export function coerceInsights(
  raw: unknown[],
  catalogById: Map<string, SignalDef>,
  safetyMax: number,
): ExtractedIntelligenceItem[] {
  const seen = new Set<string>();
  const out: ExtractedIntelligenceItem[] = [];
  for (const row of raw) {
    const item = coerceInsightItem(row, catalogById);
    if (!item) continue;
    if (seen.has(item.signal_id)) continue;
    seen.add(item.signal_id);
    out.push(item);
    if (out.length >= safetyMax) break;
  }
  return out;
}

/** Catalog line hint: which typed field the model must fill for this signal. */
export function valueFieldForKind(kind: SignalCatalogItem["kind"]): string {
  if (kind === "boolean") return "value_bool";
  if (kind === "qualitative") return "value_text";
  return "value_numeric";
}
