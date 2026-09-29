import "server-only";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playbooks } from "@/db/schema";
import { isOverviewCategoryId, type OverviewCategoryId } from "./constants";
import type { OverviewAiResponse } from "./types";

export type OverviewPlaybookCatalogEntry = {
  slug: string;
  title: string;
  description: string;
  category: string;
  category_id: OverviewCategoryId | null;
};

export type ResolvedPlaybookSuggestion = {
  playbook_slug: string;
  playbookId: string;
  reason: string;
  category_id: OverviewCategoryId;
};

/** Map catalog playbook.category → overview track id. */
export function mapPlaybookCategoryToOverview(
  category: string,
): OverviewCategoryId | null {
  const c = category.trim().toLowerCase();
  if (c === "r&d" || c === "rd" || c === "product" || c.includes("engineering")) {
    return "dev";
  }
  if (c === "gtm" || c === "go-to-market" || c.includes("marketing") || c.includes("sales")) {
    return "mkt";
  }
  if (c === "g&a" || c === "ga" || c.includes("finance")) {
    return "rev";
  }
  return null;
}

/** Visible, non-system playbooks the model may suggest. */
export async function loadOverviewPlaybookCatalog(opts: {
  accountId: string;
}): Promise<OverviewPlaybookCatalogEntry[]> {
  const db = await getDb();
  const rows = await db
    .select({
      slug: playbooks.slug,
      title: playbooks.title,
      description: playbooks.description,
      category: playbooks.category,
    })
    .from(playbooks)
    .where(
      and(
        eq(playbooks.isSystem, false),
        eq(playbooks.isVisible, true),
        or(isNull(playbooks.accountId), eq(playbooks.accountId, opts.accountId)),
      ),
    )
    .orderBy(asc(playbooks.category), asc(playbooks.title));

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    category_id: mapPlaybookCategoryToOverview(r.category),
  }));
}

async function loadPlaybookIdBySlug(
  slug: string,
  accountId: string,
): Promise<{ id: string; category: string } | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: playbooks.id, category: playbooks.category })
    .from(playbooks)
    .where(
      and(
        eq(playbooks.slug, slug),
        eq(playbooks.isSystem, false),
        eq(playbooks.isVisible, true),
        or(isNull(playbooks.accountId), eq(playbooks.accountId, accountId)),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Validate AI suggestions against the catalog. If none survive, pick 1–2
 * track-aligned playbooks per category so the UI is never empty.
 */
export async function resolveSuggestedPlaybooks(opts: {
  accountId: string;
  catalog: OverviewPlaybookCatalogEntry[];
  suggested: OverviewAiResponse["suggested_playbooks"];
}): Promise<ResolvedPlaybookSuggestion[]> {
  const bySlug = new Map(opts.catalog.map((p) => [p.slug, p]));
  const resolved: ResolvedPlaybookSuggestion[] = [];
  const seen = new Set<string>();

  for (const sug of opts.suggested) {
    const slug = sug.playbook_slug?.trim();
    if (!slug || seen.has(slug)) continue;
    const entry = bySlug.get(slug);
    if (!entry) continue;

    const categoryId = isOverviewCategoryId(sug.category_id)
      ? sug.category_id
      : entry.category_id;
    if (!categoryId) continue;

    const pb = await loadPlaybookIdBySlug(slug, opts.accountId);
    if (!pb) continue;

    seen.add(slug);
    resolved.push({
      playbook_slug: slug,
      playbookId: pb.id,
      reason: sug.reason?.trim() || `Recommended for ${categoryId.toUpperCase()} context.`,
      category_id: categoryId,
    });
  }

  if (resolved.length > 0) return resolved;

  // Deterministic fallback — 1–2 per track from catalog.
  for (const categoryId of ["dev", "mkt", "rev"] as const) {
    const picks = opts.catalog
      .filter((p) => p.category_id === categoryId)
      .slice(0, 2);
    for (const pick of picks) {
      if (seen.has(pick.slug)) continue;
      const pb = await loadPlaybookIdBySlug(pick.slug, opts.accountId);
      if (!pb) continue;
      seen.add(pick.slug);
      resolved.push({
        playbook_slug: pick.slug,
        playbookId: pb.id,
        reason: `Suggested for ${categoryId === "dev" ? "R&D" : categoryId === "mkt" ? "GTM" : "G&A"} based on your overview.`,
        category_id: categoryId,
      });
    }
  }

  return resolved;
}
