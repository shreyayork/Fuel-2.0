import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationConnections, type IntegrationConnection } from "@/db/schema";
import { refreshTokens } from "./integrations/oauth";
import { PROVIDERS } from "./integrations/registry";
import { getIntegration } from "./integrations";

const API_BASE = "https://api.hubapi.com";
// Refresh this long before expiry to avoid racing the clock mid-request.
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

interface HubspotCreds {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType?: string;
}

function asCreds(conn: IntegrationConnection): HubspotCreds {
  const c = conn.credentials as unknown as HubspotCreds;
  if (!c?.accessToken || !c.refreshToken || !c.expiresAt) {
    throw new Error("hubspot connection missing access/refresh tokens");
  }
  return c;
}

async function ensureFreshAccessToken(conn: IntegrationConnection): Promise<string> {
  const creds = asCreds(conn);
  if (Date.now() < creds.expiresAt - REFRESH_BUFFER_MS) return creds.accessToken;
  const fresh = await refreshTokens({
    provider: PROVIDERS.hubspot,
    refreshToken: creds.refreshToken,
  });
  const updated: HubspotCreds = {
    accessToken: fresh.access_token,
    refreshToken: fresh.refresh_token,
    expiresAt: Date.now() + fresh.expires_in * 1000,
    tokenType: fresh.token_type,
  };
  const db = await getDb();
  await db
    .update(integrationConnections)
    .set({
      credentials: updated as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, conn.id));
  return updated.accessToken;
}

/**
 * HubSpot public API enforces two separate rate limits: 10 req/s per app
 * (SECONDLY) and 110 req/10s (TEN_SECONDLY). We pace outgoing calls at ~7/s
 * to stay safely under both and retry up to 3 times on 429, honoring the
 * Retry-After / X-HubSpot-RateLimit-Interval-Milliseconds headers.
 */
const MIN_INTERVAL_MS = 140;

export class HubspotClient {
  constructor(private readonly accessToken: string) {}

  // Single-flight gate so concurrent method calls inside one HubspotClient
  // instance still pace themselves. Not cross-instance — sufficient since
  // each sync run uses one instance.
  private nextAllowedAt = 0;

  static async forAccount(accountId: string): Promise<HubspotClient | null> {
    const conn = await getIntegration({ accountId, provider: "hubspot" });
    if (!conn || conn.status !== "connected") return null;
    const token = await ensureFreshAccessToken(conn);
    return new HubspotClient(token);
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, this.nextAllowedAt - now);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.nextAllowedAt = Date.now() + MIN_INTERVAL_MS;
  }

  private async request<T>(init: RequestInit & { url: string; label: string }): Promise<T> {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.throttle();
      const res = await fetch(init.url, init);
      if (res.ok) return (await res.json()) as T;

      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfterHeader =
          res.headers.get("retry-after") ??
          res.headers.get("x-hubspot-ratelimit-interval-milliseconds");
        const retryMs = retryAfterHeader
          ? parseRetryAfter(retryAfterHeader)
          : Math.min(8_000, 500 * 2 ** (attempt - 1));
        await new Promise((r) => setTimeout(r, retryMs));
        continue;
      }

      const text = await res.text();
      throw new Error(
        `hubspot ${init.label} failed: ${res.status} ${text.slice(0, 200)}`,
      );
    }
    throw new Error(`hubspot ${init.label}: exceeded retries`);
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return this.request<T>({
      url: url.toString(),
      method: "GET",
      headers: { authorization: `Bearer ${this.accessToken}` },
      label: `GET ${path}`,
    });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>({
      url: `${API_BASE}${path}`,
      method: "POST",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      label: `POST ${path}`,
    });
  }
}

function parseRetryAfter(raw: string): number {
  // Header can be seconds (Retry-After) or milliseconds (HubSpot's custom).
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1_000;
  // < 100 treated as seconds (per RFC), >= 100 treated as milliseconds.
  return n < 100 ? n * 1000 : n;
}

// --- typed wrappers for the bits we actually use ---

export interface HubspotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: Array<{ id: string; label: string; displayOrder: number; metadata?: Record<string, string> }>;
}

export async function listDealPipelines(client: HubspotClient): Promise<HubspotPipeline[]> {
  const res = await client.get<{ results: HubspotPipeline[] }>(
    "/crm/v3/pipelines/deals",
  );
  return res.results;
}

