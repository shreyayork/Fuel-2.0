import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  integrationPipelineConfigs,
  pipelineCompanies,
  type IntegrationPipelineConfig,
  type PipelineCompany,
} from "@/db/schema";
import {
  HubspotClient,
  listDealPipelines,
  listDealsInPipeline,
  getCompaniesByIds,
  getContactsByIds,
  type HubspotContact,
  type HubspotDeal,
} from "./hubspot-client";
import { getCompanyByDomain, normalizeDomain } from "./fuel-data";
import { captureIntegrationException, captureIntegrationMessage } from "@/lib/sentry/capture";
import { getCatalogByDomain } from "./catalog";
import { tryChargeIntegrationSync } from "@/lib/credits/integration-sync";

export async function listSyncedPipelineCompanies(opts: {
  accountId: string;
  pipelineConfigId?: string;
}): Promise<PipelineCompany[]> {
  const db = await getDb();
  const where = opts.pipelineConfigId
    ? and(
        eq(pipelineCompanies.accountId, opts.accountId),
        eq(pipelineCompanies.pipelineConfigId, opts.pipelineConfigId),
      )
    : eq(pipelineCompanies.accountId, opts.accountId);
  return db
    .select()
    .from(pipelineCompanies)
    .where(where)
    .orderBy(desc(pipelineCompanies.updatedAt));
}

/**
 * Free-email providers whose addresses tell us nothing about a company's
 * domain. If every associated contact uses one of these, we can't derive
 * a company domain from emails alone.
 */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "msn.com",
  "aol.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
  "hey.com", "fastmail.com", "fastmail.fm", "zoho.com", "gmx.com", "gmx.de",
  "mail.com", "yandex.com", "yandex.ru", "ymail.com", "rocketmail.com",
  "inbox.com", "pm.me", "mailinator.com", "duck.com",
]);

function domainFromEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return null;
  const d = email.slice(at + 1).trim().toLowerCase();
  if (!d || FREE_EMAIL_DOMAINS.has(d)) return null;
  return normalizeDomain(d);
}

/**
 * Collect every plausible domain for a deal, in priority order:
 * company.domain → company.website → each non-free contact email domain.
 * Deduped + normalized. The fuel-data/catalog match walks the full list;
 * `company_domain` (the display field) is just index 0.
 */
