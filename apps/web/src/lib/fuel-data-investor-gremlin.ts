/**
 * Pure Gremlin builders for investor/org resolution.
 * Kept free of `server-only` so unit tests can import without a Next runtime.
 *
 * Deployed Neptune has zero `investor`-labeled vertices; firms are
 * `organization` vertices matched primarily by exact `domain`.
 */

export const INVESTOR_ORG_LABEL = "organization";

function escapeGremlinString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Shared project() for investor/org hit rows. */
export const INVESTOR_HIT_PROJECT =
  `.project('id','name','type','logo_url','website','domain','linkedin_url','n')` +
  `.by(id)` +
  `.by(coalesce(values('name'), constant('')))` +
  `.by(coalesce(values('investor_type'), values('type'), constant('')))` +
  `.by(coalesce(values('logo_url'), values('image_url'), constant('')))` +
  `.by(coalesce(values('homepage_url'), values('website'), constant('')))` +
  `.by(coalesce(values('domain'), constant('')))` +
  `.by(coalesce(values('linkedin_url'), constant('')))` +
  `.by(union(__.out('invested_in'), __.in('has_investor')).dedup().count())`;

/** Backed-company walk: org -[invested_in]-> funding_round <-[has_funding]- org.
 *  Also tolerates direct org targets and legacy has_investor inbound.
 *  NOTE: Neptune HTTP Gremlin requires `id()` inside coalesce — bare `id` → MalformedQuery. */
export const BACKED_COMPANIES_TRAVERSAL =
  `union(` +
  `  __.out('invested_in').hasLabel('organization'),` +
  `  __.out('invested_in').in('has_funding'),` +
  `  __.in('has_investor').in('has_funding')` +
  `).dedup().limit(200)` +
  `.project('uuid','name','logo_url')` +
  `.by(coalesce(values('uuid'), id()))` +
  `.by(coalesce(values('name'), constant('')))` +
  `.by(coalesce(values('logo_url'), values('image_url'), constant('')))` +
  `.fold()`;

/**
 * Domain exact match first; name uses exact `has('name', …)` only —
 * `textContainsFuzzy` is unsupported on this cluster (MalformedQueryException).
 * A domain attempt that returns zero hits must be followed by the name attempt.
 */
export function investorSearchAttempts(opts: {
  domain?: string | null;
  name?: string | null;
}): Array<"domain" | "name"> {
  const attempts: Array<"domain" | "name"> = [];
  const domain = (opts.domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (domain.includes(".") && !/[\/\s]/.test(domain)) attempts.push("domain");
  if ((opts.name ?? "").trim().length >= 2) attempts.push("name");
  return attempts;
}

export function buildSearchInvestorsGremlin(opts: {
  domain?: string | null;
  name?: string | null;
  limit: number;
}): string {
  const lim = Math.max(1, Math.min(50, opts.limit));
  // Callers should pass normalizeDomain() output; light cleanup only here.
  const domain = (opts.domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (domain.includes(".") && !/[\/\s]/.test(domain)) {
    const escaped = escapeGremlinString(domain);
    return (
      `g.V().hasLabel('${INVESTOR_ORG_LABEL}')` +
      `.has('domain','${escaped}')` +
      `.limit(${lim})` +
      INVESTOR_HIT_PROJECT
    );
  }
  const name = (opts.name ?? "").trim();
  if (name.length < 2) {
    throw new Error("buildSearchInvestorsGremlin: need domain or name");
  }
  const escaped = escapeGremlinString(name);
  return (
    `g.V().hasLabel('${INVESTOR_ORG_LABEL}')` +
    `.has('name','${escaped}')` +
    `.limit(${lim})` +
    INVESTOR_HIT_PROJECT
  );
}

/** `id` must already be safeId()-sanitized by the caller. */
export function buildGetInvestorGremlin(safeVertexId: string): string {
  return (
    `g.V('${safeVertexId}').hasLabel('${INVESTOR_ORG_LABEL}').project('self','backedCompanies')` +
    `.by(valueMap(true))` +
    `.by(${BACKED_COMPANIES_TRAVERSAL})`
  );
}
