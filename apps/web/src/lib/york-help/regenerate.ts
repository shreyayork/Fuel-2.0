import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companyInitiatives, initiativeMilestones } from "@/db/schema";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  coerceYorkHelpCategory,
  yorkHelpContentHash,
  type YorkHelpInitiativeInput,
} from "./fallback";
import { generateYorkHelpForInitiative } from "./generate";
import type { YorkHelp } from "./types";

function isDismissed(opts: {
  dismissForever: boolean;
  dismissedUntil: Date | null;
}): boolean {
  if (opts.dismissForever) return true;
  if (!opts.dismissedUntil) return false;
  return opts.dismissedUntil.getTime() > Date.now();
}

/**
 * Background: load initiative, skip if dismissed/unchanged/empty, generate york_help, persist.
 */
export async function regenerateYorkHelpForInitiative(opts: {
  accountId: string;
  initiativeId: string;
  companyName?: string | null;
  force?: boolean;
}): Promise<YorkHelp | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.id, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    )
    .limit(1);
  if (!row) return null;

  if (
    !opts.force &&
    isDismissed({
      dismissForever: row.yorkHelpDismissForever,
      dismissedUntil: row.yorkHelpDismissedUntil,
    })
  ) {
    return row.yorkHelp;
  }

  const milestones = await db
    .select({
      label: initiativeMilestones.label,
      dueDate: initiativeMilestones.dueDate,
      status: initiativeMilestones.status,
      note: initiativeMilestones.note,
    })
    .from(initiativeMilestones)
    .where(eq(initiativeMilestones.initiativeId, opts.initiativeId));

  const categoryId = coerceYorkHelpCategory(row.overviewCategoryId, row.area);
  const input: YorkHelpInitiativeInput = {
    companyName: opts.companyName ?? null,
    initiativeTitle: row.name,
    description: row.description,
    kind: row.kind,
    categoryId,
    owners: Array.isArray(row.assignees) && row.assignees.length > 0 ? row.assignees : [row.ownerEmail],
    due: row.due,
    status: row.status,
    milestones: milestones.map((m) => ({
      title: m.label,
      dueDate: m.dueDate,
      done: m.status === "done",
      note: m.note,
    })),
    progress: {
      baselineTitle:
        row.intelligenceLinks.find((l) => l.role === "baseline")?.title ?? null,
      currentTitle:
        row.intelligenceLinks.find((l) => l.role === "current")?.title ?? null,
    },
  };

  if (!input.initiativeTitle.trim() && input.milestones.length === 0) {
    return null;
  }

  const hash = yorkHelpContentHash(input);
  if (!opts.force && row.yorkHelpContentHash === hash && row.yorkHelp) {
    return row.yorkHelp;
  }

  await db
    .update(companyInitiatives)
    .set({ yorkHelpStatus: "generating", updatedAt: new Date() })
    .where(
      and(
        eq(companyInitiatives.id, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    );

  try {
    const { help } = await generateYorkHelpForInitiative(input);
    await db
      .update(companyInitiatives)
      .set({
        yorkHelp: help,
        yorkHelpStatus: "ready",
        yorkHelpContentHash: hash,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyInitiatives.id, opts.initiativeId),
          eq(companyInitiatives.accountId, opts.accountId),
        ),
      );
    return help;
  } catch (error) {
    captureIntegrationException(error, {
      integration: "bedrock",
      operation: "york_help_regenerate",
      context: { initiativeId: opts.initiativeId },
    });
    await db
      .update(companyInitiatives)
      .set({ yorkHelpStatus: "failed", updatedAt: new Date() })
      .where(
        and(
          eq(companyInitiatives.id, opts.initiativeId),
          eq(companyInitiatives.accountId, opts.accountId),
        ),
      );
    return null;
  }
}
