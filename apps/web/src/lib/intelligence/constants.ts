/**
 * Signal-catalog categories — source of truth for intelligence taxonomy.
 * Timeline filters are derived from data; this list validates writes / hints.
 */
export const INTELLIGENCE_CATEGORIES = [
  "board_reporting",
  "customer_success",
  "efficiency",
  "finance",
  "fundraising",
  "growth",
  "gtm",
  "product",
  "retention",
  "strategic",
  "team",
  "vendor_stack",
] as const;

export type IntelligenceCategory = (typeof INTELLIGENCE_CATEGORIES)[number];

export const DOCUMENT_INTELLIGENCE_CREDITS = 8;
/** Data Room upload auto-generates intelligence — same Bedrock work as Sources. */
export const DATA_ROOM_INTELLIGENCE_CREDITS = DOCUMENT_INTELLIGENCE_CREDITS;
export const SOURCE_INTELLIGENCE_CREDITS = DOCUMENT_INTELLIGENCE_CREDITS;

/**
 * Add-source generate gate:
 * - Document attached → description not required (title may be empty; filename used).
 * - No document → title + description both required (any non-empty length).
 */
export function canGenerateIntelligenceFromSource(opts: {
  title: string;
  notes: string;
  hasDocument: boolean;
}): boolean {
  if (opts.hasDocument) return true;
  return Boolean(opts.title.trim() && opts.notes.trim());
}

/** Hint text when generate is blocked. */
export function sourceGenerateBlockedReason(opts: {
  title: string;
  notes: string;
  hasDocument: boolean;
}): string | null {
  if (canGenerateIntelligenceFromSource(opts)) return null;
  const trimmedTitle = opts.title.trim();
  const trimmedNotes = opts.notes.trim();
  if (!trimmedTitle && !trimmedNotes) {
    return "Add a title and description, or attach a document.";
  }
  if (!trimmedTitle) {
    return "Title is required when generating from a description.";
  }
  return "Description is required when no document is attached.";
}

/** Document type → catalog categories the model should prioritize (not collapse). */
export const DOCUMENT_TYPE_CATEGORY_HINTS: Record<string, IntelligenceCategory[]> = {
  pitch_deck: ["fundraising", "growth", "team", "product"],
  investor_notes: ["fundraising", "finance", "strategic"],
  investment_memo: ["fundraising", "finance", "growth", "strategic"],
  board_deck: ["board_reporting", "finance", "growth", "team"],
  financial_model: ["finance", "efficiency"],
  cap_table: ["fundraising", "finance"],
  product_roadmap: ["product", "growth", "team"],
  customer_contract: ["customer_success", "retention", "gtm"],
  due_diligence: ["finance", "fundraising", "efficiency", "strategic"],
  custom: ["finance", "growth", "fundraising", "strategic"],
};

export function categoryHintsForDocumentType(typeId: string): IntelligenceCategory[] {
  if (typeId.startsWith("custom:")) {
    return DOCUMENT_TYPE_CATEGORY_HINTS.custom;
  }
  return DOCUMENT_TYPE_CATEGORY_HINTS[typeId] ?? [
    "finance",
    "growth",
    "fundraising",
    "efficiency",
    "strategic",
  ];
}
