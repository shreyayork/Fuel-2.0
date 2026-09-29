import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { bookmarkInvestor, unbookmarkInvestor } from "@/lib/investors";

const input = z.object({
  investorId: z.string(),
  investorName: z.string().min(1),
  remove: z.boolean().default(false).describe("Pass true to unbookmark instead of bookmarking."),
});

export const bookmarkInvestorSkill: Skill<z.infer<typeof input>> = {
  name: "bookmarkInvestor",
  title: "Bookmark or unbookmark an investor",
  description:
    "Bookmark an investor for the caller's account (so it appears on /investors Bookmarked). Pass remove=true to unbookmark.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ investorId, investorName, remove }, ctx) {
    if (remove) {
      await unbookmarkInvestor({ accountId: ctx.accountId, investorId });
      return { ok: true, removed: true };
    }
    await bookmarkInvestor({
      accountId: ctx.accountId,
      investorId,
      investorName,
      addedByEmail: ctx.userEmail,
    });
    return { ok: true, removed: false };
  },
};
