import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { deleteServiceProvider } from "@/lib/service-providers";
import { assertSuperAdmin } from "./_guards";

const input = z.object({
  id: z.string(),
});

export const deleteServiceProviderSkill: Skill<z.infer<typeof input>> = {
  name: "deleteServiceProvider",
  title: "Delete a service provider",
  description: "Super-admin-only. Deletes a service-provider row by id.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ id }, ctx) {
    assertSuperAdmin(ctx);
    await deleteServiceProvider(id);
    return { ok: true };
  },
};
