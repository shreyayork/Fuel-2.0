/**
 * Signal catalog helpers for Intelligence (and any signal pick → value UI).
 * Kind/unit rules: `.cursor/skills/fuel-engineering/signals.md`
 */
/** Lightweight signal catalog shape used by Intelligence manual logging. */
export type SignalCatalogItem = {
  id: string;
  label: string;
  category: string;
  kind: "quantitative" | "qualitative" | "boolean";
  unit: string | null;
};

const UNIT_LABELS: Record<string, string> = {
  usd: "usd",
  pct: "pct",
  months: "months",
  count: "count",
  ratio: "ratio",
  days: "days",
  score: "score",
};

export function groupSignalCatalogByCategory(
  catalog: SignalCatalogItem[],
): Array<[string, SignalCatalogItem[]]> {
  const byCategory = new Map<string, SignalCatalogItem[]>();
  for (const signal of catalog) {
    const list = byCategory.get(signal.category) ?? [];
    list.push(signal);
    byCategory.set(signal.category, list);
  }
  return Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, signals]) => [
      category,
      [...signals].sort((a, b) => a.label.localeCompare(b.label)),
    ]);
}

export function formatSignalOptionLabel(signal: SignalCatalogItem): string {
  if (!signal.unit) return signal.label;
  const unit = UNIT_LABELS[signal.unit] ?? signal.unit;
  return `${signal.label} (${unit})`;
}

/**
 * Parse a quantitative manual-log value.
 * USD may use $ / K / M / B suffixes; other units (months, pct, …) must be plain numbers —
 * otherwise "12m" for months would incorrectly become 12,000,000.
 */
function parseQuantitativeValue(
  raw: string,
  unit: string | null,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (unit === "usd") {
    const clean = trimmed.replace(/[$,\s]/g, "");
    const bSuffix = /^([\d.]+)B$/i.exec(clean);
    if (bSuffix) {
      const n = Number(bSuffix[1]);
      return Number.isFinite(n) ? n * 1_000_000_000 : null;
    }
    const mSuffix = /^([\d.]+)M$/i.exec(clean);
    if (mSuffix) {
      const n = Number(mSuffix[1]);
      return Number.isFinite(n) ? n * 1_000_000 : null;
    }
    const kSuffix = /^([\d.]+)K$/i.exec(clean);
    if (kSuffix) {
      const n = Number(kSuffix[1]);
      return Number.isFinite(n) ? n * 1_000 : null;
    }
    if (!/^-?[\d.]+$/.test(clean)) return null;
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
  }

  // months / days / count / score / ratio / pct / unknown — digits only
  // (optional leading minus, optional %). No letter suffixes.
  const clean =
    unit === "pct"
      ? trimmed.replace(/[%\s,]/g, "")
      : trimmed.replace(/[\s,]/g, "");
  if (!/^-?[\d.]+$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export type ParsedManualObservation = {
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  valid: boolean;
};

export function parseManualObservationValue(
  signal: SignalCatalogItem,
  raw: string,
): ParsedManualObservation {
  const trimmed = raw.trim();
  if (signal.kind === "boolean") {
    if (trimmed === "true") {
      return { valueNumeric: null, valueText: null, valueBool: true, valid: true };
    }
    if (trimmed === "false") {
      return { valueNumeric: null, valueText: null, valueBool: false, valid: true };
    }
    return { valueNumeric: null, valueText: null, valueBool: null, valid: false };
  }
  if (signal.kind === "qualitative") {
    return {
      valueNumeric: null,
      valueText: trimmed || null,
      valueBool: null,
      valid: trimmed.length > 0,
    };
  }
  const valueNumeric = parseQuantitativeValue(trimmed, signal.unit);
  return {
    valueNumeric,
    valueText: null,
    valueBool: null,
    valid: valueNumeric !== null && Number.isFinite(valueNumeric),
  };
}

function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/** Placeholder / hint for the manual "Log intelligence" value field. */
export function manualObservationValuePlaceholder(
  signal: Pick<SignalCatalogItem, "kind" | "unit"> | null,
): string {
  if (!signal) return "Select a signal…";
  if (signal.kind === "qualitative") return "Value (free text)";
  if (signal.kind === "boolean") return "true / false";
  if (signal.unit) return `Value in ${signal.unit}`;
  return "Value";
}

export function formatSignalObservationValue(opts: {
  kind: SignalCatalogItem["kind"];
  unit: string | null;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
}): string {
  if (opts.kind === "boolean") {
    if (opts.valueBool === true) return "Yes";
    if (opts.valueBool === false) return "No";
    return "—";
  }
  if (opts.kind === "qualitative") {
    return opts.valueText?.trim() || "—";
  }
  if (opts.valueNumeric == null) return "—";
  switch (opts.unit) {
    case "usd":
      return formatUsd(opts.valueNumeric);
    case "pct":
      return `${Math.round(opts.valueNumeric * 10) / 10}%`;
    case "months":
      return `${opts.valueNumeric}mo`;
    case "days":
      return `${opts.valueNumeric}d`;
    case "ratio":
      return `${Math.round(opts.valueNumeric * 100) / 100}x`;
    case "count":
    case "score":
    default:
      return opts.valueNumeric.toLocaleString();
  }
}
