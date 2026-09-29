import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { catalogCompanies, type CatalogCompany } from "@/db/schema";
import { normalizeDomain, type CompanyDoc } from "./fuel-data";
import {
  logoUrlFromEnrichmentSources,
  type CatalogOnboardingSnapshot,
} from "./onboard/claim-profile";
import { resolveDisplayCompanyDomain } from "./onboard/company-domain";

/**
 * Map a catalog_companies row into the CompanyDoc shape the /company view
 * expects. Null out fields we don't have so the view falls back gracefully.
 */
export function catalogToCompanyDoc(row: CatalogCompany): CompanyDoc {
  // Prefer website hostname over stored domain — claim historically stamped
  // accounts.verifiedDomain (email) onto catalog_companies.domain even when the
  // company website differed. Website is the company-level source of truth.
  const domain =
    resolveDisplayCompanyDomain({
      website: row.website,
      domain: row.domain,
    }) ?? undefined;
  const sources = (row.sources ?? {}) as Record<string, unknown>;
  const onboarding = sources.onboarding as CatalogOnboardingSnapshot | undefined;
  const logoUrl =
    row.logoUrl?.trim() ||
    logoUrlFromEnrichmentSources(sources) ||
    onboarding?.profileForm?.logoUrl?.trim() ||
    undefined;
  return {
    uuid: row.id,
    name: row.name,
    shortDescription: row.shortDescription ?? undefined,
    homepageUrl: row.website ?? undefined,
    domain,
    logoUrl,
    foundedOn: row.foundedOn ?? undefined,
    employeeCount: row.employeeCount ?? undefined,
    totalFundingUsd: row.totalFundingUsd ?? undefined,
    numFundingRounds: row.numFundingRounds ?? undefined,
    locationCity: row.locationCity ?? undefined,
    locationState: row.locationState ?? undefined,
    locationCountry: row.locationCountry ?? undefined,
    linkedinUrl: row.linkedinUrl ?? undefined,
    twitterUrl: row.twitterUrl ?? undefined,
    cbUrl: row.crunchbaseUrl ?? undefined,
    categories: row.industry ? [{ name: row.industry }] : undefined,
    raw: { source: "catalog", sources: row.sources ?? {}, longDescription: row.longDescription },
  };
}

/** `cat_` prefix separates our UUIDs from Crunchbase-derived fuel-data UUIDs. */
export const CATALOG_UUID_PREFIX = "cat_";

export function isCatalogUuid(uuid: string): boolean {
  return uuid.startsWith(CATALOG_UUID_PREFIX);
}

function makeCatalogId(): string {
  return CATALOG_UUID_PREFIX + randomUUID();
}

export async function getCatalogCompany(id: string): Promise<CatalogCompany | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(catalogCompanies)
    .where(eq(catalogCompanies.id, id))
    .limit(1);
  return row ?? null;
}

export async function getCatalogByDomain(opts: {
  accountId: string;
  domain: string;
}): Promise<CatalogCompany | null> {
  const d = normalizeDomain(opts.domain);
  if (!d) return null;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(catalogCompanies)
    .where(
      and(
        eq(catalogCompanies.accountId, opts.accountId),
        eq(catalogCompanies.domain, d),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listCatalogCompanies(opts: {
  accountId: string;
  limit?: number;
}): Promise<CatalogCompany[]> {
  const db = await getDb();
  return db
    .select()
    .from(catalogCompanies)
    .where(eq(catalogCompanies.accountId, opts.accountId))
    .orderBy(desc(catalogCompanies.updatedAt))
    .limit(opts.limit ?? 100);
}

export async function createCatalogCompany(opts: {
  accountId: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  createdByEmail: string;
  seed?: Partial<Omit<CatalogCompany, "id" | "accountId" | "createdAt" | "updatedAt">>;
}): Promise<CatalogCompany> {
  const db = await getDb();
  const id = makeCatalogId();
  const normalizedDomain = opts.domain ? normalizeDomain(opts.domain) : null;
  const [row] = await db
    .insert(catalogCompanies)
    .values({
      id,
      accountId: opts.accountId,
      name: opts.name,
      domain: normalizedDomain,
      website: opts.website ?? null,
      createdByEmail: opts.createdByEmail,
      ...opts.seed,
    })
    .returning();
  return row;
}

export async function updateCatalogCompany(opts: {
  id: string;
  patch: Partial<Omit<CatalogCompany, "id" | "accountId" | "createdAt" | "createdByEmail">>;
}): Promise<CatalogCompany | null> {
  const db = await getDb();
  const [row] = await db
    .update(catalogCompanies)
    .set({ ...opts.patch, updatedAt: new Date() })
    .where(eq(catalogCompanies.id, opts.id))
    .returning();
  return row ?? null;
}

/** Find-or-create a catalog row keyed on (accountId, domain). Returns the row + whether it was new. */
export async function upsertCatalogByDomain(opts: {
  accountId: string;
  domain: string;
  name: string;
  createdByEmail: string;
  seed?: Partial<Omit<CatalogCompany, "id" | "accountId" | "createdAt" | "updatedAt">>;
}): Promise<{ row: CatalogCompany; created: boolean }> {
  const existing = await getCatalogByDomain({ accountId: opts.accountId, domain: opts.domain });
  if (existing) return { row: existing, created: false };
  const row = await createCatalogCompany({
    accountId: opts.accountId,
    name: opts.name,
    domain: opts.domain,
    createdByEmail: opts.createdByEmail,
    seed: opts.seed,
  });
  return { row, created: true };
}

export async function countCatalogCompanies(accountId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: catalogCompanies.id })
    .from(catalogCompanies)
    .where(
      and(
        eq(catalogCompanies.accountId, accountId),
        isNotNull(catalogCompanies.id),
      ),
    );
  return rows.length;
}