export interface HubspotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
  };
  associations?: {
    companies?: { results: Array<{ id: string; type: string }> };
    contacts?: { results: Array<{ id: string; type: string }> };
  };
}

const DEAL_PROPERTIES = [
  "dealname",
  "amount",
  "dealstage",
  "pipeline",
  "closedate",
  "createdate",
  "hs_lastmodifieddate",
];

export async function listDealsInPipeline(
  client: HubspotClient,
  opts: { pipelineId: string; after?: string; limit?: number },
): Promise<{ results: HubspotDeal[]; paging?: { next?: { after: string } } }> {
  // HubSpot's /deals/search endpoint does NOT return `associations` even if
  // you ask for them — that parameter is silently dropped. Two-step:
  //   1. Search filters by pipeline + paginates → returns deal IDs only
  //   2. Batch read those IDs WITH associations (companies + contacts) +
  //      all the properties we care about
  // Batch read supports up to 100 inputs per call, which matches our page
  // size so we can do it in a single round-trip per page.
  const search = await client.post<{
    results: Array<{ id: string }>;
    paging?: { next?: { after: string } };
  }>("/crm/v3/objects/deals/search", {
    filterGroups: [
      { filters: [{ propertyName: "pipeline", operator: "EQ", value: opts.pipelineId }] },
    ],
    limit: opts.limit ?? 100,
    after: opts.after,
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
  });

  if (search.results.length === 0) {
    return { results: [], paging: search.paging };
  }

  const batch = await client.post<{ results: HubspotDeal[] }>(
    "/crm/v3/objects/deals/batch/read",
    {
      properties: DEAL_PROPERTIES,
      // `associations` in the v3 batch-read body is silently ignored by
      // HubSpot — observed empirically (0 of 1839 stored raw_deals had the
      // `associations` key after a sync). We fetch them via the v4
      // associations batch endpoint instead and merge in below.
      inputs: search.results.map((d) => ({ id: d.id })),
    },
  );

  // v4 associations batch: two calls, one per destination object type.
  // POST /crm/v4/associations/{fromObjectType}/{toObjectType}/batch/read
  const inputs = batch.results.map((d) => ({ id: d.id }));
  const [companiesRes, contactsRes] = await Promise.all([
    client.post<{
      results: Array<{
        from: { id: string };
        to: Array<{ toObjectId: string; associationTypes?: Array<{ label?: string }> }>;
      }>;
    }>("/crm/v4/associations/deals/companies/batch/read", { inputs }),
    client.post<{
      results: Array<{
        from: { id: string };
        to: Array<{ toObjectId: string; associationTypes?: Array<{ label?: string }> }>;
      }>;
    }>("/crm/v4/associations/deals/contacts/batch/read", { inputs }),
  ]);

  const coByDeal = new Map<string, Array<{ id: string; type: string }>>();
  for (const r of companiesRes.results ?? []) {
    coByDeal.set(
      r.from.id,
      (r.to ?? []).map((t) => ({ id: String(t.toObjectId), type: "deal_to_company" })),
    );
  }
  const ctByDeal = new Map<string, Array<{ id: string; type: string }>>();
  for (const r of contactsRes.results ?? []) {
    ctByDeal.set(
      r.from.id,
      (r.to ?? []).map((t) => ({ id: String(t.toObjectId), type: "deal_to_contact" })),
    );
  }

  const merged: HubspotDeal[] = batch.results.map((d) => ({
    ...d,
    associations: {
      companies: { results: coByDeal.get(d.id) ?? [] },
      contacts: { results: ctByDeal.get(d.id) ?? [] },
    },
  }));

  return { results: merged, paging: search.paging };
}

export interface HubspotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    jobtitle?: string;
  };
}

export async function getContactsByIds(
  client: HubspotClient,
  ids: string[],
): Promise<HubspotContact[]> {
  if (ids.length === 0) return [];
  // HubSpot's batch read caps at 100 inputs per call.
  const CHUNK = 100;
  const out: HubspotContact[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const res = await client.post<{ results: HubspotContact[] }>(
      "/crm/v3/objects/contacts/batch/read",
      {
        properties: ["email", "firstname", "lastname", "company", "jobtitle"],
        inputs: slice.map((id) => ({ id })),
      },
    );
    out.push(...res.results);
  }
  return out;
}

export interface HubspotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    website?: string;
    industry?: string;
    city?: string;
    country?: string;
    numberofemployees?: string;
    description?: string;
  };
}

