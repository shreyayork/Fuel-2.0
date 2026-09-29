import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listServiceProviders, SERVICE_PROVIDER_CATEGORIES } from "@/lib/service-providers";

const CATEGORY_ENUM = [...SERVICE_PROVIDER_CATEGORIES] as [string, ...string[]];

const input = z.object({
  category: z.enum(CATEGORY_ENUM).optional(),
  tag: z.string().optional().describe("Filter to providers tagged with this exact value."),
});

export const listServiceProvidersSkill: Skill<z.infer<typeof input>> = {
  name: "listServiceProviders",
  title: "List curated service providers",
  description:
    "Return the service-provider directory visible to the caller (global + internal if York IE). Optionally filter by category or tag.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ category, tag }, ctx) {
    const rows = await listServiceProviders({
      accountId: ctx.accountId,
      category: category as Parameters<typeof listServiceProviders>[0]["category"],
      tag,
    });
    return { providers: rows };
  },
};