function deriveDealDomains(opts: {
  companyDomain?: string | null;
  companyWebsite?: string | null;
  contacts?: HubspotContact[];
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (d: string | null) => {
    if (!d || seen.has(d)) return;
    seen.add(d);
    out.push(d);
  };
  push(normalizeDomain(opts.companyDomain));
  push(normalizeDomain(opts.companyWebsite));
  for (const c of opts.contacts ?? []) push(domainFromEmail(c.properties.email));
  return out;
}

function parseAmount(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Match a HubSpot deal to a fuel-data organization UUID, given every domain
 * signal we collected (company.domain, website, non-free contact emails).
 * Walks all candidates against the account catalog first, then fuel-data;
 * first exact hit wins. This handles the common case where a company owns
 * multiple TLDs (e.g. cyberhaven.io + cyberhaven.com) and HubSpot + fuel-data
 * happen to index different ones.
 *
 * Name-based fuzzy match was intentionally removed — collisions across
 * companies that share a common word (e.g. "Euler" the DeFi protocol vs
 * "eulerapp.com") caused false positives. Domain is the only acceptable
 * identity signal here.
 */
async function resolveFuelDataUuid(opts: {
  accountId: string;
  domains: string[];
}): Promise<string | null> {
  try {
    for (const d of opts.domains) {
      const catalog = await getCatalogByDomain({ accountId: opts.accountId, domain: d });
      if (catalog) return catalog.id;
    }
    for (const d of opts.domains) {
      const hit = await getCompanyByDomain(d);
      if (hit) return hit.uuid;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Run resolveFuelDataUuid across a list of deals with bounded concurrency.
 * Each lookup makes 1-3 OpenSearch queries; at 50-100ms each, concurrency=10
 * keeps us responsive without swamping the cluster.
 */
async function resolveInBatches<T>(
  items: T[],
  fn: (item: T) => Promise<string | null>,
  concurrency = 10,
): Promise<Array<string | null>> {
  const out: Array<string | null> = new Array(items.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface SyncResult {
  configId: string;
  pipelineName: string;
  dealsSeen: number;
  companiesResolved: number;
  error?: string;
}

export async function syncHubspotConfig(opts: {
  accountId: string;
  config: IntegrationPipelineConfig;
}): Promise<SyncResult> {
  const { accountId, config } = opts;
  const db = await getDb();
  const now = new Date();
  const tag = `[hubspot-sync ${config.providerPipelineName} ${config.id.slice(0, 8)}]`;
  const perDealErrors: Array<{ dealId: string; error: string }> = [];
  let fatal: string | undefined;
  let resolvedCount = 0;
  let allDeals: HubspotDeal[] = [];

  // Always stamp lastSyncAt at the end — even on total failure — so the UI
  // reflects the attempt and the error is visible in syncState.
  const finalize = async () => {
    let stages:
      | Array<{
          id: string;
          label: string;
          displayOrder: number;
          probability?: number;
          isClosed?: boolean;
          closedStageType?: string;
        }>
      | undefined;
    try {
      const client2 = await HubspotClient.forAccount(accountId);
      if (client2) {
        const pipelines = await listDealPipelines(client2);
        const me = pipelines.find((p) => p.id === config.providerPipelineId);
        stages = me?.stages?.map((s) => {
          const meta = s.metadata ?? {};
          const prob = Number(meta.probability);
          return {
            id: s.id,
            label: s.label,
            displayOrder: s.displayOrder,
            probability: Number.isFinite(prob) ? prob : undefined,
            isClosed: meta.isClosed === "true",
            closedStageType: meta.closedStageType,
          };
        });
      }
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "list_pipelines",
        level: "warning",
        context: { configId: config.id },
      });
      console.warn(`${tag} listDealPipelines failed`, (e as Error).message);
    }
    // Preserve user's per-stage overrides across syncs — they live in
    // syncState.stageOverrides and the sync doesn't know about them.
    const existingSyncState = (config.syncState ?? {}) as Record<string, unknown>;
    const stageOverrides = existingSyncState.stageOverrides ?? {};
    await db
      .update(integrationPipelineConfigs)
      .set({
        lastSyncAt: now,
        updatedAt: now,
        syncState: {
          lastResult: {
            dealsSeen: allDeals.length,
            companiesResolved: resolvedCount,
            perDealErrors: perDealErrors.slice(0, 10),
            fatal,
            at: now.toISOString(),
          },
          stages,
          stageOverrides,
        } as Record<string, unknown>,
      })
      .where(eq(integrationPipelineConfigs.id, config.id));
  };

  const client = await HubspotClient.forAccount(accountId);
  if (!client) {
    fatal = "hubspot_not_connected";
    captureIntegrationMessage("HubSpot client not connected for pipeline sync", {
      integration: "hubspot",
      operation: "pipeline_sync",
      context: { accountId: opts.accountId, configId: config.id },
    });
    console.error(`${tag} no client — connection missing or token fetch failed`);
    await finalize();
    return {
      configId: config.id,
      pipelineName: config.providerPipelineName,
      dealsSeen: 0,
      companiesResolved: 0,
      error: fatal,
    };
  }

  // 1. Paginate deals.
  try {
    let after: string | undefined;
    for (let i = 0; i < 20; i++) {
      const page = await listDealsInPipeline(client, {
        pipelineId: config.providerPipelineId,
        after,
        limit: 100,
      });
      allDeals.push(...page.results);
      after = page.paging?.next?.after;
      if (!after) break;
    }
    console.log(`${tag} fetched ${allDeals.length} deals`);
  } catch (e) {
    fatal = `listDealsInPipeline failed: ${(e as Error).message}`;
    captureIntegrationException(e, {
      integration: "hubspot",
      operation: "list_deals",
      context: { configId: config.id, accountId: opts.accountId },
    });
    console.error(`${tag} ${fatal}`);
    await finalize();
    return {
      configId: config.id,
      pipelineName: config.providerPipelineName,
      dealsSeen: allDeals.length,
      companiesResolved: 0,
      error: fatal,
    };
  }

  // 2a. Batch-read associated companies. Non-fatal if it fails — we still
  //     upsert deals with whatever company fields are on the deal itself.
  const companyIds = new Set<string>();
  for (const d of allDeals) {
    for (const c of d.associations?.companies?.results ?? []) companyIds.add(c.id);
  }
  let companies: Awaited<ReturnType<typeof getCompaniesByIds>> = [];
  if (companyIds.size > 0) {
    try {
      companies = await getCompaniesByIds(client, Array.from(companyIds));
      console.log(`${tag} fetched ${companies.length} associated companies`);
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "get_companies",
        level: "warning",
        context: { configId: config.id },
      });
      console.warn(`${tag} getCompaniesByIds failed — falling back to deal-only data:`, (e as Error).message);
    }
  }
  const companyById = new Map(companies.map((c) => [c.id, c]));

  // 2b. Batch-read associated contacts. Used to derive a company domain
  //     from the contact's email when the company record has none.
  const contactIds = new Set<string>();
  for (const d of allDeals) {
    for (const c of d.associations?.contacts?.results ?? []) contactIds.add(c.id);
  }
  let contacts: HubspotContact[] = [];
  if (contactIds.size > 0) {
    try {
      contacts = await getContactsByIds(client, Array.from(contactIds));
      console.log(`${tag} fetched ${contacts.length} associated contacts`);
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "get_contacts",
        level: "warning",
        context: { configId: config.id },
      });
      console.warn(`${tag} getContactsByIds failed — proceeding without contact emails:`, (e as Error).message);
    }
  }
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  // Helper: given a deal, return the list of associated contacts we have.
  const dealContacts = (deal: HubspotDeal): HubspotContact[] =>
    (deal.associations?.contacts?.results ?? [])
      .map((ref) => contactById.get(ref.id))
      .filter((c): c is HubspotContact => !!c);

  // 3. Resolve each deal's associated company to a fuel-data UUID in
  //    parallel (bounded concurrency) BEFORE the serial upsert pass.
  const dealDomainLists = allDeals.map((deal) => {
    const companyId = deal.associations?.companies?.results?.[0]?.id;
    const hsCo = companyId ? companyById.get(companyId) : undefined;
    return deriveDealDomains({
      companyDomain: hsCo?.properties.domain,
      companyWebsite: hsCo?.properties.website,
      contacts: dealContacts(deal),
    });
  });
  const fuelUuids = await resolveInBatches(
    dealDomainLists,
    (domains) => resolveFuelDataUuid({ accountId, domains }),
    10,
  );
  resolvedCount = fuelUuids.filter(Boolean).length;
  console.log(`${tag} resolved ${resolvedCount}/${allDeals.length} to fuel-data`);

  // 4. Upsert each deal — per-deal try/catch so one bad row doesn't abort the rest.
  for (let idx = 0; idx < allDeals.length; idx++) {
    const deal = allDeals[idx];
    try {
      const companyId = deal.associations?.companies?.results?.[0]?.id;
      const hsCo = companyId ? companyById.get(companyId) : undefined;
      const fuelUuid = fuelUuids[idx];
      const domains = dealDomainLists[idx];

      const [existing] = await db
        .select()
        .from(pipelineCompanies)
        .where(
          and(
            eq(pipelineCompanies.pipelineConfigId, config.id),
            eq(pipelineCompanies.providerDealId, deal.id),
          ),
        )
        .limit(1);

      const values = {
        accountId,
        pipelineConfigId: config.id,
        provider: "hubspot" as const,
        providerDealId: deal.id,
        providerCompanyId: companyId ?? null,
        providerPipelineId: config.providerPipelineId,
        providerPipelineStageId: deal.properties.dealstage ?? null,
        companyName: hsCo?.properties.name ?? null,
        // Best-effort domain resolution: company.domain → company.website →
        // non-free email from any associated contact. The pipeline card's
        // "+ Fuel" button needs a domain to enrich against, so any signal
        // we can extract helps.
        companyDomain: domains[0] ?? null,
        companyDomains: domains.length > 0 ? domains : null,
        companyIndustry: hsCo?.properties.industry ?? null,
        companyCity: hsCo?.properties.city ?? null,
        companyCountry: hsCo?.properties.country ?? null,
        companyEmployees: hsCo?.properties.numberofemployees ?? null,
        dealName: deal.properties.dealname ?? null,
        dealAmount: parseAmount(deal.properties.amount),
        dealCloseDate: parseDate(deal.properties.closedate),
        fuelDataUuid: fuelUuid,
        rawDeal: deal as unknown as Record<string, unknown>,
        rawCompany: (hsCo as unknown as Record<string, unknown>) ?? null,
        lastSeenAt: now,
        updatedAt: now,
      };

      if (existing) {
        await db
          .update(pipelineCompanies)
          .set(values)
          .where(eq(pipelineCompanies.id, existing.id));
      } else {
        await db.insert(pipelineCompanies).values({ id: randomUUID(), ...values });
      }
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 300) ?? "upsert failed";
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "deal_upsert",
        level: "warning",
        context: { dealId: deal.id, configId: config.id },
      });
      perDealErrors.push({ dealId: deal.id, error: msg });
      console.warn(`${tag} deal ${deal.id} failed:`, msg);
    }
  }
  console.log(
    `${tag} upserted ${allDeals.length - perDealErrors.length}/${allDeals.length} deals, ${resolvedCount} resolved to fuel-data`,
  );

  await finalize();

  return {
    configId: config.id,
    pipelineName: config.providerPipelineName,
    dealsSeen: allDeals.length,
    companiesResolved: resolvedCount,
  };
}

