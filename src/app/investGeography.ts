export const INVEST_GEOGRAPHY_OPTIONS = [
  { label: "United States", desc: "US-headquartered companies" },
  { label: "Canada", desc: "Canadian companies" },
  { label: "Mexico", desc: "Mexican companies" },
  { label: "Europe", desc: "EU, UK, and nearby markets" },
  { label: "Global", desc: "No geography filter" },
] as const;

export function normalizeInvestGeographyLabel(label: string): string {
  if (label === "North America" || label === "Canada & Mexico") return "Canada";
  return label;
}

export function normalizeInvestGeographySelection(geography: string | string[]): string[] {
  const raw = Array.isArray(geography) ? geography : geography ? [geography] : [];
  const expanded = raw.flatMap(item => {
    if (item === "North America" || item === "Canada & Mexico") return ["Canada", "Mexico"];
    return [normalizeInvestGeographyLabel(item)];
  });
  return [...new Set(expanded.filter(Boolean))];
}

/** @deprecated Use normalizeInvestGeographySelection */
export function normalizeInvestGeography(geography: string): string {
  return normalizeInvestGeographySelection(geography)[0] ?? "";
}

export function investGeographyDisplayLabel(geography: string | string[]): string {
  const list = normalizeInvestGeographySelection(geography);
  if (!list.length) return "";
  if (list.includes("Global")) return "Global";
  if (list.length <= 2) return list.join(" · ");
  return `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
}

export function dealMatchesInvestGeography(dealGeo: string, geography: string | string[]): boolean {
  const selected = normalizeInvestGeographySelection(geography);
  if (!selected.length || selected.includes("Global")) return true;
  if (dealGeo === "Canada & Mexico") {
    return selected.includes("Canada") || selected.includes("Mexico");
  }
  return selected.includes(dealGeo);
}
