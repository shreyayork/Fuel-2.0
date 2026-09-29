import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accounts,
  accountMembers,
  catalogCompanies,
  teams,
  teamMembers,
  watchlistTeams,
  workspaceCreditLedger,
  type Account,
  type AccountMember,
  type CatalogCompany,
  type Team,
  type TeamMember,
} from "@/db/schema";
import { CATALOG_UUID_PREFIX } from "./catalog";
import { isGenericProvider, parseEmailDomain } from "./auth/email-domains";
import { resolveCatalogCompanyDomain } from "./onboard/company-domain";
import { DUPLICATE_TEAM_NAME_MESSAGE, normalizeTeamName } from "./teams/team-name";

export interface AccountForUser extends Account {
  role: "owner" | "admin" | "member";
  memberCount: number;
  teamCount: number;
}

async function _listAccountsForUser(userEmail: string): Promise<AccountForUser[]> {
  const db = await getDb();
  const memberRows = await db
    .select()
    .from(accountMembers)
    .where(eq(accountMembers.userEmail, userEmail));
  if (memberRows.length === 0) return [];
  const ids = memberRows.map((r) => r.accountId);
  const [rows, counts, tcounts] = await Promise.all([
    db.select().from(accounts).where(inArray(accounts.id, ids)),
    db
      .select({ id: accountMembers.accountId, n: sql<string>`count(*)::text` })
      .from(accountMembers)
      .where(inArray(accountMembers.accountId, ids))
      .groupBy(accountMembers.accountId),
    db
      .select({ id: teams.accountId, n: sql<string>`count(*)::text` })
      .from(teams)
      .where(inArray(teams.accountId, ids))
      .groupBy(teams.accountId),
  ]);
  const membersMap = new Map(counts.map((c) => [c.id, Number(c.n)]));
  const teamsMap = new Map(tcounts.map((c) => [c.id, Number(c.n)]));
  const roleMap = new Map(memberRows.map((r) => [r.accountId, r.role]));
  return rows
    .map((a) => ({
      ...a,
      role: (roleMap.get(a.id) ?? "member") as AccountForUser["role"],
      memberCount: membersMap.get(a.id) ?? 0,
      teamCount: teamsMap.get(a.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Per-request dedupe — layout + getActiveAccountForUser share one DB round-trip. */
export const listAccountsForUser = cache(_listAccountsForUser);

export async function getAccount(id: string): Promise<Account | null> {
  const db = await getDb();
  const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
  return row ?? null;
}

export async function getMembership(opts: {
  accountId: string;
  userEmail: string;
}): Promise<AccountMember | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(accountMembers)
    .where(
      and(
        eq(accountMembers.accountId, opts.accountId),
        eq(accountMembers.userEmail, opts.userEmail),
      ),
    );
  return row ?? null;
}

/**
 * Number of `owner`-role members on an account. Used to gate "remove" /
 * "demote" actions so the last owner can't accidentally lock everyone
 * out of admin operations.
 */
export async function countOwners(accountId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<string>`count(*)::text` })
    .from(accountMembers)
    .where(
      and(
        eq(accountMembers.accountId, accountId),
        eq(accountMembers.role, "owner"),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function listMembers(accountId: string): Promise<AccountMember[]> {
  const db = await getDb();
  return db
    .select()
    .from(accountMembers)
    .where(eq(accountMembers.accountId, accountId))
    .orderBy(desc(accountMembers.createdAt));
}

export async function listTeams(accountId: string): Promise<Team[]> {
  const db = await getDb();
  return db
    .select()
    .from(teams)
    .where(eq(teams.accountId, accountId))
    .orderBy(teams.name);
}

export async function listTeamsWithCounts(
  accountId: string,
): Promise<Array<Team & { memberCount: number }>> {
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.select().from(teams).where(eq(teams.accountId, accountId)).orderBy(teams.name),
    db
      .select({ id: teamMembers.teamId, n: sql<string>`count(*)::text` })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teams.accountId, accountId))
      .groupBy(teamMembers.teamId),
  ]);
  const cMap = new Map(counts.map((c) => [c.id, Number(c.n)]));
  return rows.map((t) => ({ ...t, memberCount: cMap.get(t.id) ?? 0 }));
}

export async function addMember(opts: {
  accountId: string;
  userEmail: string;
  role?: "owner" | "admin" | "member";
}): Promise<void> {
  const db = await getDb();
  await db
    .insert(accountMembers)
    .values({
      accountId: opts.accountId,
      userEmail: opts.userEmail,
      role: opts.role ?? "member",
      invitedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function removeMember(accountId: string, userEmail: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(accountMembers)
    .where(
      and(eq(accountMembers.accountId, accountId), eq(accountMembers.userEmail, userEmail)),
    );
}

export async function setMemberRole(
  accountId: string,
  userEmail: string,
  role: "owner" | "admin" | "member",
): Promise<void> {
  const db = await getDb();
  await db
    .update(accountMembers)
    .set({ role })
    .where(and(eq(accountMembers.accountId, accountId), eq(accountMembers.userEmail, userEmail)));
}

export class DuplicateTeamNameError extends Error {
  readonly code = "DUPLICATE_TEAM_NAME" as const;

  constructor() {
    super(DUPLICATE_TEAM_NAME_MESSAGE);
    this.name = "DuplicateTeamNameError";
  }
}

export function isDuplicateTeamNameError(error: unknown): error is DuplicateTeamNameError {
  return (
    error instanceof DuplicateTeamNameError ||
    (error instanceof Error && error.name === "DuplicateTeamNameError")
  );
}

async function assertUniqueTeamName(opts: {
  accountId: string;
  name: string;
  excludeId?: string;
}): Promise<void> {
  const db = await getDb();
  const normalized = normalizeTeamName(opts.name);
  const conditions = [
    eq(teams.accountId, opts.accountId),
    sql`lower(${teams.name}) = ${normalized}`,
  ];
  if (opts.excludeId) {
    conditions.push(sql`${teams.id} <> ${opts.excludeId}`);
  }
  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(...conditions))
    .limit(1);
  if (existing) throw new DuplicateTeamNameError();
}

export async function createTeam(opts: {
  accountId: string;
  name: string;
  description?: string;
}): Promise<Team> {
  const name = opts.name.trim();
  await assertUniqueTeamName({ accountId: opts.accountId, name });
  const db = await getDb();
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(teams)
    .values({
      id,
      accountId: opts.accountId,
      name,
      description: opts.description ?? null,
    })
    .returning();
  return row;
}

export async function updateTeam(opts: {
  id: string;
  accountId: string;
  name: string;
  description?: string | null;
}): Promise<Team> {
  const name = opts.name.trim();
  await assertUniqueTeamName({
    accountId: opts.accountId,
    name,
    excludeId: opts.id,
  });
  const db = await getDb();
  const description =
    opts.description === undefined
      ? undefined
      : opts.description?.trim()
        ? opts.description.trim()
        : null;
  const [row] = await db
    .update(teams)
    .set({
      name,
      ...(description !== undefined ? { description } : {}),
    })
    .where(and(eq(teams.id, opts.id), eq(teams.accountId, opts.accountId)))
    .returning();
  if (!row) throw new Error("Team not found");
  return row;
}

export async function deleteTeam(id: string): Promise<void> {
  const db = await getDb();
  // watchlist_teams.team_id has no FK — clear links so deleted teams cannot
  // keep granting access to team-scoped watchlists.
  await db.delete(watchlistTeams).where(eq(watchlistTeams.teamId, id));
  await db.delete(teams).where(eq(teams.id, id));
}

export async function getTeam(id: string): Promise<Team | null> {
  const db = await getDb();
  const [row] = await db.select().from(teams).where(eq(teams.id, id));
  return row ?? null;
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const db = await getDb();
  return db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(teamMembers.userEmail);
}

/**
 * All team memberships for an account, keyed by team id. Used by the Teams
 * settings page to render expandable member chips without N+1 queries.
 */
export async function listTeamMembersByAccount(
  accountId: string,
): Promise<Map<string, string[]>> {
  const db = await getDb();
  const rows = await db
    .select({
      teamId: teamMembers.teamId,
      userEmail: teamMembers.userEmail,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teams.accountId, accountId))
    .orderBy(teamMembers.userEmail);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.teamId) ?? [];
    list.push(row.userEmail);
    map.set(row.teamId, list);
  }
  return map;
}

/**
 * Team ids within `accountId` that include `userEmail`. Powers team-scoped
 * watchlist visibility.
 */
export async function listTeamIdsForUser(opts: {
  accountId: string;
  userEmail: string;
}): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teams.accountId, opts.accountId),
        eq(teamMembers.userEmail, opts.userEmail),
      ),
    );
  return rows.map((r) => r.teamId);
}

