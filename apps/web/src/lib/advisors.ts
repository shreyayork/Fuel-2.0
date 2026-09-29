import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  accounts,
  advisors,
  companyAdvisors,
  type Advisor,
  type CompanyAdvisor,
} from "@/db/schema";
import { ClaimedProfileRequiredError, isClaimedCompanyProfile } from "@/lib/accounts";
import { resolveCompanyName } from "@/lib/intelligence/resolve-company";

export { ClaimedProfileRequiredError };

export type AdvisorPatch = Partial<
  Omit<Advisor, "id" | "accountId" | "createdAt" | "updatedAt" | "curatedByEmail">
>;

export interface AdvisorWithLinkedCount extends Advisor {
  linkedCompanyCount: number;
}

/** True when the row is Super Admin–curated (visible to every account). */
export function isInstanceAdvisor(advisor: Pick<Advisor, "accountId">): boolean {
  return advisor.accountId == null;
}

function advisorId(): string {
  return `adv_${randomUUID()}`;
}

/** Visibility: instance-level (accountId IS NULL) ∪ account-owned rows. */
function visibleToAccount(accountId: string) {
  return or(isNull(advisors.accountId), eq(advisors.accountId, accountId))!;
}

/**
 * List advisors visible to `accountId` — instance-level (accountId=null)
 * plus the account's own. Same merge pattern as playbooks.
 * Duplicate names across scopes are both returned; no dedupe.
 */
export async function listAdvisors(opts: {
  accountId: string;
  status?: "active" | "archived";
}): Promise<AdvisorWithLinkedCount[]> {
  const db = await getDb();
  const filters = [visibleToAccount(opts.accountId)];
  if (opts.status) filters.push(eq(advisors.status, opts.status));
  const rows = await db
    .select()
    .from(advisors)
    .where(and(...filters))
    .orderBy(advisors.name);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({
      advisorId: companyAdvisors.advisorId,
      n: sql<string>`count(*)::text`,
    })
    .from(companyAdvisors)
    .where(
      and(
        eq(companyAdvisors.accountId, opts.accountId),
        inArray(companyAdvisors.advisorId, ids),
      ),
    )
    .groupBy(companyAdvisors.advisorId);
  const byId = new Map(counts.map((c) => [c.advisorId, Number(c.n)]));
  return rows.map((r) => ({ ...r, linkedCompanyCount: byId.get(r.id) ?? 0 }));
}

/** Super-admin fetch: instance-level advisors only (accountId IS NULL). */
export async function listAdvisorsAdmin(): Promise<Advisor[]> {
  const db = await getDb();
  return db
    .select()
    .from(advisors)
    .where(isNull(advisors.accountId))
    .orderBy(desc(advisors.updatedAt));
}

/**
 * Fetch an advisor visible to the account (owned or instance-level).
 * Does not authorize mutation — use updateAdvisor / deleteAdvisor for writes.
 */
export async function getAdvisor(opts: {
  accountId: string;
  id: string;
}): Promise<Advisor | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(advisors)
    .where(and(eq(advisors.id, opts.id), visibleToAccount(opts.accountId)));
  return row ?? null;
}

/** Public fetch used by /advisor/<id>/card. Returns the row regardless of
 *  account — the caller is responsible for enforcing publicCard visibility. */
export async function getAdvisorPublic(id: string): Promise<Advisor | null> {
  const db = await getDb();
  const [row] = await db.select().from(advisors).where(eq(advisors.id, id));
  return row ?? null;
}

export async function countAdvisors(accountId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<string>`count(*)::text` })
    .from(advisors)
    .where(and(visibleToAccount(accountId), eq(advisors.status, "active")));
  return Number(row?.n ?? 0);
}

export async function createAdvisor(opts: {
  accountId: string;
  curatedByEmail: string;
  name: string;
  patch?: AdvisorPatch;
}): Promise<Advisor> {
  const db = await getDb();
  const id = advisorId();
  const [row] = await db
    .insert(advisors)
    .values({
      id,
      accountId: opts.accountId,
      curatedByEmail: opts.curatedByEmail,
      name: opts.name,
      ...opts.patch,
    })
    .returning();
  return row;
}

/** Super Admin: create or update an instance-level advisor (accountId=null). */
export async function upsertInstanceAdvisor(opts: {
  id?: string;
  curatedByEmail: string;
  name: string;
  patch?: AdvisorPatch;
}): Promise<Advisor> {
  const db = await getDb();
  const now = new Date();
  if (opts.id) {
    const [row] = await db
      .update(advisors)
      .set({
        name: opts.name,
        ...opts.patch,
        updatedAt: now,
      })
      .where(and(eq(advisors.id, opts.id), isNull(advisors.accountId)))
      .returning();
    if (row) return row;
  }
  const id = opts.id ?? advisorId();
  const [row] = await db
    .insert(advisors)
    .values({
      id,
      accountId: null,
      curatedByEmail: opts.curatedByEmail,
      name: opts.name,
      ...opts.patch,
    })
    .returning();
  return row;
}

export async function getInstanceAdvisor(id: string): Promise<Advisor | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(advisors)
    .where(and(eq(advisors.id, id), isNull(advisors.accountId)));
  return row ?? null;
}

/** Super Admin update — instance-level rows only. */
export async function updateInstanceAdvisor(opts: {
  id: string;
  patch: AdvisorPatch;
}): Promise<Advisor | null> {
  const db = await getDb();
  const [row] = await db
    .update(advisors)
    .set({ ...opts.patch, updatedAt: new Date() })
    .where(and(eq(advisors.id, opts.id), isNull(advisors.accountId)))
    .returning();
  return row ?? null;
}

