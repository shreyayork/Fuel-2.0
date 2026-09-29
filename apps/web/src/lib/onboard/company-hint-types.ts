export type CompanyHintSource = "override" | "fuel-data" | "heuristic" | "none";

export interface CompanyHint {
  domain: string;
  name: string | null;
  source: CompanyHintSource;
  fuelDataUuid?: string;
}