export async function addTeamMember(opts: {
  accountId: string;
  teamId: string;
  userEmail: string;
}): Promise<void> {
  const email = opts.userEmail.trim().toLowerCase();
  if (!email) return;
  const team = await getTeam(opts.teamId);
  if (!team || team.accountId !== opts.accountId) {
    throw new Error("team not found");
  }
  const membership = await getMembership({
    accountId: opts.accountId,
    userEmail: email,
  });
  if (!membership) {
    throw new Error("user is not an account member");
  }
  const db = await getDb();
  await db
    .insert(teamMembers)
    .values({ teamId: opts.teamId, userEmail: email })
    .onConflictDoNothing();
}

export async function removeTeamMember(opts: {
  accountId: string;
  teamId: string;
  userEmail: string;
}): Promise<void> {
  const email = opts.userEmail.trim().toLowerCase();
  const team = await getTeam(opts.teamId);
  if (!team || team.accountId !== opts.accountId) {
    throw new Error("team not found");
  }
  const db = await getDb();
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, opts.teamId), eq(teamMembers.userEmail, email)));
}

export async function renameAccount(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.update(accounts).set({ name, updatedAt: new Date() }).where(eq(accounts.id, id));
}

export async function setAccountPortfolioManagerEnabled(
  id: string,
  enabled: boolean,
): Promise<void> {
  const db = await getDb();
  await db
    .update(accounts)
    .set({ portfolioManagerEnabled: enabled, updatedAt: new Date() })
    .where(eq(accounts.id, id));
}

