import {
  INTELLIGENCE_CATEGORIES,
  type IntelligenceCategory,
} from "./constants";

/** Normalize catalog category keys. Does not collapse into legacy six buckets. */
export function normalizeIntelligenceCategory(category: string): string {
  return category.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Resolve a signal-catalog category for storage / filtering.
 * Passes through catalog categories as-is (after normalize).
 * Unknown custom categories are preserved rather than mapped away.
 */
export function signalCategoryToIntelligenceCategory(
  signalCategory: string,
): IntelligenceCategory {
  const key = normalizeIntelligenceCategory(signalCategory);
  if (INTELLIGENCE_CATEGORIES.includes(key as IntelligenceCategory)) {
    return key as IntelligenceCategory;
  }
  // Preserve unknown account/custom categories without collapsing to "growth".
  return key as IntelligenceCategory;
}

export function isIntelligenceCategory(value: string): value is IntelligenceCategory {
  return INTELLIGENCE_CATEGORIES.includes(
    normalizeIntelligenceCategory(value) as IntelligenceCategory,
  );
}
