import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { deleteContextItem } from "@/lib/context";

const input = z.object({
  id: z.string(),
});

export const deleteContextItemSkill: Skill<z.infer<typeof input>> = {
  name: "deleteContextItem",
  title: "Delete a context item",
  description:
    "Delete a context item by id. Scoped to the caller's account — attempts to delete another account's items are silent no-ops.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ id }, ctx) {
    await deleteContextItem({ accountId: ctx.accountId, id });
    return { ok: true };
  },
};
