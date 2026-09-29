import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { upsertUpdate, currentPeriod } from "@/lib/portfolio-updates";

const input = z.object({
  companyUuid: z.string().describe("fuel-data or catalog UUID"),
  period: z
    .string()
    .optional()
    .describe("Quarter identifier like '2026-q2'. Defaults to the current quarter."),
  status: z.enum(["draft", "submitted"]).default("draft"),
  asOf: z.string().optional(),

  fteCount: z.number().int().optional(),
  paidCustomerCount: z.number().int().optional(),
  arrUsd: z.number().optional(),
  arrGrowthYoyPct: z.number().optional(),
  nrrPct: z.number().optional(),
  logoRetentionPct: z.number().optional(),
  grossMarginPct: z.number().optional(),
  cacPaybackMonths: z.number().optional(),
  burnMultiple: z.number().optional(),
  ruleOf40Pct: z.number().optional(),
  cashOnHandUsd: z.number().optional(),
  monthlyBurnUsd: z.number().optional(),

  notableCustomers: z.string().optional(),
  notableHires: z.string().optional(),
  otherUpdates: z.string().optional(),
  challenges: z.string().optional(),

  bankingPartner: z.string().optional(),
  legalCounsel: z.string().optional(),
  cloudProvider: z.string().optional(),
  capTablePlatform: z.string().optional(),
  doInsuranceProvider: z.string().optional(),
  crmPlatform: z.string().optional(),

  openToInvestorIntros: z.boolean().optional(),
});

export const upsertPortfolioUpdateSkill: Skill<z.infer<typeof input>> = {
  name: "upsertPortfolioUpdate",
  title: "Save a draft quarterly portfolio update",
  description:
    "Save a quarterly portfolio update as a DRAFT for the founder to review later. One row per (account, company, period). This skill cannot mark an update as submitted — only the in-app Edit Benchmark drawer, where a human explicitly enters numbers, can mark an update verified. AI-saved drafts do NOT contribute to the global benchmark cohort dataset.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute(args, ctx) {
    const { period, status: requestedStatus, ...rest } = args;
    // Hard guard: regardless of what the model passes, agent-driven writes
    // are always drafts. The only path that can mint `status='submitted'`
    // is the Overview Edit Benchmark drawer (also opened from the KPI
    // Benchmark playbook CTA), where each value is entered by a human.
    // This is the load-bearing invariant for the benchmark dataset.
    if (requestedStatus === "submitted") {
      console.warn(
        `[upsertPortfolioUpdate] agent tried status='submitted' for company=${rest.companyUuid} — demoting to draft`,
      );
    }
    const row = await upsertUpdate({
      accountId: ctx.accountId,
      companyUuid: rest.companyUuid,
      period: period ?? currentPeriod(),
      asOf: rest.asOf ?? null,

      fteCount: rest.fteCount ?? null,
      paidCustomerCount: rest.paidCustomerCount ?? null,
      arrUsd: rest.arrUsd ?? null,
      arrGrowthYoyPct: rest.arrGrowthYoyPct ?? null,
      nrrPct: rest.nrrPct ?? null,
      logoRetentionPct: rest.logoRetentionPct ?? null,
      grossMarginPct: rest.grossMarginPct ?? null,
      cacPaybackMonths: rest.cacPaybackMonths ?? null,
      burnMultiple: rest.burnMultiple ?? null,
      ruleOf40Pct: rest.ruleOf40Pct ?? null,
      cashOnHandUsd: rest.cashOnHandUsd ?? null,
      monthlyBurnUsd: rest.monthlyBurnUsd ?? null,

      notableCustomers: rest.notableCustomers ?? null,
      notableHires: rest.notableHires ?? null,
      otherUpdates: rest.otherUpdates ?? null,
      challenges: rest.challenges ?? null,

      bankingPartner: rest.bankingPartner ?? null,
      legalCounsel: rest.legalCounsel ?? null,
      cloudProvider: rest.cloudProvider ?? null,
      capTablePlatform: rest.capTablePlatform ?? null,
      doInsuranceProvider: rest.doInsuranceProvider ?? null,
      crmPlatform: rest.crmPlatform ?? null,

      openToInvestorIntros: rest.openToInvestorIntros ?? false,

      submittedByEmail: ctx.userEmail,
      // Force-demote: agents can only save drafts. See the guard above.
      status: "draft",
    });
    return { update: row };
  },
};