/**
 * Set (or clear) the account's "primary company" pointer — the company the
 * account *is* when operating in Company Manager mode. Pass null to clear.
 * The landing page uses this to skip /portfolio / /watchlists and route
 * straight to the company profile.
 */
export async function setAccountPrimaryCompany(
  id: string,
  companyUuid: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(accounts)
    .set({ primaryCompanyUuid: companyUuid, updatedAt: new Date() })
    .where(eq(accounts.id, id));
}

/**
 * Resolve the active account from a pre-fetched list. Same logic as
 * `getActiveAccountForUser` but skips the duplicate `listAccountsForUser`
 * call when the caller already has it (e.g. the layout renders both the
 * active account AND the switcher list — used to do two round-trips).
 */
export async function pickActiveAccountFromList(
  userEmail: string,
  list: AccountForUser[],
): Promise<AccountForUser | null> {
  if (list.length === 0) return null;
  const { getUserPreference, PREF_ACTIVE_ACCOUNT } = await import("./user-preferences");
  const preferredId = await getUserPreference({
    userEmail,
    key: PREF_ACTIVE_ACCOUNT,
  });
  if (preferredId) {
    const match = list.find((a) => a.id === preferredId);
    if (match) return match;
  }
  return list
    .slice()
    .sort((a, b) => {
      const ownerDiff = Number(b.role === "owner") - Number(a.role === "owner");
      if (ownerDiff !== 0) return ownerDiff;
      return b.memberCount - a.memberCount;
    })[0];
}

// ---------------------------------------------------------------------------
// Founder signup: provision a brand-new account with a claimed company domain.
// ---------------------------------------------------------------------------