export async function getCompaniesByIds(
  client: HubspotClient,
  ids: string[],
): Promise<HubspotCompany[]> {
  if (ids.length === 0) return [];
  // HubSpot batch read caps at 100 inputs per call. Match the pagination
  // behaviour of getContactsByIds.
  const CHUNK = 100;
  const out: HubspotCompany[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const res = await client.post<{ results: HubspotCompany[] }>(
      "/crm/v3/objects/companies/batch/read",
      {
        properties: [
          "name",
          "domain",
          "website",
          "industry",
          "city",
          "country",
          "numberofemployees",
          "description",
        ],
        inputs: slice.map((id) => ({ id })),
      },
    );
    out.push(...res.results);
  }
  return out;
}

// --- Engagements: notes + emails -------------------------------------------
// HubSpot's CRM v3 models engagements as first-class objects at
// /crm/v3/objects/{notes,emails}. The deprecated /engagements/v1 surface is
// avoided — new integrations should use the object APIs (richer associations,
// proper pagination, batch-read).

export interface HubspotNote {
  id: string;
  properties: {
    hs_note_body?: string;
    hs_timestamp?: string;
    hs_createdate?: string;
    hs_lastmodifieddate?: string;
    hs_created_by?: string;
    hubspot_owner_id?: string;
  };
}

export interface HubspotEmail {
  id: string;
  properties: {
    hs_email_subject?: string;
    hs_email_text?: string;
    hs_email_direction?: string; // "INCOMING_EMAIL" | "EMAIL" (outbound)
    hs_email_from_email?: string;
    hs_email_to_email?: string;
    hs_email_cc_email?: string;
    hs_timestamp?: string;
    hs_createdate?: string;
    hs_lastmodifieddate?: string;
    hs_created_by?: string;
    hubspot_owner_id?: string;
  };
}

const NOTE_PROPERTIES = [
  "hs_note_body",
  "hs_timestamp",
  "hs_createdate",
  "hs_lastmodifieddate",
  "hs_created_by",
  "hubspot_owner_id",
];

const EMAIL_PROPERTIES = [
  "hs_email_subject",
  "hs_email_text",
  "hs_email_direction",
  "hs_email_from_email",
  "hs_email_to_email",
  "hs_email_cc_email",
  "hs_timestamp",
  "hs_createdate",
  "hs_lastmodifieddate",
  "hs_created_by",
  "hubspot_owner_id",
];

/**
 * Search the {notes,emails} object for records modified since `modifiedSinceMs`,
 * sorted oldest→newest so the caller can advance a modifiedAt cursor safely.
 * Returns IDs + the cursor for the next page (HubSpot's `paging.next.after`).
 */
async function searchEngagementsSince(
  client: HubspotClient,
  opts: {
    objectType: "notes" | "emails";
    modifiedSinceMs: number;
    limit?: number;
    after?: string;
  },
): Promise<{ ids: string[]; nextAfter?: string }> {
  const res = await client.post<{
    results: Array<{ id: string }>;
    paging?: { next?: { after: string } };
  }>(`/crm/v3/objects/${opts.objectType}/search`, {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "hs_lastmodifieddate",
            operator: "GTE",
            value: String(opts.modifiedSinceMs),
          },
        ],
      },
    ],
    // Ascending so the cursor monotonically advances with each page.
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
    limit: opts.limit ?? 100,
    after: opts.after,
  });
  return {
    ids: res.results.map((r) => r.id),
    nextAfter: res.paging?.next?.after,
  };
}

export async function searchNotesSince(
  client: HubspotClient,
  opts: { modifiedSinceMs: number; limit?: number; after?: string },
): Promise<{ ids: string[]; nextAfter?: string }> {
  return searchEngagementsSince(client, { ...opts, objectType: "notes" });
}

export async function searchEmailsSince(
  client: HubspotClient,
  opts: { modifiedSinceMs: number; limit?: number; after?: string },
): Promise<{ ids: string[]; nextAfter?: string }> {
  return searchEngagementsSince(client, { ...opts, objectType: "emails" });
}

/**
 * Search engagements associated to a specific HubSpot company. The scoped
 * version of `searchEngagementsSince` — filters server-side by the special
 * `associations.company` property so we never ingest activities for
 * companies outside the caller's watchlist. Sorted oldest-first for
 * monotonic cursor advancement.
 */
