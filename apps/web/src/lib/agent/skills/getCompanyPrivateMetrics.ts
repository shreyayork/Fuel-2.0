import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listForCompany } from "@/lib/portfolio-updates";

const input = z.object({
  companyUuid: z.string().describe("fuel-data UUID or cat_-prefixed catalog UUID."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(40)
    .optional()
    .default(12)
    .describe("Number of most-recent periods to return. Default 12 (~3 years quarterly)."),
});

export const getCompanyPrivateMetricsSkill: Skill<
  z.infer<typeof input>,
  {
    companyUuid: string;
    history: Array<{
      period: string;
      status: "draft" | "submitted";
      submittedByEmail: string;
      submittedAt: string | null;
      fteCount: number | null;
      paidCustomerCount: number | null;
      arrUsd: number | null;
      arrGrowthYoyPct: number | null;
      nrrPct: number | null;
      logoRetentionPct: number | null;
      grossMarginPct: number | null;
      cacPaybackMonths: number | null;
      burnMultiple: number | null;
      ruleOf40Pct: number | null;
      cashOnHandUsd: number | null;
      monthlyBurnUsd: number | null;
      notableCustomers: string | null;
      notableHires: string | null;
      otherUpdates: string | null;
      challenges: string | null;
      bankingPartner: string | null;
      legalCounsel: string | null;
      cloudProvider: string | null;
      capTablePlatform: string | null;
      doInsuranceProvider: string | null;
      crmPlatform: string | null;
      openToInvestorIntros: boolean;
    }>;
  }
> = {
  name: "getCompanyPrivateMetrics",
  title: "Get a company's private-metrics history",
  description:
    "Return all quarterly private-metrics submissions for a company (ARR, NRR, burn, headcount, challenges, vendors, intro opt-in, etc.). This is the underlying 'survey feedback' data for portfolio analysis. Newest period first.",
  inputSchema: input,
  readOnly: true,
  costTokens: 300,
  async execute({ companyUuid, limit }, ctx) {
    const rows = await listForCompany({
      accountId: ctx.accountId,
      companyUuid,
      limit,
    });
    return {
      companyUuid,
      history: rows.map((r) => ({
        period: r.period,
        status: r.status,
        submittedByEmail: r.submittedByEmail,
        submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
        fteCount: r.fteCount,
        paidCustomerCount: r.paidCustomerCount,
        arrUsd: r.arrUsd,
        arrGrowthYoyPct: r.arrGrowthYoyPct,
        nrrPct: r.nrrPct,
        logoRetentionPct: r.logoRetentionPct,
        grossMarginPct: r.grossMarginPct,
        cacPaybackMonths: r.cacPaybackMonths,
        burnMultiple: r.burnMultiple,
        ruleOf40Pct: r.ruleOf40Pct,
        cashOnHandUsd: r.cashOnHandUsd,
        monthlyBurnUsd: r.monthlyBurnUsd,
        notableCustomers: r.notableCustomers,
        notableHires: r.notableHires,
        otherUpdates: r.otherUpdates,
        challenges: r.challenges,
        bankingPartner: r.bankingPartner,
        legalCounsel: r.legalCounsel,
        cloudProvider: r.cloudProvider,
        capTablePlatform: r.capTablePlatform,
        doInsuranceProvider: r.doInsuranceProvider,
        crmPlatform: r.crmPlatform,
        openToInvestorIntros: r.openToInvestorIntros,
      })),
    };
  },
};