export class UserAlreadyHasAccountError extends Error {
  constructor(email: string) {
    super(`user ${email} already has an account membership`);
    this.name = "UserAlreadyHasAccountError";
  }
}

export class InvalidSignupEmailError extends Error {
  constructor(reason: string) {
    super(`invalid signup email: ${reason}`);
    this.name = "InvalidSignupEmailError";
  }
}

/** Editable fields the founder confirms on the profile-reveal card. */
export interface ProvisionedCompanyProfile {
  name: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  categories?: string[] | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  employeeCount?: string | null;
  foundedOn?: string | null;
  totalFundingUsd?: number | null;
  numFundingRounds?: number | null;
  linkedinUrl?: string | null;
  crunchbaseUrl?: string | null;
  twitterUrl?: string | null;
  website?: string | null;
  businessModel?: string | null;
  /** Per-source raw payloads from the enrichment pipeline. */
  sources?: Record<string, unknown> | null;
}

export interface ProvisionedAccount {
  account: Account;
  catalogCompany: CatalogCompany;
}

/**
 * Transactionally provision a brand-new account with a claimed company
 * domain. Called by `/api/onboard/claim` after the user confirms the
 * auto-generated profile.
 *
 * In one transaction we:
 *   1. Insert `accounts` (verified_domain, verified_domain_at;
 *      operating → portfolio_manager_enabled=false + primary_company_uuid;
 *      investor → portfolio_manager_enabled=true, primary_company_uuid=null)
 *   2. Insert `catalog_companies` row keyed under the new account
 *   3. Insert `account_members` (role=owner) for the signup user
 *
 * Pre-checks:
 *   - Email must parse to a real domain.
 *   - Email must NOT be a generic / disposable provider (defense in depth —
 *     the API route checks too, but the helper enforces the invariant).
 *   - The caller must not already be a member of any account (one account
 *     per founder in v1; existing-member teammates should go through the
 *     invite flow instead of re-signing-up).
 *
 * Cold sign-ups at a domain that already has a workspace are allowed —
 * each new user gets their own standalone account. Teammates who want
 * to share a workspace go through the invite flow.
 *
 * Failure modes:
 *   - `InvalidSignupEmailError` — generic provider / unparseable domain.
 *   - `UserAlreadyHasAccountError` — user already has membership somewhere.
 */
