import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import {
  upsertServiceProvider,
  SERVICE_PROVIDER_CATEGORIES,
  SERVICE_PROVIDER_VISIBILITIES,
} from "@/lib/service-providers";
import { assertSuperAdmin } from "./_guards";

const CATEGORY_ENUM = [...SERVICE_PROVIDER_CATEGORIES] as [string, ...string[]];
const VISIBILITY_ENUM = [...SERVICE_PROVIDER_VISIBILITIES] as [string, ...string[]];

const input = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.enum(CATEGORY_ENUM),
  visibility: z.enum(VISIBILITY_ENUM).default("global"),
  description: z.string().optional(),
  domain: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const upsertServiceProviderSkill: Skill<z.infer<typeof input>> = {
  name: "upsertServiceProvider",
  title: "Create or update a service provider",
  description:
    "Super-admin-only. Inserts a new row when id is omitted, otherwise updates the existing one. Pass visibility='internal' to restrict to York IE.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute(args, ctx) {
    assertSuperAdmin(ctx);
    const { id, ...values } = args;
    const row = await upsertServiceProvider({
      id,
      curatedByEmail: ctx.userEmail,
      values: values as Parameters<typeof upsertServiceProvider>[0]["values"],
    });
    return { provider: row };
  },
};