/**
 * Map Bright Data LinkedIn payload onto blank advisor fields only —
 * never overwrite curated values. Shared by account + Super Admin enhance.
 */
export function buildLinkedInEnhancePatch(
  advisor: Pick<Advisor, "title" | "company" | "photoUrl" | "bio" | "location">,
  data: Record<string, unknown>,
): AdvisorPatch {
  const pick = (src: string): string | undefined => {
    const v = data[src];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const patch: AdvisorPatch = {
    linkedinData: data,
    linkedinFetchedAt: new Date(),
  };
  if (!advisor.title) patch.title = pick("position") ?? pick("headline") ?? advisor.title;
  if (!advisor.company) {
    patch.company = pick("current_company") ?? pick("company") ?? advisor.company;
  }
  if (!advisor.photoUrl) {
    patch.photoUrl = pick("avatar") ?? pick("image_url") ?? advisor.photoUrl;
  }
  if (!advisor.bio) patch.bio = pick("about") ?? pick("summary") ?? advisor.bio;
  if (!advisor.location) patch.location = pick("location") ?? advisor.location;
  return patch;
}

/** Account-scoped update — refuses instance-level rows. */
export async function updateAdvisor(opts: {
  accountId: string;
  id: string;
  patch: AdvisorPatch;
}): Promise<Advisor | null> {
  const db = await getDb();
  const [row] = await db
    .update(advisors)
    .set({ ...opts.patch, updatedAt: new Date() })
    .where(and(eq(advisors.id, opts.id), eq(advisors.accountId, opts.accountId)))
    .returning();
  return row ?? null;
}

/** Account-scoped delete — refuses instance-level rows. */
export async function deleteAdvisor(opts: { accountId: string; id: string }): Promise<void> {
  const db = await getDb();
  await db
    .delete(advisors)
    .where(and(eq(advisors.id, opts.id), eq(advisors.accountId, opts.accountId)));
}

/** Super Admin delete — instance-level only. Cascades company_advisors links. */
export async function deleteInstanceAdvisor(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(advisors).where(and(eq(advisors.id, id), isNull(advisors.accountId)));
}

async function assertClaimedCompanyForAdvisors(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<void> {
  const db = await getDb();
  const [account] = await db
    .select({
      portfolioManagerEnabled: accounts.portfolioManagerEnabled,
      primaryCompanyUuid: accounts.primaryCompanyUuid,
    })
    .from(accounts)
    .where(eq(accounts.id, opts.accountId))
    .limit(1);
  if (!isClaimedCompanyProfile(account, opts.companyUuid)) {
    throw new ClaimedProfileRequiredError();
  }
}

/** Link an advisor to a company. Idempotent on the composite PK.
 *  Advisor must be visible to the account (owned or instance-level). */
export async function linkAdvisorToCompany(opts: {
  accountId: string;
  advisorId: string;
  companyUuid: string;
  role?: string | null;
  addedByEmail: string;
}): Promise<void> {
  await assertClaimedCompanyForAdvisors({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });
  const visible = await getAdvisor({ accountId: opts.accountId, id: opts.advisorId });
  if (!visible) throw new Error(`advisor ${opts.advisorId} not found in this account`);
  const db = await getDb();
  await db
    .insert(companyAdvisors)
    .values({
      accountId: opts.accountId,
      advisorId: opts.advisorId,
      companyUuid: opts.companyUuid,
      role: opts.role ?? null,
      addedByEmail: opts.addedByEmail,
    })
    .onConflictDoNothing();
}

export async function unlinkAdvisorFromCompany(opts: {
  accountId: string;
  advisorId: string;
  companyUuid: string;
}): Promise<void> {
  await assertClaimedCompanyForAdvisors({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });
  const db = await getDb();
  await db
    .delete(companyAdvisors)
    .where(
      and(
        eq(companyAdvisors.accountId, opts.accountId),
        eq(companyAdvisors.advisorId, opts.advisorId),
        eq(companyAdvisors.companyUuid, opts.companyUuid),
      ),
    );
}

export interface CompanyAdvisorRow extends CompanyAdvisor {
  advisor: Advisor;
}

/** Every advisor linked to a specific company for this account, with full advisor rows joined. */
export async function listCompanyAdvisors(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<CompanyAdvisorRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      link: companyAdvisors,
      advisor: advisors,
    })
    .from(companyAdvisors)
    .innerJoin(advisors, eq(companyAdvisors.advisorId, advisors.id))
    .where(
      and(
        eq(companyAdvisors.accountId, opts.accountId),
        eq(companyAdvisors.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(desc(companyAdvisors.addedAt));
  return rows.map((r) => ({ ...r.link, advisor: r.advisor }));
}

export type AdvisorCompanyLink = CompanyAdvisor & {
  companyName: string;
};

/** Companies an advisor is linked to, for the detail page. */
export async function listAdvisorCompanies(opts: {
  accountId: string;
  advisorId: string;
}): Promise<AdvisorCompanyLink[]> {
  const db = await getDb();
  const links = await db
    .select()
    .from(companyAdvisors)
    .where(
      and(
        eq(companyAdvisors.accountId, opts.accountId),
        eq(companyAdvisors.advisorId, opts.advisorId),
      ),
    )
    .orderBy(desc(companyAdvisors.addedAt));

  return Promise.all(
    links.map(async (link) => ({
      ...link,
      companyName: await resolveCompanyName(link.companyUuid),
    })),
  );
}
