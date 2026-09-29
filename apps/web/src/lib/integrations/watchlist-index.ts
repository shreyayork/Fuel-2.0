import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { catalogCompanies, watchlistCompanies, watchlists } from "@/db/schema";
import { getDomainsByUuids, normalizeDomain } from "@/lib/fuel-data";

export interface AccountWatchlistIndex {
  /** domain → companyUuid for every watchlisted company with a known domain. */
  catalogDomainMap: Map<string, string>;
  /** All company uuids (catalog + neptune) in any of the account's watchlists. */
  watchlistUuidSet: Set<string>;
}

/**
 * Pre-compute two structures for fast match lookups across ingest paths
 * (Granola, Slack, HubSpot activity): (a) every watchlisted company keyed
 * by its domain, (b) the full set of watchlist member uuids. Cheap enough
 * to rebuild per sync run; no cross-run caching.
 */
export async function buildAccountWatchlistIndex(
  accountId: string,
): Promise<AccountWatchlistIndex> {
  const db = await getDb();
  const ownedWatchlists = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(eq(watchlists.accountId, accountId));
  if (ownedWatchlists.length === 0) {
    return { catalogDomainMap: new Map(), watchlistUuidSet: new Set() };
  }
  const wlIds = ownedWatchlists.map((w) => w.id);
  const memberships = await db
    .select({ companyUuid: watchlistCompanies.companyUuid })
    .from(watchlistCompanies)
    .where(inArray(watchlistCompanies.watchlistId, wlIds));
  const watchlistUuidSet = new Set(memberships.map((m) => m.companyUuid));

  const catalogDomainMap = new Map<string, string>();
  const catalogUuids = Array.from(watchlistUuidSet).filter((u) => u.startsWith("cat_"));
  if (catalogUuids.length > 0) {
    const cat = await db
      .select({ id: catalogCompanies.id, domain: catalogCompanies.domain })
      .from(catalogCompanies)
      .where(
        and(
          eq(catalogCompanies.accountId, accountId),
          inArray(catalogCompanies.id, catalogUuids),
        ),
      );
    for (const c of cat) {
      const d = normalizeDomain(c.domain);
      if (d) catalogDomainMap.set(d, c.id);
    }
  }

  const neptuneUuids = Array.from(watchlistUuidSet).filter((u) => !u.startsWith("cat_"));
  if (neptuneUuids.length > 0) {
    const domainByUuid = await getDomainsByUuids(neptuneUuids);
    for (const [uuid, domain] of domainByUuid) {
      if (!catalogDomainMap.has(domain)) catalogDomainMap.set(domain, uuid);
    }
  }
  return { catalogDomainMap, watchlistUuidSet };
}
