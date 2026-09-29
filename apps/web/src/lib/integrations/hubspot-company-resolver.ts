import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  integrationCompanyLinks,
  type IntegrationCompanyLink,
} from "@/db/schema";
import { getCompanyByDomain, normalizeDomain } from "@/lib/fuel-data";
import { getCatalogByDomain } from "@/lib/catalog";
import {
  HubspotClient,
  getCompaniesByIds,
  getContactsByIds,
  type HubspotCompany,
  type HubspotContact,
} from "@/lib/hubspot-client";
import type { AccountWatchlistIndex } from "./watchlist-index";

/**
 * Re-resolve a cached "no match" entry after this long. The cheap case is
 * the cache hit (O(1) DB read); the expensive case is the domain ladder
 * (catalog + fuel-data OpenSearch). Giving unresolved entries a retry
 * window keeps formerly-unknown companies from being stuck in the void
 * after they're eventually added to fuel-data or the account catalog.
 */
const UNRESOLVED_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const PERSONAL_DOMAINS = new Set([
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
  if (!d || PERSONAL_DOMAINS.has(d)) return null;
  return normalizeDomain(d);
}

export interface ResolvedCompany {
  fuelDataUuid: string | null;
  domain: string | null;
  source: "cache" | "catalog" | "fuel-data" | "unresolved";
}

async function readLink(opts: {
  accountId: string;
  connectionId: string;
  providerObjectType: "company" | "contact";
  providerObjectId: string;
}): Promise<IntegrationCompanyLink | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(integrationCompanyLinks)
    .where(
      and(
        eq(integrationCompanyLinks.accountId, opts.accountId),
        eq(integrationCompanyLinks.connectionId, opts.connectionId),
        eq(integrationCompanyLinks.providerObjectType, opts.providerObjectType),
        eq(integrationCompanyLinks.providerObjectId, opts.providerObjectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function writeLink(opts: {
  accountId: string;
  connectionId: string;
  provider: "hubspot";
  providerObjectType: "company" | "contact";
  providerObjectId: string;
  providerDomain: string | null;
  fuelDataUuid: string | null;
  resolutionSource: ResolvedCompany["source"];
}): Promise<void> {
  const db = await getDb();
  const existing = await readLink({
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    providerObjectType: opts.providerObjectType,
    providerObjectId: opts.providerObjectId,
  });
  const now = new Date();
  if (existing) {
    await db
      .update(integrationCompanyLinks)
      .set({
        providerDomain: opts.providerDomain,
        fuelDataUuid: opts.fuelDataUuid,
        resolutionSource: opts.resolutionSource,
        lastResolvedAt: now,
        updatedAt: now,
      })
      .where(eq(integrationCompanyLinks.id, existing.id));
    return;
  }
  await db.insert(integrationCompanyLinks).values({
    id: randomUUID(),
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    provider: opts.provider,
    providerObjectType: opts.providerObjectType,
    providerObjectId: opts.providerObjectId,
    providerDomain: opts.providerDomain,
    fuelDataUuid: opts.fuelDataUuid,
    resolutionSource: opts.resolutionSource,
    lastResolvedAt: now,
  });
}

function linkStillFresh(link: IntegrationCompanyLink): boolean {
  if (link.resolutionSource !== "unresolved") return true;
  const ageMs = Date.now() - link.lastResolvedAt.getTime();
  return ageMs < UNRESOLVED_TTL_MS;
}

async function resolveDomain(opts: {
  accountId: string;
  domain: string;
}): Promise<{ fuelDataUuid: string; source: "catalog" | "fuel-data" } | null> {
  try {
    const catalog = await getCatalogByDomain({
      accountId: opts.accountId,
      domain: opts.domain,
    });
    if (catalog) return { fuelDataUuid: catalog.id, source: "catalog" };
  } catch {
    // Fall through to fuel-data.
  }
  try {
    const hit = await getCompanyByDomain(opts.domain);
    if (hit) return { fuelDataUuid: hit.uuid, source: "fuel-data" };
  } catch {
    // Transient Neptune/OS failure — treat as unresolved for now.
  }
  return null;
}

/**
 * Resolve a HubSpot company id → Fuel uuid. Walks the cache first; on miss
 * or stale unresolved entry, fetches the company from HubSpot (unless the
 * caller already passed one in), derives its primary domain, and runs the
 * catalog → fuel-data ladder. Writes the result (hit or miss) back.
 *
 * The caller is responsible for enforcing watchlist membership via
 * `index.watchlistUuidSet` — the resolver returns the UUID regardless so
 * we don't re-resolve when watchlist membership changes. Pass
 * `requireWatchlistMembership: true` to have the resolver gate on it.
 */
export async function resolveHubspotCompany(opts: {
  client: HubspotClient;
  accountId: string;
  connectionId: string;
  hubspotCompanyId: string;
  /** Avoid a HubSpot fetch if the caller already has the object. */
  hsCompany?: HubspotCompany;
  index: AccountWatchlistIndex;
  requireWatchlistMembership?: boolean;
}): Promise<ResolvedCompany> {
  const cached = await readLink({
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    providerObjectType: "company",
    providerObjectId: opts.hubspotCompanyId,
  });
  if (cached && linkStillFresh(cached)) {
    const uuid = cached.fuelDataUuid;
    if (opts.requireWatchlistMembership && uuid && !opts.index.watchlistUuidSet.has(uuid)) {
      return { fuelDataUuid: null, domain: cached.providerDomain, source: "cache" };
    }
    return {
      fuelDataUuid: uuid,
      domain: cached.providerDomain,
      source: "cache",
    };
  }

  // Miss or stale unresolved — fetch the HubSpot company and run the ladder.
  let hsCo: HubspotCompany | undefined = opts.hsCompany;
  if (!hsCo) {
    const got = await getCompaniesByIds(opts.client, [opts.hubspotCompanyId]);
    hsCo = got[0];
  }
  const domain =
    normalizeDomain(hsCo?.properties.domain) ??
    normalizeDomain(hsCo?.properties.website) ??
    null;

  if (!domain) {
    await writeLink({
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: "hubspot",
      providerObjectType: "company",
      providerObjectId: opts.hubspotCompanyId,
      providerDomain: null,
      fuelDataUuid: null,
      resolutionSource: "unresolved",
    });
    return { fuelDataUuid: null, domain: null, source: "unresolved" };
  }

  // Short-circuit: if the domain is already in the account's watchlist
  // index, use that uuid (catalog/neptune already resolved it in-memory).
  const indexHit = opts.index.catalogDomainMap.get(domain);
  if (indexHit) {
    const source = indexHit.startsWith("cat_") ? "catalog" : "fuel-data";
    await writeLink({
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: "hubspot",
      providerObjectType: "company",
      providerObjectId: opts.hubspotCompanyId,
      providerDomain: domain,
      fuelDataUuid: indexHit,
      resolutionSource: source,
    });
    return { fuelDataUuid: indexHit, domain, source };
  }

  const resolved = await resolveDomain({ accountId: opts.accountId, domain });
  if (!resolved) {
    await writeLink({
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: "hubspot",
      providerObjectType: "company",
      providerObjectId: opts.hubspotCompanyId,
      providerDomain: domain,
      fuelDataUuid: null,
      resolutionSource: "unresolved",
    });
    return { fuelDataUuid: null, domain, source: "unresolved" };
  }

  await writeLink({
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    provider: "hubspot",
    providerObjectType: "company",
    providerObjectId: opts.hubspotCompanyId,
    providerDomain: domain,
    fuelDataUuid: resolved.fuelDataUuid,
    resolutionSource: resolved.source,
  });

  if (
    opts.requireWatchlistMembership &&
    !opts.index.watchlistUuidSet.has(resolved.fuelDataUuid)
  ) {
    return { fuelDataUuid: null, domain, source: resolved.source };
  }
  return {
    fuelDataUuid: resolved.fuelDataUuid,
    domain,
    source: resolved.source,
  };
}

/**
 * Contact-side fallback. Many HubSpot notes/emails only carry a contact
 * association; the resolver reads the contact's email domain (skipping free
 * providers) and runs the same domain ladder. Cached per-contact so a noisy
 * sender doesn't trigger a cascade of lookups.
 */
export async function resolveHubspotContact(opts: {
  client: HubspotClient;
  accountId: string;
  connectionId: string;
  hubspotContactId: string;
  hsContact?: HubspotContact;
  index: AccountWatchlistIndex;
  requireWatchlistMembership?: boolean;
}): Promise<ResolvedCompany> {
  const cached = await readLink({
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    providerObjectType: "contact",
    providerObjectId: opts.hubspotContactId,
  });
  if (cached && linkStillFresh(cached)) {
    const uuid = cached.fuelDataUuid;
    if (opts.requireWatchlistMembership && uuid && !opts.index.watchlistUuidSet.has(uuid)) {
      return { fuelDataUuid: null, domain: cached.providerDomain, source: "cache" };
    }
    return {
      fuelDataUuid: uuid,
      domain: cached.providerDomain,
      source: "cache",
    };
  }

  let hsContact: HubspotContact | undefined = opts.hsContact;
  if (!hsContact) {
    const got = await getContactsByIds(opts.client, [opts.hubspotContactId]);
    hsContact = got[0];
  }
  const domain = domainFromEmail(hsContact?.properties.email);

  if (!domain) {
    await writeLink({
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: "hubspot",
      providerObjectType: "contact",
      providerObjectId: opts.hubspotContactId,
      providerDomain: null,
      fuelDataUuid: null,
      resolutionSource: "unresolved",
    });
    return { fuelDataUuid: null, domain: null, source: "unresolved" };
  }

  const indexHit = opts.index.catalogDomainMap.get(domain);
  if (indexHit) {
    const source = indexHit.startsWith("cat_") ? "catalog" : "fuel-data";
    await writeLink({
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: "hubspot",
      providerObjectType: "contact",
      providerObjectId: opts.hubspotContactId,
      providerDomain: domain,
      fuelDataUuid: indexHit,
      resolutionSource: source,
    });
    return { fuelDataUuid: indexHit, domain, source };
  }

  const resolved = await resolveDomain({ accountId: opts.accountId, domain });
  const fuelDataUuid = resolved?.fuelDataUuid ?? null;
  const source = resolved?.source ?? "unresolved";

  await writeLink({
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    provider: "hubspot",
    providerObjectType: "contact",
    providerObjectId: opts.hubspotContactId,
    providerDomain: domain,
    fuelDataUuid,
    resolutionSource: source,
  });

  if (
    opts.requireWatchlistMembership &&
    fuelDataUuid &&
    !opts.index.watchlistUuidSet.has(fuelDataUuid)
  ) {
    return { fuelDataUuid: null, domain, source };
  }
  return { fuelDataUuid, domain, source };
}
