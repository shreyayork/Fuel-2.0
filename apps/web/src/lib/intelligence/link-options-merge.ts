import { formatSignalObservationValue } from "@/lib/signals/group-catalog";
import type { ObservationWithSignal } from "@/lib/observations";
import { signalCategoryToIntelligenceCategory } from "./category-map";
import { orderIntelligenceLinkOptions } from "./link-options-order";
import type { CompanyIntelligenceRow } from "./types";

/** Map one catalog observation to a linkable intelligence row (unique `obs_*` id). */
export function observationToIntelligenceLinkRow(
  obs: ObservationWithSignal,
): CompanyIntelligenceRow {
  const displayValue = formatSignalObservationValue({
    kind: obs.signal.kind,
    unit: obs.signal.unit,
    valueNumeric: obs.valueNumeric,
    valueText: obs.valueText,
    valueBool: obs.valueBool,
  });
  const note = obs.rawSnippet?.trim() || null;
  const createdAt =
    obs.createdAt instanceof Date
      ? obs.createdAt.toISOString()
      : new Date(obs.createdAt).toISOString();
  return {
    id: obs.id,
    companyUuid: obs.companyUuid,
    category: signalCategoryToIntelligenceCategory(obs.signal.category),
    headline: obs.signal.label,
    keyDetail: displayValue,
    summary: note ?? displayValue,
    confidence: obs.confidence ?? 1,
    source: obs.source,
    generationPath: null,
    period: obs.period,
    contextItemId: obs.contextItemId,
    documentVersionId: null,
    documentLabel: null,
    rawSnippet: note,
    isBenchmark: false,
    authorEmail: obs.authorEmail,
    createdAt,
    signalId: obs.signalId,
  };
}

/**
 * Full link-picker history: company intelligence rows plus every current
 * signal observation. Grouped by signal, latest→oldest within each group.
 */
export function mergeIntelligenceLinkOptions(
  intelligence: CompanyIntelligenceRow[],
  observations: ObservationWithSignal[],
): CompanyIntelligenceRow[] {
  const observationRows = observations.map(observationToIntelligenceLinkRow);
  return orderIntelligenceLinkOptions([
    ...intelligence,
    ...observationRows,
  ]).map(({ isLatest: _isLatest, ...row }) => row);
}
