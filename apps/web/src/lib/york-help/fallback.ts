import "server-only";
import { createHash } from "node:crypto";
import {
  catalogFallbackYorkHelp,
  resolveYorkHelpCategoryId,
  type YorkHelpCategoryId,
  type YorkHelpServiceCatalog,
} from "./catalog";
import type { YorkHelp } from "./types";

export type YorkHelpMilestoneInput = {
  title: string;
  dueDate?: string | null;
  done?: boolean;
  note?: string | null;
};

export type YorkHelpInitiativeInput = {
  companyName?: string | null;
  initiativeTitle: string;
  description?: string | null;
  kind?: string | null;
  categoryId: YorkHelpCategoryId;
  topicLabel?: string | null;
  owners?: string[];
  due?: string | null;
  status?: string | null;
  milestones: YorkHelpMilestoneInput[];
  advisors?: Array<{ name: string; title?: string | null }>;
  progress?: { baselineTitle?: string | null; currentTitle?: string | null };
};

/** Stable hash of fields that should trigger York help regeneration. */
export function yorkHelpContentHash(input: YorkHelpInitiativeInput): string {
  const payload = {
    title: input.initiativeTitle.trim(),
    description: (input.description ?? "").trim(),
    kind: input.kind ?? "",
    categoryId: input.categoryId,
    topicLabel: input.topicLabel ?? "",
    owners: [...(input.owners ?? [])].map((o) => o.trim()).filter(Boolean).sort(),
    due: input.due ?? "",
    status: input.status ?? "",
    milestones: input.milestones.map((m) => ({
      title: m.title.trim(),
      dueDate: m.dueDate ?? null,
      done: Boolean(m.done),
      note: m.note ?? null,
    })),
    advisors: (input.advisors ?? []).map((a) => ({
      name: a.name.trim(),
      title: a.title ?? null,
    })),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

function seedFromTitle(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Deterministic fallback when Bedrock fails — 1–2 catalog services with approved outcomes. */
export function buildLegacyYorkHelp(
  input: YorkHelpInitiativeInput,
  catalog?: YorkHelpServiceCatalog,
): YorkHelp {
  return catalogFallbackYorkHelp(
    input.categoryId,
    seedFromTitle(input.initiativeTitle),
    catalog,
  );
}

export function coerceYorkHelpCategory(
  overviewCategoryId: string | null | undefined,
  area?: string | null,
): YorkHelpCategoryId {
  return resolveYorkHelpCategoryId(overviewCategoryId, area);
}
