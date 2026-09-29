import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companyIntelligence, type ContextItem } from "@/db/schema";
import { generateIntelligenceFromContextItem } from "@/lib/intelligence/generate";
import { resolveCompanyName } from "@/lib/intelligence/resolve-company";
import { enqueueContextInitiativeGeneration } from "@/lib/initiatives/from-document";
import { captureIntegrationException } from "@/lib/sentry/capture";

export {
  contextIntelligenceGenerationAction,
  contextSourceContentChanged,
  shouldProcessContextIntelligenceAfterUpsert,
  shouldProcessHubspotIntelligenceAfterUpsert,
} from "./context-intelligence-gate";

export type ContextIntelligenceSource = "hubspot" | "granola";

/** Discrete existence check — used before update-path reprocessing. */
export async function hasCompanyIntelligenceForContextItem(opts: {
  accountId: string;
  contextItemId: string;
}): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: companyIntelligence.id })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.contextItemId, opts.contextItemId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export type ProcessContextIntelligenceOpts = {
  integration: ContextIntelligenceSource;
  source: string;
  generationPath: string;
  documentType: string;
  defaultTitle: string;
  authorEmailFallback: string;
  /**
   * When true, delete prior company_intelligence for this context item then
   * regenerate (source content changed). Initiatives stay idempotent.
   */
  replaceExisting?: boolean;
};

/**
 * After a context_item insert (or update missing intel / content change):
 * generate company_intelligence then enqueue draft initiatives.
 * Does not run signal observation extract — callers own that separately.
 * Initiative failures never roll back intelligence.
 */
export async function processContextItemIntelligence(
  item: ContextItem,
  opts: ProcessContextIntelligenceOpts,
): Promise<void> {
  if (!item.companyUuid) return;

  const companyUuid = item.companyUuid;
  const authorEmail = item.authorEmail?.trim() || opts.authorEmailFallback;

  let intelligenceIds: string[] = [];
  try {
    const companyName = await resolveCompanyName(companyUuid);
    const result = await generateIntelligenceFromContextItem({
      accountId: item.accountId,
      companyUuid,
      companyName,
      authorEmail,
      contextItemId: item.id,
      title: item.title ?? "",
      content: item.content ?? "",
      source: opts.source,
      generationPath: opts.generationPath,
      documentType: opts.documentType,
      defaultTitle: opts.defaultTitle,
      replaceExisting: opts.replaceExisting,
    });
    intelligenceIds = result.intelligenceIds;
  } catch (e) {
    captureIntegrationException(e, {
      integration: opts.integration,
      operation: `${opts.integration}_intelligence_generation`,
      level: "warning",
      context: {
        contextItemId: item.id,
        companyUuid,
        replaceExisting: Boolean(opts.replaceExisting),
      },
    });
    return;
  }

  if (intelligenceIds.length === 0) return;

  try {
    await enqueueContextInitiativeGeneration({
      accountId: item.accountId,
      companyUuid,
      userEmail: authorEmail,
      contextItemId: item.id,
      source: opts.integration,
    });
  } catch (e) {
    captureIntegrationException(e, {
      integration: opts.integration,
      operation: `${opts.integration}_initiative_enqueue`,
      level: "warning",
      context: { contextItemId: item.id, companyUuid },
    });
  }
}

function activityKindFromSource(source: string): "note" | "email" {
  return source.includes(":email:") ? "email" : "note";
}

/**
 * After a HubSpot activity context_item insert (or update missing intel /
 * content change): generate company_intelligence then enqueue draft initiatives.
 * Skips signal observation extract (F20A-190).
 */
export async function processHubspotActivityIntelligence(
  item: ContextItem,
  opts?: { replaceExisting?: boolean },
): Promise<void> {
  if (!item.companyUuid) return;
  if (item.kind !== "hubspot_activity") return;

  const activityKind = activityKindFromSource(item.source);
  await processContextItemIntelligence(item, {
    integration: "hubspot",
    source: "hubspot",
    generationPath: "hubspot",
    documentType:
      activityKind === "email" ? "hubspot_email" : "hubspot_note",
    defaultTitle:
      activityKind === "email" ? "HubSpot email" : "HubSpot note",
    authorEmailFallback: "hubspot-sync@fuel",
    replaceExisting: opts?.replaceExisting,
  });
}

/**
 * After a Granola meeting context_item insert (or update missing intel /
 * content change): generate company_intelligence then enqueue draft initiatives.
 * Signal extraction remains the caller's responsibility (onContextItemCreated).
 */
export async function processGranolaMeetingIntelligence(
  item: ContextItem,
  opts?: { replaceExisting?: boolean },
): Promise<void> {
  if (!item.companyUuid) return;
  if (item.kind !== "meeting_transcript") return;
  if (!item.source.startsWith("granola:")) return;

  await processContextItemIntelligence(item, {
    integration: "granola",
    source: "granola",
    generationPath: "granola",
    documentType: "granola_meeting",
    defaultTitle: "Granola meeting",
    authorEmailFallback: "granola-sync@fuel",
    replaceExisting: opts?.replaceExisting,
  });
}
