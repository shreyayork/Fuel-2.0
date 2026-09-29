import type { OnboardingStep } from "./types";

export const ROUND_TYPES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Bridge",
  "Grant",
  "Angel",
  "Convertible Note",
] as const;

export const INTEGRATION_OPTIONS = [
  { id: "jira", name: "Jira", category: "Development", abbr: "JR", color: "#2684FF" },
  { id: "linear", name: "Linear", category: "Development", abbr: "LN", color: "#5E6AD2" },
  { id: "launchpad", name: "Launchpad", category: "Development", abbr: "LP", color: "#3DD68C", york: true },
  { id: "pulse", name: "Pulse", category: "Development", abbr: "PL", color: "#3DD68C", york: true },
  { id: "ga4", name: "Google Analytics", category: "Marketing", abbr: "GA", color: "#F9AB00" },
  { id: "gads", name: "Google Ads", category: "Marketing", abbr: "Gd", color: "#4285F4" },
  { id: "semrush", name: "Semrush", category: "Marketing", abbr: "SR", color: "#FF642D" },
  { id: "linkedin", name: "LinkedIn", category: "Marketing", abbr: "in", color: "#0A66C2" },
  { id: "meta", name: "Meta Ads", category: "Marketing", abbr: "Fb", color: "#1877F2" },
  { id: "hubspot", name: "HubSpot", category: "RevOps", abbr: "HS", color: "#FF7A59" },
  { id: "salesforce", name: "Salesforce", category: "RevOps", abbr: "SF", color: "#00A1E0" },
  { id: "quickbooks", name: "QuickBooks", category: "FinOps", abbr: "QB", color: "#2CA01C" },
  { id: "stripe", name: "Stripe", category: "FinOps", abbr: "St", color: "#635BFF" },
] as const;

export const PROGRESS_ITEMS = [
  { id: "profile", label: "Your company profile", step: "crunchbase-fetching" as OnboardingStep },
  { id: "benchmarks", label: "Your growth benchmarks", step: "benchmark" as OnboardingStep },
  { id: "tracks", label: "Your Fuel journey tracks", step: "fuel-value" as OnboardingStep },
  { id: "integrations", label: "Your York IE projects", step: "york-link" as OnboardingStep },
  { id: "config", label: "Your workspace config", step: "done" as OnboardingStep },
] as const;

export function progressItemsForFlow(showYorkProjectsStep: boolean) {
  if (showYorkProjectsStep) return PROGRESS_ITEMS;
  return PROGRESS_ITEMS.filter((item) => item.id !== "integrations");
}

export const STAGE_ORDER: OnboardingStep[] = [
  "greeting",
  "company-confirm",
  "company-name",
  "crunchbase-fetching",
  "crunchbase-confirm",
  "benchmark",
  "fuel-value",
  "york-services",
  "york-link",
  "platform-overview",
  "claiming",
  "done",
];

export function stepIndex(s: OnboardingStep): number {
  return STAGE_ORDER.indexOf(s);
}

let seq = 0;
export function uid(): string {
  return `${Date.now()}-${++seq}-${Math.random().toString(36).slice(2)}`;
}
