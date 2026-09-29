import type { IntelligenceCategory } from "./constants";

export interface CompanyIntelligenceRow {
  id: string;
  companyUuid: string;
  category: IntelligenceCategory;
  headline: string;
  keyDetail: string | null;
  summary: string;
  confidence: number;
  source: string;
  generationPath: string | null;
  period: string | null;
  contextItemId: string | null;
  documentVersionId: string | null;
  documentLabel: string | null;
  rawSnippet: string | null;
  isBenchmark: boolean;
  authorEmail: string | null;
  createdAt: string;
  /** Catalog signal id when known (metadata / observation). Used to group link options. */
  signalId?: string | null;
  /** Overview track (`dev` | `mkt` | `rev`) from metadata — used to label form sources. */
  overviewCategory?: string | null;
  /** Optional model hint stored on overview intel (`profile` | `form` | `document`). */
  evidenceSource?: string | null;
}

export interface ExtractedIntelligenceItem {
  category: IntelligenceCategory;
  /** Always the catalog signal label — never freeform. */
  headline: string;
  /** Display value formatted from the typed field that matches signal.kind. */
  key_detail: string;
  summary: string;
  raw_snippet: string;
  /** Catalog signal id used for grounding / metadata. */
  signal_id: string;
  /** Typed value matching signal.kind — null for fields that do not apply. */
  value_numeric: number | null;
  value_text: string | null;
  value_bool: boolean | null;
}

export interface IntelligenceGenerationResult {
  intelligenceIds: string[];
  creditsCharged: number;
  creditBalance?: number;
}
