"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationPipelineConfigs, pipelineCompanies } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { enrichCompanyFromDomain } from "@/lib/catalog-enrich";
import { normalizeDomain } from "@/lib/fuel-data";
import { loadStageRows, searchPipelineDeals, type PipelineCompanyLite } from "@/lib/pipelines";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

/**
 * "Add to Fuel" — takes an unmatched pipeline deal, scrapes the associated
 * company's website + Crunchbase + tech stack, creates (or refreshes) a
 * Fuel-native catalog_companies row, and backfills every pipeline_companies
 * row that matches that domain with the new catalog UUID so the cards
 * become clickable.
 */
export async function addPipelineDealToFuelAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("no active account");

  const dealId = String(formData.get("pipelineCompanyId") ?? "");
  const rawDomain = String(formData.get("domain") ?? "").trim();
  const rawName = String(formData.get("name") ?? "").trim();
  if (!dealId) throw new Error("missing pipelineCompanyId");

  const domain = normalizeDomain(rawDomain);
  if (!domain) throw new Error("no_domain_on_deal");

  const catalog = await enrichCompanyFromDomain({
    accountId: account.id,
    domain,
    name: rawName || domain,
    authorEmail: email,
  });

  // Backfill every pipeline_companies row on this account with the same
  // domain so any future appearances also link to the catalog row.
  const db = await getDb();
  await db
    .update(pipelineCompanies)
    .set({ fuelDataUuid: catalog.id, updatedAt: new Date() })
    .where(
      and(
        eq(pipelineCompanies.accountId, account.id),
        eq(pipelineCompanies.companyDomain, domain),
      ),
    );
  // Also update this specific row by id in case its domain field is empty.
  await db
    .update(pipelineCompanies)
    .set({ fuelDataUuid: catalog.id, updatedAt: new Date() })
    .where(
      and(
        eq(pipelineCompanies.accountId, account.id),
        eq(pipelineCompanies.id, dealId),
      ),
    );

  revalidatePath("/pipeline");
  redirect(`/company/${catalog.id}`);
}

/**
 * Toggle whether a HubSpot deal stage is shown in the Pipeline view. Stores
 * the preference in integration_pipeline_configs.syncState.stageOverrides
 * as `{ [stageId]: "shown" | "hidden" }`. User overrides auto-defaults
 * (closed-lost stages are hidden by default).
 */
export async function toggleStageVisibilityAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("no active account");

  const configId = String(formData.get("configId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const state = String(formData.get("state") ?? "") as "shown" | "hidden";
  if (!configId || !stageId || (state !== "shown" && state !== "hidden")) return;

  const db = await getDb();
  const [row] = await db
    .select()
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.id, configId),
        eq(integrationPipelineConfigs.accountId, account.id),
      ),
    )
    .limit(1);
  if (!row) return;

  const syncState = (row.syncState ?? {}) as Record<string, unknown>;
  const overrides =
    (syncState.stageOverrides as Record<string, "shown" | "hidden"> | undefined) ?? {};
  overrides[stageId] = state;
  await db
    .update(integrationPipelineConfigs)
    .set({
      syncState: { ...syncState, stageOverrides: overrides },
      updatedAt: new Date(),
    })
    .where(eq(integrationPipelineConfigs.id, configId));

  revalidatePath("/pipeline");
}

/**
 * Lazy-load helper: returns every row for a single (pipeline, stage) the
 * caller is a member of. Called when the user clicks "Show N more" in a
 * kanban column. Returns serializable rows with ISO date strings.
 */
export async function loadStageRowsAction(
  formData: FormData,
): Promise<
  Array<Omit<PipelineCompanyLite, "dealCloseDate"> & { dealCloseDate: string | null }>
> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return [];
  const configId = String(formData.get("configId") ?? "");
  const stageRaw = String(formData.get("stageId") ?? "");
  const stageId = stageRaw === "" ? null : stageRaw;
  if (!configId) return [];
  const rows = await loadStageRows({ accountId: account.id, pipelineConfigId: configId, stageId });
  return rows.map((r) => ({
    ...r,
    dealCloseDate: r.dealCloseDate ? r.dealCloseDate.toISOString() : null,
  }));
}

/**
 * Search deals across an entire pipeline by card-visible text fields.
 * Returns serializable rows for the kanban search bar.
 */
export async function searchPipelineDealsAction(
  formData: FormData,
): Promise<
  Array<Omit<PipelineCompanyLite, "dealCloseDate"> & { dealCloseDate: string | null }>
> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return [];
  const configId = String(formData.get("configId") ?? "");
  const q = String(formData.get("q") ?? "").trim();
  if (!configId || !q) return [];
  const rows = await searchPipelineDeals({
    accountId: account.id,
    pipelineConfigId: configId,
    query: q,
  });
  return rows.map((r) => ({
    ...r,
    dealCloseDate: r.dealCloseDate ? r.dealCloseDate.toISOString() : null,
  }));
}