export async function syncAllEnabledHubspotPipelines(opts: {
  accountId: string;
  /** When false, skip credit charge (e.g. second hop in same account run). Default true. */
  chargeCredits?: boolean;
}): Promise<SyncResult[]> {
  if (opts.chargeCredits !== false) {
    const gate = await tryChargeIntegrationSync(opts.accountId, "hubspotSync", {
      referenceId: `hubspot-pipeline:${opts.accountId}`,
    });
    if (!gate.allowed) return [];
  }
  const db = await getDb();
  const enabled = await db
    .select()
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.accountId, opts.accountId),
        eq(integrationPipelineConfigs.provider, "hubspot"),
        eq(integrationPipelineConfigs.enabled, true),
      ),
    );
  const results: SyncResult[] = [];
  for (const config of enabled) {
    results.push(await syncHubspotConfig({ accountId: opts.accountId, config }));
  }
  return results;
}

/** Reconcile across every account with a connected HubSpot integration. */
export async function reconcileAllAccounts(): Promise<
  Array<{ accountId: string; results: SyncResult[] }>
> {
  const db = await getDb();
  const rows = await db
    .select({ accountId: integrationPipelineConfigs.accountId })
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.provider, "hubspot"),
        eq(integrationPipelineConfigs.enabled, true),
      ),
    );
  const uniqueAccountIds = Array.from(new Set(rows.map((r) => r.accountId)));
  const out: Array<{ accountId: string; results: SyncResult[] }> = [];
  for (const accountId of uniqueAccountIds) {
    const results = await syncAllEnabledHubspotPipelines({ accountId });
    out.push({ accountId, results });
  }
  return out;
}

