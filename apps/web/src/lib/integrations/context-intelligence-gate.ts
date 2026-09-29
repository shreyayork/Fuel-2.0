/**
 * Pure gate for context_item upsert → intelligence pipeline.
 * Kept free of server-only so unit tests can import without Next runtime.
 */

function normalizeSourceText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Whether title/body meaningfully changed between the stored context item
 * and the incoming upsert payload. Trims only — no separate content-hash
 * helper exists elsewhere for this path.
 */
export function contextSourceContentChanged(
  previous: { title?: string | null; content?: string | null },
  next: { title?: string | null; content?: string | null },
): boolean {
  return (
    normalizeSourceText(previous.title) !== normalizeSourceText(next.title) ||
    normalizeSourceText(previous.content) !== normalizeSourceText(next.content)
  );
}

/**
 * Whether upsert should run the context intelligence pipeline.
 * Insert always runs; update runs when intel is missing (self-heal) or
 * source title/content meaningfully changed (F20A-254).
 */
export function shouldProcessContextIntelligenceAfterUpsert(opts: {
  inserted: boolean;
  hasExistingIntelligence: boolean;
  contentChanged?: boolean;
}): boolean {
  if (opts.inserted) return true;
  if (!opts.hasExistingIntelligence) return true;
  return Boolean(opts.contentChanged);
}

/**
 * Decide generate vs skip for an existing context_item's intelligence rows.
 * `replaceExisting` means delete-then-insert (content-change regen).
 */
export function contextIntelligenceGenerationAction(opts: {
  existingCount: number;
  replaceExisting: boolean;
}): "skip" | "generate" {
  if (opts.existingCount > 0 && !opts.replaceExisting) return "skip";
  return "generate";
}

/** @deprecated Prefer shouldProcessContextIntelligenceAfterUpsert */
export const shouldProcessHubspotIntelligenceAfterUpsert =
  shouldProcessContextIntelligenceAfterUpsert;
