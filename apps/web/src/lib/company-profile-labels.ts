import {
  BUSINESS_MODEL_LABELS,
  isBusinessModel,
  type BusinessModel,
} from "@/lib/business-model";

export function businessModelLabel(model: string | null | undefined): string | null {
  if (!model || !isBusinessModel(model)) return null;
  return BUSINESS_MODEL_LABELS[model as BusinessModel];
}

export function profileSourceLabel(raw: Record<string, unknown> | undefined): string {
  if (!raw) return "—";
  if (raw.source === "catalog") {
    const sources = raw.sources as Record<string, unknown> | undefined;
    const labels: string[] = [];
    if (sources?.website) labels.push("Website");
    if (sources?.linkedin) labels.push("LinkedIn");
    if (sources?.crunchbase) labels.push("Crunchbase");
    if (sources?.techStack) labels.push("Tech stack");
    return labels.length ? labels.join(" · ") : "Fuel catalog";
  }
  return "fuel-data";
}
