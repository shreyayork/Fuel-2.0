import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getServiceProvider, INTERNAL_ACCOUNT_ID } from "@/lib/service-providers";

const input = z.object({
  id: z.string(),
});

export const getServiceProviderSkill: Skill<z.infer<typeof input>> = {
  name: "getServiceProvider",
  title: "Get a service provider by id",
  description:
    "Fetch a single service-provider row. Internal-visibility providers are only returned for York IE account members.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ id }, ctx) {
    const row = await getServiceProvider(id);
    if (!row) return { provider: null };
    if (row.visibility === "internal" && ctx.accountId !== INTERNAL_ACCOUNT_ID) {
      return { provider: null };
    }
    return { provider: row };
  },
};
