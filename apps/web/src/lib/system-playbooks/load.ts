import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playbooks } from "@/db/schema";

export type SystemPlaybookTemplate = {
  playbookId: string | null;
  template: string;
};

/**
 * Load a system playbook prompt template from the DB, with code fallback.
 * Mirrors {@link loadOverviewPromptTemplate} — prefers `is_system=true` rows.
 */
export async function loadSystemPlaybookTemplate(
  slug: string,
  defaultTemplate: string,
): Promise<SystemPlaybookTemplate> {
  const db = await getDb();
  const [systemRow] = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.slug, slug), eq(playbooks.isSystem, true)))
    .limit(1);

  if (systemRow?.content) {
    return { playbookId: systemRow.id, template: systemRow.content };
  }

  const [fallback] = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.slug, slug))
    .limit(1);

  return {
    playbookId: fallback?.id ?? null,
    template: fallback?.content ?? defaultTemplate,
  };
}
