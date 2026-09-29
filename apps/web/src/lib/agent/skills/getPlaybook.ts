import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getPlaybookById, getPlaybookBySlug } from "@/lib/playbooks";

const input = z.object({
  idOrSlug: z
    .string()
    .describe("Playbook id (starts with pb_…) or slug (e.g. initial-deal-screen)."),
});

export const getPlaybookSkill: Skill<
  z.infer<typeof input>,
  {
    found: boolean;
    playbook?: {
      id: string;
      slug: string;
      title: string;
      description: string;
      category: string;
      subcategory: string | null;
      content: string;
      targetKind: string | null;
      tags: string[] | null;
    };
  }
> = {
  name: "getPlaybook",
  title: "Load a playbook's full content",
  description:
    "Load the full markdown content of a playbook by id or slug. Call this after searchPlaybooks picks a winner — don't dump every playbook into the prompt pre-emptively.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ idOrSlug }, ctx) {
    const row = idOrSlug.startsWith("pb_")
      ? await getPlaybookById({ id: idOrSlug, accountId: ctx.accountId })
      : await getPlaybookBySlug({ slug: idOrSlug, accountId: ctx.accountId });
    if (!row) return { found: false };
    return {
      found: true,
      playbook: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        category: row.category,
        subcategory: row.subcategory,
        content: row.content,
        targetKind: row.targetKind,
        tags: row.tags ?? null,
      },
    };
  },
};