export async function provisionCompanyAccount(opts: {
  email: string;
  profile: ProvisionedCompanyProfile;
  /** Investor onboarding enables Portfolio Manager by default. */
  flowType?: "operating" | "investor";
}): Promise<ProvisionedAccount> {
  const isInvestor = opts.flowType === "investor";
  const normalizedEmail = opts.email.trim().toLowerCase();
  if (isGenericProvider(normalizedEmail)) {
    throw new InvalidSignupEmailError("generic email provider");
  }
  const emailDomain = parseEmailDomain(normalizedEmail);
  if (!emailDomain) {
    throw new InvalidSignupEmailError("unparseable email");
  }
  // The verified domain is the email's domain — never accepted from the
  // request body. This bounds each account's claim to the domain Cognito
  // actually verified, regardless of what the client tries to send.
  const verifiedDomain = emailDomain.replace(/^www\./, "");

  const db = await getDb();

  // Refuse if the user is already a member of any account. Cheap pre-check
  // outside the transaction — the transaction below would not catch this
  // because account_members has no UNIQUE on userEmail (intentional: future
  // multi-account support).
  const [existing] = await db
    .select({ id: accountMembers.accountId })
    .from(accountMembers)
    .where(eq(accountMembers.userEmail, normalizedEmail))
    .limit(1);
  if (existing) {
    throw new UserAlreadyHasAccountError(normalizedEmail);
  }

  const accountId = `acct_${randomUUID()}`;
  const catalogId = `${CATALOG_UUID_PREFIX}${randomUUID()}`;
  const now = new Date();
  // Company website/domain is independent of accounts.verifiedDomain (email).
  // Prefer the claimed company's website hostname so claiming sedarplus.ca with a
  // @york.ie email does not stamp york.ie onto catalog_companies.domain.
  const companyDomain = resolveCatalogCompanyDomain({
    website: opts.profile.website,
    companyName: opts.profile.name,
    verifiedEmailDomain: verifiedDomain,
  });
  const companyWebsite =
    opts.profile.website ?? `https://${companyDomain}`;

  return await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({
        id: accountId,
        name: opts.profile.name.trim() || verifiedDomain,
        type: "ORGANIZATION",
        status: "ACTIVE",
        creatorEmail: normalizedEmail,
        planId: "free",
        planTier: "free",
        portfolioManagerEnabled: isInvestor,
        primaryCompanyUuid: isInvestor ? null : catalogId,
        verifiedDomain,
        verifiedDomainAt: now,
        logoUrl: opts.profile.logoUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [catalogCompany] = await tx
      .insert(catalogCompanies)
      .values({
        id: catalogId,
        accountId,
        name: opts.profile.name.trim() || companyDomain,
        domain: companyDomain,
        website: companyWebsite,
        shortDescription: opts.profile.shortDescription ?? null,
        longDescription: opts.profile.longDescription ?? null,
        logoUrl: opts.profile.logoUrl ?? null,
        industry: opts.profile.industry ?? null,
        categories: opts.profile.categories ?? null,
        locationCity: opts.profile.locationCity ?? null,
        locationState: opts.profile.locationState ?? null,
        locationCountry: opts.profile.locationCountry ?? null,
        employeeCount: opts.profile.employeeCount ?? null,
        foundedOn: opts.profile.foundedOn ?? null,
        totalFundingUsd: opts.profile.totalFundingUsd ?? null,
        numFundingRounds: opts.profile.numFundingRounds ?? null,
        linkedinUrl: opts.profile.linkedinUrl ?? null,
        crunchbaseUrl: opts.profile.crunchbaseUrl ?? null,
        twitterUrl: opts.profile.twitterUrl ?? null,
        businessModel: opts.profile.businessModel ?? null,
        sources: opts.profile.sources ?? null,
        createdByEmail: normalizedEmail,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(accountMembers).values({
      accountId,
      userEmail: normalizedEmail,
      role: "owner",
      invitedAt: now,
      acceptedAt: now,
    });

    await tx.insert(workspaceCreditLedger).values({
      accountId,
      flow: isInvestor ? "investor" : "founder",
      planSlug: "free",
      monthlyUsed: 0,
      dailyUsed: 0,
      topUpBalance: 0,
      stats: { signals: 0, docs: 0, messages: 0 },
      earnedModules: [],
      benchmarkEarned: false,
      setupIncomplete: false,
    });

    return { account, catalogCompany };
  });
}

async function _getActiveAccountForUser(userEmail: string): Promise<AccountForUser | null> {
  const list = await listAccountsForUser(userEmail);
  return pickActiveAccountFromList(userEmail, list);
}

/** Per-request dedupe — layout + page share one active-account resolution. */
export const getActiveAccountForUser = cache(_getActiveAccountForUser);

/**
 * Claimed company profile (founder / company-manager home).
 * Same rule as company page `isFounderHome`: primary company while PM mode is off.
 * Advisor show/link is allowed only for this company.
 */
export function isClaimedCompanyProfile(
  account:
    | Pick<Account, "portfolioManagerEnabled" | "primaryCompanyUuid">
    | null
    | undefined,
  companyUuid: string,
): boolean {
  return Boolean(
    account &&
      !account.portfolioManagerEnabled &&
      account.primaryCompanyUuid === companyUuid,
  );
}

/** Thrown when advisor link/unlink targets a non-claimed company. */
export class ClaimedProfileRequiredError extends Error {
  constructor(
    message = "Advisor linking is only allowed on a claimed company profile",
  ) {
    super(message);
    this.name = "ClaimedProfileRequiredError";
  }
}
