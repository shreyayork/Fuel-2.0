import type { OverviewCategoryId } from "./constants";

export type SnapshotTier = "top" | "upper" | "mid" | "lower" | "bottom";

export interface FullSummarySnapshotRow {
  id: string;
  label: string;
  you: string;
  colour: string;
  p25: string;
  p50: string;
  p75: string;
  p90: string;
  band: string;
  tier: SnapshotTier;
  isStrong: boolean;
}

export interface FullSummaryProfileMeta {
  sector: string | null;
  headquarters: string | null;
  employees: string | null;
  domain: string | null;
}

export interface FullSummaryOperatingRow {
  id: string;
  label: string;
  value: string;
}

export interface FullSummaryOperatingGroup {
  id: OverviewCategoryId;
  label: string;
  rows: FullSummaryOperatingRow[];
}

export interface FullSummaryInitiative {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due: string | null;
  owner: string | null;
  pillar: OverviewCategoryId;
}

export interface FullSummaryDocument {
  typeId: string;
  typeLabel: string;
  name: string;
}

export interface FullSummaryReference {
  id: number;
  label: string;
  detail: string;
  kind: "benchmark" | "profile" | "intelligence" | "document" | "detail";
}

export interface FullSummaryBriefAnalysis {
  cohortPosition: { paragraphs: string[] };
  areasToWatch: Array<{ title: string; detail: string }>;
}

export interface FullSummaryPayload {
  companyName: string;
  reportDate: string;
  period: string;
  cohortLabel: string;
  profileMeta: FullSummaryProfileMeta;
  productDescription: string | null;
  topPriorities: string | null;
  biggestRisk: string | null;
  publicDataCorrections: string | null;
  snapshotRows: FullSummarySnapshotRow[];
  cashOnHand: { display: string; colour: string } | null;
  monthlyBurn: { display: string; colour: string } | null;
  runwayMonths: number | null;
  operatingGroups: FullSummaryOperatingGroup[];
  initiatives: FullSummaryInitiative[];
  documents: FullSummaryDocument[];
  references: FullSummaryReference[];
  analysis: FullSummaryBriefAnalysis | null;
  analysisStatus: "ready" | "skipped" | "error" | "loading";
  analysisError: string | null;
  categories: Array<{
    categoryId: OverviewCategoryId;
    label: string;
    fullLabel: string;
    definition: string;
  }>;
}
