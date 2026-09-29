"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  currentPeriod,
  upsertUpdate,
  type PortfolioUpdateInput,
} from "@/lib/portfolio-updates";

async function requireCtx(): Promise<{ email: string; accountId: string }> {
  let email = "mike@york.ie";
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session?.email) redirect("/sign-in");
    email = session.email;
  }
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("No account");
  return { email, accountId: account.id };
}

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/[,$_\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function int(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n == null ? null : Math.round(n);
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function saveUpdateAction(formData: FormData) {
  const { email, accountId } = await requireCtx();
  const uuid = String(formData.get("uuid") ?? "");
  if (!uuid) return;
  const period = str(formData, "period") ?? currentPeriod();
  const intent = String(formData.get("intent") ?? "draft");
  const status = intent === "submit" ? "submitted" : "draft";

  const input: PortfolioUpdateInput = {
    accountId,
    companyUuid: uuid,
    period,
    asOf: str(formData, "asOf"),
    fteCount: int(formData, "fteCount"),
    paidCustomerCount: int(formData, "paidCustomerCount"),
    arrUsd: num(formData, "arrUsd"),
    arrGrowthYoyPct: num(formData, "arrGrowthYoyPct"),
    nrrPct: num(formData, "nrrPct"),
    logoRetentionPct: num(formData, "logoRetentionPct"),
    grossMarginPct: num(formData, "grossMarginPct"),
    cacPaybackMonths: num(formData, "cacPaybackMonths"),
    burnMultiple: num(formData, "burnMultiple"),
    ruleOf40Pct: num(formData, "ruleOf40Pct"),
    cashOnHandUsd: num(formData, "cashOnHandUsd"),
    monthlyBurnUsd: num(formData, "monthlyBurnUsd"),
    notableCustomers: str(formData, "notableCustomers"),
    notableHires: str(formData, "notableHires"),
    otherUpdates: str(formData, "otherUpdates"),
    challenges: str(formData, "challenges"),
    bankingPartner: str(formData, "bankingPartner"),
    legalCounsel: str(formData, "legalCounsel"),
    cloudProvider: str(formData, "cloudProvider"),
    capTablePlatform: str(formData, "capTablePlatform"),
    doInsuranceProvider: str(formData, "doInsuranceProvider"),
    crmPlatform: str(formData, "crmPlatform"),
    openToInvestorIntros: formData.get("openToInvestorIntros") === "on",
    submittedByEmail: email,
    status,
  };

  await upsertUpdate(input);
  revalidatePath(`/company/${uuid}`);
}