/**
 * Lite shape used by the /pipeline view. We deliberately project only the
 * columns the UI binds to — the `raw_deal` + `raw_company` jsonb blobs are
 * 5-50 KB each, and shipping them × 1.8K rows turned this query into a
 * 1.5s payload transfer. The lite shape drops the query to ~100ms.
 */
export interface PipelineCompanyLite {
  id: string;
  pipelineConfigId: string;
  providerDealId: string;
  providerPipelineStageId: string | null;
  companyName: string | null;
  companyDomain: string | null;
  companyIndustry: string | null;
  dealName: string | null;
  dealAmount: number | null;
  dealCloseDate: Date | null;
  fuelDataUuid: string | null;
}

/** First page of cards per stage. Stages that exceed this threshold show a
 *  "+N more" affordance and lazy-load the remainder via `loadStageRows`. */
const STAGE_PAGE_SIZE = 20;

/**
 * Per-stage counts so the UI can show "20 of 234" and decide whether to
 * surface a "Load more" button. Keyed by `${pipelineConfigId}:${stageId}`
 * (NULL stages bucket as `:_null_`).
 */
export type PipelineStageCounts = Record<string, number>;

export async function listEnabledPipelinesWithCompanies(opts: {
  accountId: string;
}): Promise<
  Array<{
    config: IntegrationPipelineConfig;
    /** Top STAGE_PAGE_SIZE rows per stage, ordered by updated_at desc. */
    companies: PipelineCompanyLite[];
    /** Total row count per stage for this pipeline (incl. ones not shipped). */
    stageCounts: PipelineStageCounts;
  }>
