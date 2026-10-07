import "server-only";
import aws4 from "aws4";
import { captureFuelDataException, captureIntegrationException, captureNeptuneEmptyFallback } from "@/lib/sentry/capture";
import {
  normalizeCompanyName,
  uniqueDomainToUuid,
  uniqueNormalizedNameToUuid,
} from "@/lib/investor-company-resolve";
import { buildCompanySearchOsBody } from "@/lib/company-search-cursor";
import { clampSearchLimit, clampSearchOffset } from "@/lib/company-search-paging";
import {
  buildGetInvestorGremlin,
  buildSearchInvestorsGremlin,
  investorSearchAttempts,
} from "@/lib/fuel-data-investor-gremlin";

export { normalizeCompanyName } from "@/lib/investor-company-resolve";
export { clampSearchLimit, clampSearchOffset } from "@/lib/company-search-paging";
export {
  encodeCompanySearchCursor,
  decodeCompanySearchCursor,
  resolveCompanySearchPagination,
  InvalidCompanySearchCursorError,
} from "@/lib/company-search-cursor";
export {
  buildGetInvestorGremlin,
  buildSearchInvestorsGremlin,
  investorSearchAttempts,
  INVESTOR_ORG_LABEL,
} from "@/lib/fuel-data-investor-gremlin";

const OS_ENDPOINT = process.env.FUEL_DATA_OPENSEARCH_ENDPOINT;
const NEPTUNE_ENDPOINT = process.env.FUEL_DATA_NEPTUNE_ENDPOINT;
const REGION = process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? "us-east-2";

/** Local/dev without fuel-data — expected; do not capture or overlay. */
class FuelDataOpenSearchNotConfiguredError extends Error {
  constructor() {
    super("FUEL_DATA_OPENSEARCH_ENDPOINT not set");
    this.name = "FuelDataOpenSearchNotConfiguredError";
  }
}

function isOpenSearchConfigured(): boolean {
  return Boolean(OS_ENDPOINT?.trim());
}

function isOpenSearchNotConfiguredError(error: unknown): boolean {
  return (
    error instanceof FuelDataOpenSearchNotConfiguredError ||
    (error instanceof Error && error.message === "FUEL_DATA_OPENSEARCH_ENDPOINT not set")
  );
}

function captureOpenSearchFailure(error: unknown, operation: string, logMessage: string): void {
  if (isOpenSearchNotConfiguredError(error)) return;
  captureFuelDataException(error, operation);
  console.error(logMessage, error);
}

export interface CompanyHit {
  uuid: string;
  name: string;
  domain?: string;
  shortDescription?: string;
  logoUrl?: string;
  categories?: string[];
  employeeCount?: string;
  totalFundingUsd?: number;
  foundedOn?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
}

/** Optional filters for company search — extend with new keys as fields are indexed. */
export type CompanySearchFilters = {
  country?: string;
  city?: string;
  /**
   * Category label(s) matching OpenSearch `categories` (e.g. "fintech", "saas").
   * Accepts one value, comma-separated values, or an array (repeated params).
   */
  category?: string | string[];
  /**
   * Employee-count band(s) (e.g. "11-50", "1001-5000"), not a numeric headcount.
   * Accepts one band string, comma-separated bands, or an array of bands.
   */
  employeeCount?: string | string[];
};

export type SearchCompaniesOptions = {
  limit?: number;
  /** OpenSearch `from` — non-negative; OS enforces max_result_window (default 10000). */
  offset?: number;
  filters?: CompanySearchFilters;
  /**
   * Cursor pagination (`search_after`). When set, `from`/`offset` are ignored.
   * Empty/omitted `searchAfter` = first cursor page.
   */
  searchAfter?: unknown[];
  /**
   * `offset` (default) = `from`/`size` (≤10k window).
   * `cursor` = `search_after` + deterministic sort; allows empty-q match_all crawl.
   */
  pagination?: "offset" | "cursor";
};

export type SearchCompaniesPage = {
  hits: CompanyHit[];
  /** Raw OpenSearch `sort` values from last hit — encode as public `nextCursor`. */
  nextSearchAfter?: unknown[];
};

type OsQueryClause = Record<string, unknown>;

function normalizeFilterValue(raw: string | undefined, maxLen: number): string | null {
  if (!raw) return null;
  const v = raw.trim().slice(0, maxLen);
  return v.length > 0 ? v : null;
}

const MAX_MULTI_FILTER_VALUES = 20;

/**
 * Normalize multi-value filter input into a deduped list.
 * Supports a single value, comma-separated values, or an array (repeated params).
 */
export function normalizeMultiFilterValues(
  raw: string | string[] | undefined,
  maxLen = 64,
  maxItems = MAX_MULTI_FILTER_VALUES,
): string[] {
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    for (const token of String(part).split(",")) {
      const v = token.trim().slice(0, maxLen);
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
      if (out.length >= maxItems) return out;
    }
  }
  return out;
}

/**
 * Normalize employee-count band filter input into a deduped list.
 * Supports a single band, comma-separated bands, or an array (repeated params).
 */
export function normalizeEmployeeCountBands(
  raw: string | string[] | undefined,
  maxLen = 64,
): string[] {
  return normalizeMultiFilterValues(raw, maxLen);
}

/**
 * Normalize category filter input. Lowercases for OpenSearch `keyword_lowercase`.
 */
export function normalizeCategoryFilters(
  raw: string | string[] | undefined,
  maxLen = 128,
): string[] {
  const labels = normalizeMultiFilterValues(raw, maxLen);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    const v = label.toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * OpenSearch `organizations.categories` is a text array of category labels
 * (analyzer: keyword_lowercase). CB bulk CSV uses `category_list` /
 * `category_groups_list`, but those fields are not present on this index
 * (exists count 0) — do not invent or alias them.
 */
function extractCategoryLabels(raw: unknown): string[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      // Prefer `name` (legacy nested shape); accept `value` if present.
      const label = o.name ?? o.value;
      if (typeof label === "string" && label.trim()) out.push(label.trim());
    }
  }
  return out;
}

/**
 * Build OpenSearch `filter` clauses from public/internal filter options.
 * Returns an empty array when no filters are set so callers can omit `filter`.
 */
