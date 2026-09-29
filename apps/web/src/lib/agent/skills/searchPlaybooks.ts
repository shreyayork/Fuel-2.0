import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { searchPlaybooksByQuery } from "@/lib/playbooks";
import { embedText } from "@/lib/enrichment/embeddings";

const input = z.object({
  query: z
    .string()
    .min(3)
    .describe(
      "Natural-language description of what you want a playbook for, e.g. 'run diligence on a B2B SaaS seed deal' or 'structure a board deck'.",
    ),
  category: z
    .enum(["R&D", "GTM", "G&A", "Investing", "Founder", "Other"])
    .optional()
    .describe("Optional: restrict to playbooks in this top-level category."),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const searchPlaybooksSkill: Skill<
  z.infer<typeof input>,
  {
    query: string;
    results: Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      category: string;
      subcategory: string | null;
      targetKind: string | null;
      distance: number;
    }>;
    embeddingAvailable: boolean;
  }
> = {
  name: "searchPlaybooks",
  title: "Find relevant playbooks by intent",
  description:
    "Embed a query via Titan v2 and return the most semantically-similar playbooks (global + this account's own) using pgvector cosine distance. Use this whenever you need structured guidance on a task (diligence, GTM, hiring, board prep, etc.) — pick the best hit and load it with getPlaybook. Designed to scale to thousands of playbooks without stuffing the catalog into the prompt.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ query, category, limit }, ctx) {
    const embedding = await embedText(query);
    if (!embedding) return { query, results: [], embeddingAvailable: false };
    const results = await searchPlaybooksByQuery({
      accountId: ctx.accountId,
      embedding,
      category,
      limit,
    });
    return { query, results, embeddingAvailable: true };
  },
};
