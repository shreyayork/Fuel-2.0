/** Restrict benchmark metric fields to numeric input (digits + optional decimal). */
export function sanitizeBenchmarkNumericInput(raw: string): string {
  const normalized = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!normalized) return "";

  const [whole, ...fractionParts] = normalized.split(".");
  if (fractionParts.length === 0) return whole;
  return `${whole}.${fractionParts.join("")}`;
}

export function isBenchmarkNumericInputValid(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return /^(\d+(\.\d*)?|\.\d+)$/.test(trimmed.replace(/,/g, ""));
}