function buildCompanySearchFilters(filters: CompanySearchFilters | undefined): OsQueryClause[] {
  if (!filters) return [];
  const clauses: OsQueryClause[] = [];

  const country = normalizeFilterValue(filters.country, 64);
  if (country) {
    clauses.push({
      bool: {
        should: [
          { term: { country_code: country } },
          { term: { "country_code.keyword": country } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const city = normalizeFilterValue(filters.city, 128);
  if (city) {
    clauses.push({
      bool: {
        should: [{ term: { city } }, { term: { "city.keyword": city } }, { match_phrase: { city } }],
        minimum_should_match: 1,
      },
    });
  }

  const categories = normalizeCategoryFilters(filters.category, 128);
  if (categories.length > 0) {
    // OR across labels — one OpenSearch request via `terms` on keyword_lowercase text.
    clauses.push({ terms: { categories } });
  }

  const employeeBands = normalizeEmployeeCountBands(filters.employeeCount, 64);
  if (employeeBands.length > 0) {
    // OR across bands — one OpenSearch request via `terms`.
    clauses.push({
      bool: {
        should: [
          { terms: { employee_count: employeeBands } },
          { terms: { "employee_count.keyword": employeeBands } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  return clauses;
}

function mapOrganizationHit(h: {
  _id: string;
  _source: Record<string, unknown>;
}): CompanyHit {
  const s = h._source;
  const categories = extractCategoryLabels(s.categories);
  return {
    uuid: (s.uuid as string) ?? h._id,
    name: (s.name as string) ?? "",
    domain: s.domain as string | undefined,
    shortDescription: s.short_description as string | undefined,
    logoUrl: s.logo_url as string | undefined,
    categories: categories.length > 0 ? categories : undefined,
    employeeCount: s.employee_count as string | undefined,
    totalFundingUsd: s.total_funding_usd as number | undefined,
    foundedOn: s.founded_on as string | undefined,
    locationCity: (s.city ?? s.location_city) as string | undefined,
    locationState: (s.state_code ?? s.location_state) as string | undefined,
    locationCountry: (s.country_code ?? s.location_country_code) as string | undefined,
  };
}

/**
 * Strip a raw domain-or-URL input to its bare hostname without www/protocol/path.
 * Returns null for anything unusable (empty, malformed, obvious placeholders).
 */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  if (!d) return null;
  // URL-parse if protocol present; otherwise treat as bare domain.
  if (/^https?:\/\//.test(d)) {
    try {
      d = new URL(d).hostname;
    } catch {
      return null;
    }
  }
  // Strip everything after first slash (path), strip port, strip www.
  d = d.split("/")[0].split(":")[0].replace(/^www\./, "").trim();
  if (!d) return null;
  // Reject obvious placeholders / invalid.
  if (!/\./.test(d)) return null;
  if (d.length < 4) return null;
  return d;
}

interface OsHit {
  _id: string;
  _source: Record<string, unknown>;
  sort?: unknown[];
}

interface OsResponse {
  hits?: { total?: { value: number } | number; hits?: OsHit[] };
}

function host(endpoint: string): string {
  return endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function opensearch<T>(path: string, body: unknown): Promise<T> {
  const endpoint = OS_ENDPOINT?.trim();
  if (!endpoint) {
    return { hits: { total: { value: 0 }, hits: [] } } as T;
  }
  const endpointHost = host(endpoint);

  const signed = aws4.sign(
    {
      host: endpointHost,
      method: "POST",
      path,
      service: "es",
      region: REGION,
      headers: { "Content-Type": "application/json", host: endpointHost },
      body: JSON.stringify(body),
    },
    // aws4 reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN
    // from process.env when credentials aren't passed, which is what Lambda sets.
  );

  const res = await fetch(`https://${endpointHost}${path}`, {
    method: "POST",
    headers: signed.headers as Record<string, string>,
    body: signed.body as string,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenSearch ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface CompanyDoc {
  uuid: string;
  name: string;
  shortDescription?: string;
  homepageUrl?: string;
  domain?: string;
  logoUrl?: string;
  foundedOn?: string;
  status?: string;
  employeeCount?: string;
  totalFundingUsd?: number;
  lastFundingOn?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  locationRegion?: string;
  numFundingRounds?: number;
  numExits?: number;
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  githubUrl?: string;
  instagramUrl?: string;
  mediumUrl?: string;
  cbUrl?: string;
  cikIdentifier?: string;
  keywords?: string[];
  categories?: { id?: string; name: string }[];
  raw: Record<string, unknown>;
}

function toCompanyDoc(uuid: string, source: Record<string, unknown>): CompanyDoc {
  const categoryLabels = extractCategoryLabels(source.categories);
  return {
    uuid: (source.uuid as string) ?? uuid,
    name: (source.name as string) ?? "",
    shortDescription: source.short_description as string | undefined,
    homepageUrl: source.homepage_url as string | undefined,
    domain: source.domain as string | undefined,
    logoUrl: source.logo_url as string | undefined,
    foundedOn: source.founded_on as string | undefined,
    status: source.status as string | undefined,
    employeeCount: source.employee_count as string | undefined,
    totalFundingUsd: source.total_funding_usd as number | undefined,
    lastFundingOn: source.last_funding_on as string | undefined,
    locationCity: (source.location_city ?? source.city) as string | undefined,
    locationState: (source.location_state ?? source.state_code) as string | undefined,
    locationCountry: (source.location_country_code ?? source.country_code) as string | undefined,
    locationRegion: source.region as string | undefined,
    numFundingRounds: source.num_funding_rounds as number | undefined,
    numExits: ((): number | undefined => {
      const v = source.num_exits;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    })(),
    twitterUrl: source.twitter_url as string | undefined,
    linkedinUrl: source.linkedin_url as string | undefined,
    facebookUrl: source.facebook_url as string | undefined,
    githubUrl: source.github_url as string | undefined,
    instagramUrl: source.instagram_url as string | undefined,
    mediumUrl: source.medium_url as string | undefined,
    cbUrl: source.cb_url as string | undefined,
    cikIdentifier: source.cik_identifier as string | undefined,
    keywords: (source.keywords as unknown[] | undefined)?.map((k) => String(k)),
    categories: categoryLabels.map((name) => ({ name })),
    raw: source,
  };
}

export async function getCompany(uuid: string): Promise<CompanyDoc | null> {
  const body = {
    size: 1,
    query: {
      bool: {
        should: [
          { term: { "uuid.keyword": uuid } },
          { term: { uuid } },
          { term: { _id: uuid } },
        ],
      },
    },
  };
  const res = await opensearch<OsResponse>("/organizations/_search", body);
  const hit = res.hits?.hits?.[0];
  if (!hit) return null;
  return toCompanyDoc(uuid, hit._source as Record<string, unknown>);
}

// ---------- Neptune (Gremlin) ----------

interface GremlinResponse {
  result: { data: unknown };
  status: { code: number };
}

// Neptune returns GraphSON 3.0 by default: values wrapped in { "@type": ..., "@value": ... }.
// Recursively unwrap to plain JS structures.
function unwrapGraphSON(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(unwrapGraphSON);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("@type" in o && "@value" in o) {
      const type = String(o["@type"]);
      const value = o["@value"];
      if (type === "g:List" || type === "g:Set" || type === "g:BulkSet") {
        return unwrapGraphSON(value);
      }
      if (type === "g:Map" && Array.isArray(value)) {
        // g:Map is serialized as a flat key/value array
        const result: Record<string, unknown> = {};
        for (let i = 0; i < value.length; i += 2) {
          const key = String(unwrapGraphSON(value[i]));
          result[key] = unwrapGraphSON(value[i + 1]);
        }
        return result;
      }
      // Scalars (g:Int64, g:Date, etc.) — return their primitive value
      return unwrapGraphSON(value);
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = unwrapGraphSON(val);
    return out;
  }
  return v;
}

export async function neptuneQuery<T = unknown>(gremlin: string): Promise<T> {
  return neptune<T>(gremlin);
}

/**
 * Hard cap on per-Gremlin-query wall time. Without it, a single slow
 * traversal can hang an entire SSR render until Lambda's 5-minute kill —
 * we saw 235s outliers chewing concurrency. Caller can always wrap multiple
 * calls in their own bounded fan-out for higher-volume work.
 */
const NEPTUNE_TIMEOUT_MS = Number(process.env.NEPTUNE_TIMEOUT_MS ?? "8000");

async function neptune<T>(gremlin: string): Promise<T> {
  if (!NEPTUNE_ENDPOINT) throw new Error("FUEL_DATA_NEPTUNE_ENDPOINT not set");
  // Include the port in the signing host so the canonical Host header matches
  // what fetch actually sends on the wire. aws4 signs `host` verbatim.
  const hostWithPort = host(NEPTUNE_ENDPOINT);
  const body = JSON.stringify({ gremlin });
  const signed = aws4.sign({
    host: hostWithPort,
    method: "POST",
    path: "/gremlin",
    service: "neptune-db",
    region: REGION,
    headers: { "Content-Type": "application/json" },
    body,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NEPTUNE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${NEPTUNE_ENDPOINT.replace(/\/$/, "")}/gremlin`, {
      method: "POST",
      headers: signed.headers as Record<string, string>,
      body: signed.body as string,
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error(`Neptune timeout after ${NEPTUNE_TIMEOUT_MS}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Neptune ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as GremlinResponse;
  return unwrapGraphSON(json.result.data) as T;
}

function safeId(id: string): string {
  // Constrain to UUID/alphanumeric chars — ids are user-supplied and get inlined
  // in the Gremlin script (HTTP Gremlin doesn't accept bindings).
  if (!/^[a-zA-Z0-9_\-]{1,100}$/.test(id)) throw new Error("invalid neptune vertex id");
  return id;
}

export type ContextItemKind = "article" | "earned" | "podcast";

export interface ContextItem {
  id: string;
  kind: ContextItemKind;
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  image?: string;
  publishedDate?: string;
  keywords?: string[];
}

// Legacy alias — kept so existing route imports compile.
export type Article = ContextItem;

function firstOrString(v: unknown): string | undefined {
  if (Array.isArray(v)) return v[0] != null ? String(v[0]) : undefined;
  return v != null ? String(v) : undefined;
}

function listOrString(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.map(String);
  if (v == null) return undefined;
  return [String(v)];
}

async function fetchEdgeContent(
  id: string,
  edge: string,
  kind: ContextItemKind,
  limit: number,
): Promise<ContextItem[]> {
  try {
    const gremlin = `g.V('${id}').out('${edge}').limit(${limit}).valueMap(true)`;
    const rows = await neptune<Array<Record<string, unknown>>>(gremlin);
    return rows.map((item) => ({
      id: String(item.id ?? item["~id"] ?? ""),
      kind,
      title: firstOrString(item.title ?? item.name),
      description: firstOrString(item.description),
      url: firstOrString(item.url ?? item.source_url ?? item.article_url ?? item.audio_url),
      siteName: firstOrString(item.site_name ?? item.publisher ?? item.podcast_name),
      image: firstOrString(item.image ?? item.image_url),
      publishedDate: firstOrString(item.published_time ?? item.published_date ?? item.release_date),
      keywords: listOrString(item.keywords),
    }));
  } catch {
    return [];
  }
}

export async function getCompanyArticles(uuid: string, limit = 50): Promise<ContextItem[]> {
  const id = safeId(uuid);
  // Parallel per-edge queries: a single combined outE('a','b','c') blows Neptune's
  // memory on fat companies. Splitting makes each query finish in <2s and isolates
  // failures (one empty edge type doesn't stop the others).
  const perKindLimit = Math.max(5, Math.min(40, Math.ceil(limit / 3)));
  const [owned, earned, podcasts, curated] = await Promise.all([
    fetchEdgeContent(id, "has_article", "article", perKindLimit),
    fetchEdgeContent(id, "has_earned_content", "earned", perKindLimit),
    fetchEdgeContent(id, "has_podcast", "podcast", Math.min(perKindLimit, 15)),
    fetchEdgeContent(id, "has_curated_article", "article", perKindLimit),
  ]);
  const all = [...owned, ...earned, ...podcasts, ...curated];
  all.sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""));
  return all.slice(0, limit);
}

export interface InvestorRef {
  /** Neptune vertex id for the funding participant (lookup key). May be empty. */
  id: string;
  name: string;
  /** Optional domain from the graph vertex — improves OpenSearch matching. */
  domain?: string;
  /**
   * OpenSearch organization uuid when a company profile exists.
   * Funding UI links to `/company/{companyUuid}` only when set — never to
   * `/investors/{id}` (avoids 404s for non-investor / unresolved verts).
   */
  companyUuid?: string;
}

export interface FundingRound {
  id: string;
  announcedOn?: string;
  investmentType?: string;
  raisedAmountUsd?: number;
  raisedAmountCurrency?: string;
  /** Names only — preserved for back-compat; always matches investors[].name. */
  investorNames?: string[];
  /** Investor refs; link via companyUuid when OpenSearch profile exists. */
  investors?: InvestorRef[];
}

export async function getCompanyFunding(uuid: string, limit = 50): Promise<FundingRound[]> {
  const id = safeId(uuid);
  const lim = Math.max(1, Math.min(200, limit));
  // Investors attach to funding rounds via the `invested_in` edge pointing
  // FROM the investor TO the round (investor -[invested_in]-> round). We
  // union with the legacy `has_investor` direction (round -[has_investor]->
  // investor) in case the graph ever shipped under that shape, then dedup.
  // Keep raw vertex id + domain for OpenSearch company resolution (same
  // cascade as Investors Network: id → domain → strict name).
  const gremlin =
    `g.V('${id}').out('has_funding').limit(${lim})` +
    `.project('round','investors')` +
    `.by(valueMap(true))` +
    `.by(union(__.in('invested_in'), __.out('has_investor')).dedup()` +
    `.project('id','name','domain')` +
    `.by(id)` +
    `.by(coalesce(values('name'), constant('')))` +
    `.by(coalesce(values('domain'), values('homepage_url'), values('website'), constant('')))` +
    `.fold())`;
  try {
    const rows = await neptune<
      Array<{
        round: Record<string, unknown>;
        investors: Array<Record<string, unknown>>;
      }>
    >(gremlin);

    const rawByRound = rows.map((r) => {
      const v = r.round ?? {};
      const invs = (r.investors ?? [])
        .map((i, idx) => {
          const rawId = String(i.id ?? "");
          const name = String(i.name ?? "");
          const domainRaw = String(i.domain ?? "");
          const domain = domainRaw ? normalizeDomain(domainRaw) ?? undefined : undefined;
          // Synthetic lookup key when vertex id missing — lets name/domain
          // cascade still run without colliding empty-string keys.
          const lookupId = rawId || `funding:${idx}:${name}`;
          return { lookupId, id: rawId, name, domain };
        })
        .filter((i) => i.id || i.name);
      return { round: v, invs };
    });

    const companyByLookupId = await resolveCompanyUuidsForInvestors(
      rawByRound.flatMap(({ invs }) =>
        invs.map((i) => ({ id: i.lookupId, name: i.name, domain: i.domain })),
      ),
    );

    const items: FundingRound[] = rawByRound.map(({ round: v, invs }) => {
      const investors: InvestorRef[] = invs.map((i) => ({
        id: i.id,
        name: i.name,
        domain: i.domain,
        companyUuid: companyByLookupId.get(i.lookupId),
      }));
      return {
        id: String(v.id ?? v["~id"] ?? ""),
        announcedOn: firstOrString(v.announced_on),
        investmentType: firstOrString(v.investment_type),
        raisedAmountUsd:
          typeof v.raised_amount_usd === "number"
            ? (v.raised_amount_usd as number)
            : Array.isArray(v.raised_amount_usd) && typeof (v.raised_amount_usd as unknown[])[0] === "number"
              ? ((v.raised_amount_usd as unknown[])[0] as number)
              : undefined,
        raisedAmountCurrency: firstOrString(v.raised_amount_currency_code),
        investorNames: investors.map((i) => i.name).filter(Boolean),
        investors,
      };
    });
    items.sort((a, b) => (b.announcedOn ?? "").localeCompare(a.announcedOn ?? ""));
    return items;
  } catch (e) {
    captureNeptuneEmptyFallback(e, "get_company_funding", { companyUuid: uuid });
    return [];
  }
}

/**
 * Escape a Gremlin single-quoted string literal. Neptune's HTTP Gremlin
 * endpoint doesn't support parameter bindings, so user input has to be
 * inlined — we strip dangerous characters and escape what's left. Only
 * apostrophes and backslashes need escaping inside single-quoted strings.
 */
function escapeGremlinString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface PersonHit {
  id: string;
  name?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  photoUrl?: string;
}

/**
 * Cross-org people search against Neptune. Uses textContains on the name
 * property. The person vertex label is best-guess here ("person") until
 * the stage probe confirms it — if it returns empty the fallback is
 * manual advisor entry, so the UI degrades gracefully.
 */
export async function searchPeople(query: string, limit = 20): Promise<PersonHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const lim = Math.max(1, Math.min(50, limit));
  const escaped = escapeGremlinString(q.toLowerCase());
  // Project common properties — valueMap(true) would pull the id key too,
  // but project() gives us stable output keys regardless of the vertex schema.
  const gremlin =
    `g.V().hasLabel('person')` +
    `.has('name', textContainsFuzzy('${escaped}'))` +
    `.limit(${lim})` +
    `.project('id','name','title','company','linkedin_url','image_url')` +
    `.by(id)` +
    `.by(coalesce(values('name'), constant('')))` +
    `.by(coalesce(values('title'), constant('')))` +
    `.by(coalesce(values('current_company'), constant('')))` +
    `.by(coalesce(values('linkedin_url'), constant('')))` +
    `.by(coalesce(values('image_url'), constant('')))`;
  try {
    const rows = await neptune<Array<Record<string, unknown>>>(gremlin);
    return rows.map((r) => ({
      id: String(r.id ?? ""),
      name: (r.name as string) || undefined,
      title: (r.title as string) || undefined,
      company: (r.company as string) || undefined,
      linkedinUrl: (r.linkedin_url as string) || undefined,
      photoUrl: (r.image_url as string) || undefined,
    }));
  } catch {
    return [];
  }
}

/** Single person vertex by id — used to hydrate advisor details. */
export async function getPerson(id: string): Promise<PersonHit | null> {
  const vid = safeId(id);
  const gremlin = `g.V('${vid}').hasLabel('person').valueMap(true)`;
  try {
    const [v] = await neptune<Array<Record<string, unknown>>>(gremlin);
    if (!v) return null;
    return {
      id: String(v.id ?? v["~id"] ?? vid),
      name:
        firstOrString(v.name) ??
        ([firstOrString(v.first_name), firstOrString(v.last_name)].filter(Boolean).join(" ") ||
          undefined),
      title: firstOrString(v.title),
      company: firstOrString(v.current_company),
      linkedinUrl: firstOrString(v.linkedin_url),
      photoUrl: firstOrString(v.image_url),
    };
  } catch {
    return null;
  }
}

export async function getCompanyPeople(uuid: string, limit = 12): Promise<Array<{
  id: string;
  name?: string;
  title?: string;
  startedOn?: string;
  linkedinUrl?: string;
}>> {
  const id = safeId(uuid);
  const lim = Math.max(1, Math.min(50, limit));
  const gremlin =
    `g.V('${id}')` +
    ".outE('has_employee').has('is_current', true).as('e')" +
    ".inV().as('p')" +
    ".select('e','p')" +
    ".by(valueMap('title','started_on'))" +
    ".by(valueMap(true,'name','first_name','last_name','linkedin_url'))" +
    `.limit(${lim})`;
  try {
    const rows = await neptune<Array<{ e: Record<string, unknown>; p: Record<string, unknown> }>>(
      gremlin,
    );
    return rows.map((r) => {
      const p = r.p;
      const e = r.e;
      const first = firstOrString(p.first_name);
      const last = firstOrString(p.last_name);
      const full = firstOrString(p.name) ?? ([first, last].filter(Boolean).join(" ") || undefined);
      return {
        id: String(p.id ?? p["~id"] ?? ""),
        name: full,
        title: firstOrString(e.title),
        startedOn: firstOrString(e.started_on),
        linkedinUrl: firstOrString(p.linkedin_url),
      };
    });
  } catch {
    return [];
  }
}

// ---------- OpenSearch: search ----------

export async function searchSimilarCompanies(uuid: string, limit = 6): Promise<CompanyHit[]> {
  const body = {
    size: limit,
    _source: [
      "uuid",
      "name",
      "domain",
      "short_description",
      "employee_count",
      "total_funding_usd",
      "city",
      "state_code",
      "country_code",
    ],
    query: {
      bool: {
        must: [
          {
            more_like_this: {
              fields: ["name", "short_description", "keywords", "categories"],
              like: [{ _index: "organizations", _id: uuid }],
              min_term_freq: 1,
              min_doc_freq: 1,
              max_query_terms: 25,
            },
          },
        ],
        must_not: [{ term: { "uuid.keyword": uuid } }, { term: { uuid } }],
      },
    },
  };
  try {
    const res = await opensearch<OsResponse>("/organizations/_search", body);
    const hits = res.hits?.hits ?? [];
    return hits.map((h) => {
      const s = h._source as Record<string, unknown>;
      return {
        uuid: (s.uuid as string) ?? h._id,
        name: (s.name as string) ?? "",
        domain: s.domain as string | undefined,
        shortDescription: s.short_description as string | undefined,
        employeeCount: s.employee_count as string | undefined,
        totalFundingUsd: s.total_funding_usd as number | undefined,
        foundedOn: undefined,
        locationCity: s.city as string | undefined,
        locationState: s.state_code as string | undefined,
        locationCountry: s.country_code as string | undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Bulk resolve uuid → domain for a list of fuel-data (Neptune/OpenSearch)
 * UUIDs. Returns a sparse map — any UUID not found is simply absent. Used by
 * the Granola sync to pre-index watchlist company domains in one OpenSearch
 * call instead of N round-trips.
 */
export async function getDomainsByUuids(uuids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (uuids.length === 0) return out;
  const body = {
    size: Math.min(uuids.length, 500),
    _source: ["uuid", "domain"],
    query: {
      bool: {
        should: [
          { terms: { "uuid.keyword": uuids } },
          { terms: { uuid: uuids } },
          { terms: { _id: uuids } },
        ],
      },
    },
  };
  try {
    const res = await opensearch<OsResponse>("/organizations/_search", body);
    for (const hit of res.hits?.hits ?? []) {
      const src = hit._source as Record<string, unknown>;
      const uuid = (src.uuid as string | undefined) ?? (hit._id as string | undefined);
      const d = normalizeDomain(src.domain as string | undefined);
      if (uuid && d) out.set(uuid, d);
    }
  } catch (e) {
    captureOpenSearchFailure(e, "get_domains_by_uuids", "getDomainsByUuids failed");
  }
  return out;
}

/** Bulk resolve uuid → name for fuel-data organizations. Sparse map; missing ids omitted. */
export async function getNamesByUuids(uuids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (uuids.length === 0) return out;
  const body = {
    size: Math.min(uuids.length, 500),
    _source: ["uuid", "name"],
    query: {
      bool: {
        should: [
          { terms: { "uuid.keyword": uuids } },
          { terms: { uuid: uuids } },
          { terms: { _id: uuids } },
        ],
      },
    },
  };
  try {
    const res = await opensearch<OsResponse>("/organizations/_search", body);
    for (const hit of res.hits?.hits ?? []) {
      const src = hit._source as Record<string, unknown>;
      const uuid = (src.uuid as string | undefined) ?? (hit._id as string | undefined);
      const name = typeof src.name === "string" ? src.name.trim() : "";
      if (uuid && name) out.set(uuid, name);
    }
  } catch (e) {
    captureOpenSearchFailure(e, "get_names_by_uuids", "getNamesByUuids failed");
  }
  return out;
}

/**
 * Exact-domain lookup — single term query on domain.keyword. Fast + precise
 * (matches the indexed literal only). Returns null if no org indexed under
 * this domain.
 */
export async function getCompanyByDomain(rawDomain: string): Promise<CompanyHit | null> {
  const d = normalizeDomain(rawDomain);
  if (!d) return null;
  const body = {
    size: 1,
    _source: [
      "uuid",
      "name",
      "domain",
      "short_description",
      "logo_url",
      "employee_count",
      "total_funding_usd",
      "founded_on",
      "city",
      "state_code",
      "country_code",
      "categories",
    ],
    // OpenSearch mapping stores `domain` as a direct keyword field (no
    // `.keyword` subfield), so `term: { "domain.keyword": ... }` returned
    // 0 hits for all 1,400+ synced deals. Exact-match on `domain` is what
    // the index actually supports.
    query: { term: { domain: { value: d } } },
  };
  const res = await opensearch<OsResponse>("/organizations/_search", body);
  const hit = res.hits?.hits?.[0];
  if (!hit) return null;
  const s = hit._source as Record<string, unknown>;
  return {
    uuid: (s.uuid as string) ?? hit._id,
    name: (s.name as string) ?? "",
    domain: s.domain as string | undefined,
    shortDescription: s.short_description as string | undefined,
    logoUrl: s.logo_url as string | undefined,
    categories: extractCategoryLabels(s.categories),
    employeeCount: s.employee_count as string | undefined,
    totalFundingUsd: s.total_funding_usd as number | undefined,
    foundedOn: s.founded_on as string | undefined,
    locationCity: s.city as string | undefined,
    locationState: s.state_code as string | undefined,
    locationCountry: s.country_code as string | undefined,
  };
}

export type InvestorCompanyLookupInput = {
  id: string;
  name: string;
  domain?: string;
};

/**
 * Resolve Neptune investor vertices → OpenSearch organization UUIDs for
 * Investors-tab company links. Cascade (stop at first hit per investor):
 *   1. Batch id / uuid / _id match
 *   2. Batch exact domain match (preferred when id miss; skip if domain ambiguous)
 *   3. Strict normalized name match (skip if name ambiguous)
 * Returns Map keyed by investor Neptune id → company uuid. Missing key = no profile.
 */
export async function resolveCompanyUuidsForInvestors(
  investors: InvestorCompanyLookupInput[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (investors.length === 0) return out;
  if (!isOpenSearchConfigured()) return out;

  const unique = new Map<string, InvestorCompanyLookupInput>();
  for (const inv of investors) {
    if (!inv.id || unique.has(inv.id)) continue;
    unique.set(inv.id, inv);
  }
  const list = [...unique.values()];

  // --- Step 1: UUID / _id batch ---
  const ids = list
    .map((i) => i.id)
    .filter((id) => /^[a-zA-Z0-9_\-]{1,100}$/.test(id))
    .slice(0, 200);
  if (ids.length > 0) {
    try {
      const idSet = new Set(ids);
      const body = {
        size: Math.min(ids.length, 500),
        _source: ["uuid", "name", "domain"],
        query: {
          bool: {
            should: [
              { terms: { "uuid.keyword": ids } },
              { terms: { uuid: ids } },
              { terms: { _id: ids } },
            ],
          },
        },
      };
      const res = await opensearch<OsResponse>("/organizations/_search", body);
      for (const hit of res.hits?.hits ?? []) {
        const src = (hit._source ?? {}) as Record<string, unknown>;
        const companyUuid = String(src.uuid ?? hit._id ?? "");
        if (!companyUuid) continue;
        const hitId = String(hit._id ?? "");
        if (idSet.has(companyUuid)) out.set(companyUuid, companyUuid);
        if (hitId && idSet.has(hitId)) out.set(hitId, companyUuid);
      }
    } catch (e) {
      captureOpenSearchFailure(
        e,
        "resolve_investor_companies_by_id",
        "resolveCompanyUuidsForInvestors id lookup failed",
      );
    }
  }

  // --- Step 2: domain batch (preferred for remaining) ---
  const needDomain = list.filter((i) => !out.has(i.id) && i.domain);
  if (needDomain.length > 0) {
    const domains = [
      ...new Set(
        needDomain
          .map((i) => normalizeDomain(i.domain))
          .filter((d): d is string => Boolean(d)),
      ),
    ].slice(0, 200);
    if (domains.length > 0) {
      try {
        const body = {
          size: Math.min(domains.length * 3, 500),
          _source: ["uuid", "name", "domain"],
          query: { terms: { domain: domains } },
        };
        const res = await opensearch<OsResponse>("/organizations/_search", body);
        const hits = (res.hits?.hits ?? []).map((hit) => {
          const src = (hit._source ?? {}) as Record<string, unknown>;
          return {
            uuid: String(src.uuid ?? hit._id ?? ""),
            domain: (src.domain as string | undefined) ?? null,
          };
        });
        const byDomain = uniqueDomainToUuid(hits, normalizeDomain);
        for (const inv of needDomain) {
          const d = normalizeDomain(inv.domain);
          if (!d) continue;
          const uuid = byDomain.get(d);
          if (uuid) out.set(inv.id, uuid);
        }
      } catch (e) {
        captureOpenSearchFailure(
          e,
          "resolve_investor_companies_by_domain",
          "resolveCompanyUuidsForInvestors domain lookup failed",
        );
      }
    }
  }

  // --- Step 3: strict normalized name (no fuzzy) ---
  const needName = list.filter((i) => !out.has(i.id) && i.name.trim().length >= 2);
  if (needName.length > 0) {
    const nameLiterals = [
      ...new Set(
        needName.flatMap((i) => {
          const raw = i.name.trim();
          return raw ? [raw, raw.toLowerCase()] : [];
        }),
      ),
    ].slice(0, 200);
    if (nameLiterals.length > 0) {
      try {
        const body = {
          size: Math.min(nameLiterals.length * 3, 500),
          _source: ["uuid", "name", "domain"],
          query: {
            bool: {
              should: [
                { terms: { "name.keyword": nameLiterals } },
                { terms: { name: nameLiterals } },
              ],
              minimum_should_match: 1,
            },
          },
        };
        const res = await opensearch<OsResponse>("/organizations/_search", body);
        const hits = (res.hits?.hits ?? []).map((hit) => {
          const src = (hit._source ?? {}) as Record<string, unknown>;
          return {
            uuid: String(src.uuid ?? hit._id ?? ""),
            name: String(src.name ?? ""),
          };
        });
        const byName = uniqueNormalizedNameToUuid(hits);
        for (const inv of needName) {
          const key = normalizeCompanyName(inv.name);
          if (!key) continue;
          const uuid = byName.get(key);
          if (uuid) out.set(inv.id, uuid);
        }
      } catch (e) {
        captureOpenSearchFailure(
          e,
          "resolve_investor_companies_by_name",
          "resolveCompanyUuidsForInvestors name lookup failed",
        );
      }
    }
  }

  return out;
}

const COMPANY_SEARCH_SOURCE_FIELDS = [
  "uuid",
  "name",
  "domain",
  "short_description",
  "logo_url",
  "categories",
  "employee_count",
  "total_funding_usd",
  "founded_on",
  "city",
  "state_code",
  "country_code",
];

/**
 * Full-text company search against the organizations index.
 *
 * Signature stays backward-compatible: `searchCompanies(q, 10)` or
 * `searchCompanies(q, { limit, offset, filters })`.
 * Offset mode: empty query with no filters → `[]`. Filters alone are allowed.
 * Cursor mode (`pagination: "cursor"`): empty query allowed via `match_all` for
 * full-corpus crawls (peer/n8n); uses `search_after`, never `from`.
 */
export async function searchCompanies(
  query: string,
  limitOrOptions: number | SearchCompaniesOptions = 10,
): Promise<CompanyHit[]> {
  const page = await searchCompaniesPage(query, limitOrOptions);
  return page.hits;
}

/**
 * Same as `searchCompanies` but returns cursor sort values for public API paging.
 */
export async function searchCompaniesPage(
  query: string,
  limitOrOptions: number | SearchCompaniesOptions = 10,
): Promise<SearchCompaniesPage> {
  const options: SearchCompaniesOptions =
    typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
  const limit = clampSearchLimit(options.limit);
  const offset = clampSearchOffset(options.offset);
  const paginationMode = options.pagination === "cursor" ? "cursor" : "offset";
  const q = query.trim();
  const filterClauses = buildCompanySearchFilters(options.filters);

  if (!q && filterClauses.length === 0 && paginationMode === "offset") {
    return { hits: [] };
  }

  // phrase_prefix on name + short_description. Narrow _source + small size. This
  // is ~2-4x faster than multi_match/best_fields on large indexes for typeahead.
  const boolQuery: OsQueryClause = {};
  if (q) {
    boolQuery.should = [
      { match_phrase_prefix: { name: { query: q, boost: 10, max_expansions: 20 } } },
      { term: { "domain.keyword": { value: q.toLowerCase(), boost: 8 } } },
      { match_phrase_prefix: { domain: { query: q.toLowerCase(), boost: 5, max_expansions: 20 } } },
      { match: { short_description: { query: q, boost: 1 } } },
    ];
    boolQuery.minimum_should_match = 1;
  }
  if (filterClauses.length > 0) {
    boolQuery.filter = filterClauses;
  }

  const queryClause: Record<string, unknown> =
    !q && filterClauses.length === 0 ? { match_all: {} } : { bool: boolQuery };

  const body =
    paginationMode === "cursor"
      ? buildCompanySearchOsBody({
          limit,
          query: queryClause,
          sourceFields: COMPANY_SEARCH_SOURCE_FIELDS,
          pagination: {
            mode: "cursor",
            searchAfter: options.searchAfter,
            hasTextQuery: q.length > 0,
          },
        })
      : buildCompanySearchOsBody({
          limit,
          query: queryClause,
          sourceFields: COMPANY_SEARCH_SOURCE_FIELDS,
          pagination: { mode: "offset", offset },
        });

  const res = await opensearch<OsResponse>("/organizations/_search", body);
  const rawHits = res.hits?.hits ?? [];
  const hits = rawHits.map((h) =>
    mapOrganizationHit({ _id: h._id, _source: h._source as Record<string, unknown> }),
  );

  if (paginationMode !== "cursor" || rawHits.length === 0 || rawHits.length < limit) {
    return { hits };
  }

  const lastSort = rawHits[rawHits.length - 1]?.sort;
  if (!lastSort || lastSort.length === 0) {
    return { hits };
  }
  return { hits, nextSearchAfter: lastSort };
}

// ---------- Investors ----------

export interface InvestorHit {
  id: string;
  name: string;
  type?: string;
  logoUrl?: string;
  website?: string;
  /** Bare hostname from the organization `domain` property when present. */
  domain?: string;
  linkedinUrl?: string;
  investmentCount?: number;
}

export interface InvestorProfile extends InvestorHit {
  description?: string;
  properties: Record<string, unknown>;
  backedCompanies: Array<{ uuid: string; name: string; logoUrl?: string }>;
}

export type SearchInvestorsOptions = {
  limit?: number;
  /**
   * Prefer exact `domain` match on organization vertices. When set (or when
   * `query` itself normalizes to a domain), name matching is skipped unless
   * domain search returns nothing *and* no domain was available to try.
   */
  domain?: string | null;
};

function mapInvestorHitRow(r: Record<string, unknown>): InvestorHit {
  const domainRaw = (r.domain as string) || undefined;
  const domain = domainRaw ? normalizeDomain(domainRaw) ?? undefined : undefined;
  const website =
    (r.website as string) ||
    (domain ? `https://${domain}` : undefined) ||
    undefined;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    type: (r.type as string) || undefined,
    logoUrl: (r.logo_url as string) || undefined,
    website,
    domain,
    linkedinUrl: (r.linkedin_url as string) || undefined,
    investmentCount: typeof r.n === "number" ? (r.n as number) : undefined,
  };
}

/**
 * Resolve investor firms as organization vertices — exact domain first,
 * then exact name when the domain query returns no hits.
 *
 * Signature: `searchInvestors(q, 10)` or `searchInvestors(q, { limit, domain })`.
 */
export async function searchInvestors(
  query: string,
  limitOrOptions: number | SearchInvestorsOptions = 20,
): Promise<InvestorHit[]> {
  const options: SearchInvestorsOptions =
    typeof limitOrOptions === "number"
      ? { limit: limitOrOptions }
      : limitOrOptions;
  const lim = Math.max(1, Math.min(50, options.limit ?? 20));
  const q = query.trim();
  if (q.length < 2 && !options.domain) return [];

  // Prefer explicit domain option, else treat query as domain when it normalizes.
  const domainFromOpt = options.domain
    ? normalizeDomain(options.domain)
    : null;
  const domainFromQuery = normalizeDomain(q);
  const domain = domainFromOpt ?? domainFromQuery;
  const attempts = investorSearchAttempts({ domain, name: q });
  if (attempts.length === 0) return [];

  try {
    for (const attempt of attempts) {
      const rows = await neptune<Array<Record<string, unknown>>>(
        attempt === "domain"
          ? buildSearchInvestorsGremlin({ domain, limit: lim })
          : buildSearchInvestorsGremlin({ name: q, limit: lim }),
      );
      const hits = rows.map(mapInvestorHitRow).filter((h) => h.id && h.name);
      if (hits.length > 0) return hits;
    }
    return [];
  } catch (e) {
    captureNeptuneEmptyFallback(e, "search_investors", {
      query: q.slice(0, 120),
      domain: domain?.slice(0, 120) ?? null,
      limit: lim,
    });
    return [];
  }
}

/**
 * Single investor vertex + reverse traversal: companies this investor has
 * backed (via `investor <- has_investor <- funding <- has_funding <- company`).
 * Capped at 200 to keep the response size bounded.
 */
export interface CollaborativeInvestor {
  id: string;
  name: string;
  logoUrl?: string;
  domain?: string;
  /** UUIDs of the caller's seed companies that this investor has backed —
   *  computed graph-side, so the count + list are exact rather than capped
   *  by per-company funding-round limits. */
  companyUuids: string[];
}

/**
 * Single-Gremlin "investors who back any of these companies, with logos +
 * domains + reverse-mapped company list". Replaces a 100×fan-out across
 * `getCompanyFunding` followed by a logo batch — one round-trip instead.
 * Neptune does the dedup + reverse-mapping in-graph, which is dramatically
 * faster than pulling all funding rounds and post-processing in Node.
 */
export async function getCollaborativeInvestors(
  companyUuids: string[],
): Promise<CollaborativeInvestor[]> {
  if (companyUuids.length === 0) return [];
  // Cap input + sanitize each id so the inlined Gremlin literal stays under
  // Neptune's request-size limit (~1MB for the whole script).
  const safe = companyUuids
    .filter((x) => /^[a-zA-Z0-9_\-]{1,100}$/.test(x))
    .slice(0, 200);
  if (safe.length === 0) return [];
  const list = safe.map((s) => `'${s}'`).join(",");

  // Traversal:
  //   1. Visit every seed company
  //   2. Walk to its funding rounds
  //   3. Walk to investors via either edge direction (graph shape varies)
  //   4. Dedup by investor vertex
  //   5. For each investor, project id/name/logo/domain + the SUBSET of
  //      our seed companies they actually backed (reverse traversal)
  const gremlin =
    `g.V(${list})` +
    `.out('has_funding')` +
    `.union(__.in('invested_in'), __.out('has_investor'))` +
    `.dedup()` +
    `.project('id','name','logo_url','domain','companies')` +
    `.by(id)` +
    `.by(coalesce(values('name'), constant('')))` +
    `.by(coalesce(values('logo_url'), values('image_url'), constant('')))` +
    `.by(coalesce(values('domain'), values('homepage_url'), values('website'), constant('')))` +
    `.by(__.union(__.out('invested_in'), __.in('has_investor'))` +
    `    .in('has_funding')` +
    `    .hasId(${list})` +
    `    .id().dedup().fold())`;

  try {
    const rows = await neptune<
      Array<{
        id: string;
        name: string;
        logo_url: string;
        domain: string;
        companies: string[];
      }>
    >(gremlin);
    return rows
      .map((r) => {
        const id = String(r.id ?? "");
        const name = String(r.name ?? "");
        const logoUrl = r.logo_url ? String(r.logo_url) : undefined;
        const domainRaw = r.domain ? String(r.domain) : undefined;
        const domain = domainRaw ? normalizeDomain(domainRaw) ?? undefined : undefined;
        const companyUuids = (r.companies ?? []).map(String).filter(Boolean);
        return { id, name, logoUrl, domain, companyUuids };
      })
      .filter((r) => r.id && r.name && r.companyUuids.length > 0);
  } catch (e) {
    captureIntegrationException(e, {
      integration: "neptune",
      operation: "get_collaborative_investors",
      level: "warning",
    });
    console.warn("getCollaborativeInvestors failed", (e as Error).message?.slice(0, 200));
    return [];
  }
}

/**
 * Batch-fetch logo + domain for a set of investor vertex ids. One Gremlin
 * round-trip regardless of how many ids; safe to pass 100+ at a time.
 * Returns a Map keyed by id; missing entries means the investor vertex
 * either doesn't exist or has no logo/homepage in the graph.
 */
export async function getInvestorLogosByIds(
  ids: string[],
): Promise<Map<string, { logoUrl?: string; domain?: string }>> {
  const out = new Map<string, { logoUrl?: string; domain?: string }>();
  if (ids.length === 0) return out;
  // Sanitize each id to keep the inlined Gremlin literal safe (alphanumeric
  // + `-_` only, length-bounded). Drop anything that fails the gate.
  // Cap batch size — a giant inlined Gremlin literal can blow request size
  // and slow Neptune's parser. 200 ids is plenty for a single SSR page.
  const safe = ids.filter((x) => /^[a-zA-Z0-9_\-]{1,100}$/.test(x)).slice(0, 200);
  if (safe.length === 0) return out;
  const list = safe.map((s) => `'${s}'`).join(",");
  const gremlin =
    `g.V(${list})` +
    `.project('id','logo_url','domain')` +
    `.by(id)` +
    `.by(coalesce(values('logo_url'), values('image_url'), constant('')))` +
    `.by(coalesce(values('domain'), values('homepage_url'), values('website'), constant('')))`;
  try {
    const rows = await neptune<
      Array<{ id: string; logo_url: string; domain: string }>
    >(gremlin);
    for (const r of rows) {
      const id = String(r.id ?? "");
      if (!id) continue;
      const logoUrl = r.logo_url ? String(r.logo_url) : undefined;
      const domainRaw = r.domain ? String(r.domain) : undefined;
      const domain = domainRaw ? normalizeDomain(domainRaw) ?? undefined : undefined;
      if (logoUrl || domain) out.set(id, { logoUrl, domain });
    }
  } catch (e) {
    captureIntegrationException(e, {
      integration: "neptune",
      operation: "get_investor_logos",
      level: "warning",
      context: { idCount: ids.length },
    });
    console.warn("getInvestorLogosByIds failed", (e as Error).message?.slice(0, 200));
  }
  return out;
}

/**
 * Organization vertex + backed companies via invested_in / has_investor edges.
 * Label is `organization` (not `investor`) — confirmed on deployed Neptune.
 */
export async function getInvestor(id: string): Promise<InvestorProfile | null> {
  const vid = safeId(id);
  const gremlin = buildGetInvestorGremlin(vid);
  try {
    const [row] = await neptune<
      Array<{
        self: Record<string, unknown>;
        backedCompanies: Array<Record<string, unknown>>;
      }>
    >(gremlin);
    if (!row) return null;
    const s = row.self ?? {};
    const backed = (row.backedCompanies ?? [])
      .map((c) => ({
        uuid: String(c.uuid ?? ""),
        name: String(c.name ?? ""),
        logoUrl: (c.logo_url as string) || undefined,
      }))
      .filter((c) => c.uuid && c.name);
    const domainRaw =
      firstOrString(s.domain) ??
      firstOrString(s.homepage_url) ??
      firstOrString(s.website);
    const domain = domainRaw ? normalizeDomain(domainRaw) ?? undefined : undefined;
    return {
      id: String(s.id ?? s["~id"] ?? vid),
      name: firstOrString(s.name) ?? "",
      type: firstOrString(s.investor_type) ?? firstOrString(s.type),
      logoUrl: firstOrString(s.logo_url) ?? firstOrString(s.image_url),
      website:
        firstOrString(s.homepage_url) ??
        firstOrString(s.website) ??
        (domain ? `https://${domain}` : undefined),
      domain,
      linkedinUrl: firstOrString(s.linkedin_url),
      description: firstOrString(s.description) ?? firstOrString(s.short_description),
      investmentCount: backed.length,
      properties: s,
      backedCompanies: backed,
    };
  } catch (e) {
    captureNeptuneEmptyFallback(e, "get_investor", { investorId: vid });
    return null;
  }
}