> {
  const db = await getDb();
  const configs = await db
    .select()
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.accountId, opts.accountId),
        eq(integrationPipelineConfigs.enabled, true),
      ),
    )
    .orderBy(integrationPipelineConfigs.providerPipelineName);
  if (configs.length === 0) return [];

  const cfgIds = configs.map((c) => c.id);
  // sql.join expands a JS array into a parameterized IN-list (correctly
  // escaped). `pipeline_config_id = ANY($array)` would be cleaner but
  // node-postgres doesn't auto-cast JS arrays to Postgres array literals.
  const cfgIdsList = sql.join(cfgIds.map((id) => sql`${id}`), sql`, `);

  // Window-function query: top N rows per (pipeline, stage). Single round-trip
  // regardless of how many pipelines or stages exist, and Postgres index on
  // (account_id, pipeline_config_id, provider_pipeline_stage_id, updated_at)
  // would make it sub-100ms even at scale.
  const topRows = await db.execute(sql`
    WITH ranked AS (
      SELECT
        id, pipeline_config_id, provider_deal_id, provider_pipeline_stage_id,
        company_name, company_domain, company_industry,
        deal_name, deal_amount, deal_close_date, fuel_data_uuid,
        ROW_NUMBER() OVER (
          PARTITION BY pipeline_config_id, COALESCE(provider_pipeline_stage_id, '__null__')
          ORDER BY updated_at DESC
        ) AS rn
      FROM pipeline_companies
      WHERE account_id = ${opts.accountId}
        AND pipeline_config_id IN (${cfgIdsList})
    )
    SELECT * FROM ranked WHERE rn <= ${STAGE_PAGE_SIZE}
  `);

  const countsRes = await db.execute(sql`
    SELECT pipeline_config_id, provider_pipeline_stage_id, count(*)::int AS n
    FROM pipeline_companies
    WHERE account_id = ${opts.accountId}
      AND pipeline_config_id IN (${cfgIdsList})
    GROUP BY 1, 2
  `);

  const byConfig = new Map<string, PipelineCompanyLite[]>();
  for (const r of topRows.rows as Array<Record<string, unknown>>) {
    const lite: PipelineCompanyLite = {
      id: r.id as string,
      pipelineConfigId: r.pipeline_config_id as string,
      providerDealId: r.provider_deal_id as string,
      providerPipelineStageId: (r.provider_pipeline_stage_id as string | null) ?? null,
      companyName: (r.company_name as string | null) ?? null,
      companyDomain: (r.company_domain as string | null) ?? null,
      companyIndustry: (r.company_industry as string | null) ?? null,
      dealName: (r.deal_name as string | null) ?? null,
      dealAmount: (r.deal_amount as number | null) ?? null,
      dealCloseDate: r.deal_close_date ? new Date(r.deal_close_date as string) : null,
      fuelDataUuid: (r.fuel_data_uuid as string | null) ?? null,
    };
    const list = byConfig.get(lite.pipelineConfigId) ?? [];
    list.push(lite);
    byConfig.set(lite.pipelineConfigId, list);
  }

  const countsByConfig = new Map<string, PipelineStageCounts>();
  for (const r of countsRes.rows as Array<{
    pipeline_config_id: string;
    provider_pipeline_stage_id: string | null;
    n: number;
  }>) {
    const m = countsByConfig.get(r.pipeline_config_id) ?? {};
    const k = `${r.pipeline_config_id}:${r.provider_pipeline_stage_id ?? "_null_"}`;
    m[k] = r.n;
    countsByConfig.set(r.pipeline_config_id, m);
  }

  return configs.map((c) => ({
    config: c,
    companies: byConfig.get(c.id) ?? [],
    stageCounts: countsByConfig.get(c.id) ?? {},
  }));
}