export async function searchEngagementsForCompany(
  client: HubspotClient,
  opts: {
    objectType: "notes" | "emails";
    hubspotCompanyId: string;
    modifiedSinceMs: number;
    limit?: number;
    after?: string;
  },
): Promise<{ ids: string[]; nextAfter?: string }> {
  const res = await client.post<{
    results: Array<{ id: string }>;
    paging?: { next?: { after: string } };
  }>(`/crm/v3/objects/${opts.objectType}/search`, {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "associations.company",
            operator: "EQ",
            value: opts.hubspotCompanyId,
          },
          {
            propertyName: "hs_lastmodifieddate",
            operator: "GTE",
            value: String(opts.modifiedSinceMs),
          },
        ],
      },
    ],
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
    limit: opts.limit ?? 100,
    after: opts.after,
  });
  return {
    ids: res.results.map((r) => r.id),
    nextAfter: res.paging?.next?.after,
  };
}

/**
 * Look up a HubSpot company by its primary domain. Used by the activity
 * sync to bootstrap a HubSpot id for watchlisted Fuel companies we haven't
 * seen before (no cached `integration_company_links` row, no deal in
 * `pipeline_companies` to piggyback off).
 */
export async function findHubspotCompanyByDomain(
  client: HubspotClient,
  domain: string,
): Promise<HubspotCompany | null> {
  const res = await client.post<{ results: HubspotCompany[] }>(
    "/crm/v3/objects/companies/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "domain", operator: "EQ", value: domain },
          ],
        },
      ],
      properties: ["name", "domain", "website"],
      limit: 1,
    },
  );
  return res.results[0] ?? null;
}

export async function batchReadNotes(
  client: HubspotClient,
  ids: string[],
): Promise<HubspotNote[]> {
  if (ids.length === 0) return [];
  const CHUNK = 100;
  const out: HubspotNote[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const res = await client.post<{ results: HubspotNote[] }>(
      "/crm/v3/objects/notes/batch/read",
      { properties: NOTE_PROPERTIES, inputs: slice.map((id) => ({ id })) },
    );
    out.push(...res.results);
  }
  return out;
}

export async function batchReadEmails(
  client: HubspotClient,
  ids: string[],
): Promise<HubspotEmail[]> {
  if (ids.length === 0) return [];
  const CHUNK = 100;
  const out: HubspotEmail[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const res = await client.post<{ results: HubspotEmail[] }>(
      "/crm/v3/objects/emails/batch/read",
      { properties: EMAIL_PROPERTIES, inputs: slice.map((id) => ({ id })) },
    );
    out.push(...res.results);
  }
  return out;
}

/**
 * Generic v4 associations batch-read. Observed quirk: the v3 batch/read body
 * silently drops the `associations` key, so we always fetch associations
 * through v4 and merge on the caller side — same pattern listDealsInPipeline
 * already uses.
 */
export async function batchReadAssociations(
  client: HubspotClient,
  opts: { fromType: string; toType: string; ids: string[] },
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (opts.ids.length === 0) return result;
  const CHUNK = 100;
  for (let i = 0; i < opts.ids.length; i += CHUNK) {
    const slice = opts.ids.slice(i, i + CHUNK);
    const res = await client.post<{
      results: Array<{
        from: { id: string };
        to: Array<{ toObjectId: string }>;
      }>;
    }>(`/crm/v4/associations/${opts.fromType}/${opts.toType}/batch/read`, {
      inputs: slice.map((id) => ({ id })),
    });
    for (const r of res.results ?? []) {
      result.set(
        r.from.id,
        (r.to ?? []).map((t) => String(t.toObjectId)),
      );
    }
  }
  return result;
}

export interface HubspotOwner {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Resolve HubSpot owner ids to user emails. Owner ids surface on notes +
 * emails as `hubspot_owner_id`; the raw id is useless in a context feed, so
 * we translate to email here. The /owners endpoint only supports single-id
 * GETs, so we fan out with the client's built-in rate limiter.
 */
export async function getOwnersByIds(
  client: HubspotClient,
  ids: string[],
): Promise<Map<string, HubspotOwner>> {
  const out = new Map<string, HubspotOwner>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (const id of unique) {
    try {
      const o = await client.get<HubspotOwner>(`/crm/v3/owners/${id}`);
      out.set(id, o);
    } catch {
      // Deleted / restricted owners just won't translate; skip.
    }
  }
  return out;
}