/**
 * Fetch the full row set for a single (pipeline, stage). Called by the
 * client when the user clicks "Load more" on a stage column.
 */
export async function loadStageRows(opts: {
  accountId: string;
  pipelineConfigId: string;
  stageId: string | null;
}): Promise<PipelineCompanyLite[]> {
  const db = await getDb();
  const where = opts.stageId
    ? and(
        eq(pipelineCompanies.accountId, opts.accountId),
        eq(pipelineCompanies.pipelineConfigId, opts.pipelineConfigId),
        eq(pipelineCompanies.providerPipelineStageId, opts.stageId),
      )
    : and(
        eq(pipelineCompanies.accountId, opts.accountId),
        eq(pipelineCompanies.pipelineConfigId, opts.pipelineConfigId),
        sql`${pipelineCompanies.providerPipelineStageId} IS NULL`,
      );
  return db
    .select(pipelineCompanyLiteSelect)
    .from(pipelineCompanies)
    .where(where)
    .orderBy(desc(pipelineCompanies.updatedAt));
}

const pipelineCompanyLiteSelect = {
  id: pipelineCompanies.id,
  pipelineConfigId: pipelineCompanies.pipelineConfigId,
  providerDealId: pipelineCompanies.providerDealId,
  providerPipelineStageId: pipelineCompanies.providerPipelineStageId,
  companyName: pipelineCompanies.companyName,
  companyDomain: pipelineCompanies.companyDomain,
  companyIndustry: pipelineCompanies.companyIndustry,
  dealName: pipelineCompanies.dealName,
  dealAmount: pipelineCompanies.dealAmount,
  dealCloseDate: pipelineCompanies.dealCloseDate,
  fuelDataUuid: pipelineCompanies.fuelDataUuid,
};

/**
 * Search all deals in a pipeline by card-visible text fields. Returns the
 * full match set (not paginated) so the kanban can filter columns without
 * missing rows beyond STAGE_PAGE_SIZE.
 */
export async function searchPipelineDeals(opts: {
  accountId: string;
  pipelineConfigId: string;
  query: string;
}): Promise<PipelineCompanyLite[]> {
  const trimmed = opts.query.trim();
  if (!trimmed) return [];

  const db = await getDb();
  const q = `%${trimmed}%`;
  return db
    .select(pipelineCompanyLiteSelect)
    .from(pipelineCompanies)
    .where(
      and(
        eq(pipelineCompanies.accountId, opts.accountId),
        eq(pipelineCompanies.pipelineConfigId, opts.pipelineConfigId),
        or(
          ilike(pipelineCompanies.companyName, q),
          ilike(pipelineCompanies.dealName, q),
          ilike(pipelineCompanies.companyDomain, q),
          ilike(pipelineCompanies.companyIndustry, q),
        )!,
      ),
    )
    .orderBy(desc(pipelineCompanies.updatedAt));
}
