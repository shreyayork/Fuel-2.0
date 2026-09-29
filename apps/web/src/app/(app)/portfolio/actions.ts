"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  addCompanyToWatchlist,
  addWatchlistShare,
  createWatchlist,
  deleteWatchlist,
  getWatchlist,
  isDuplicateWatchlistNameError,
  listWatchlistTeamIds,
  removeCompanyFromWatchlist,
  removeWatchlistShare,
  renameWatchlist,
  setBenchmarkMetricIds,
  setFollower,
  setScope,
  type Cadence,
} from "@/lib/watchlists";
import { getMembership, listTeams } from "@/lib/accounts";
import { autoBuildInvestorPortfolios } from "@/lib/portfolio/auto-build";
import {
  manualCohortDescription,
} from "@/lib/portfolio/auto-build-ids";
import type { RoundBucket } from "@/lib/portfolio/round-buckets";
import { ROUND_BUCKETS } from "@/lib/portfolio/round-buckets";
import { getDb } from "@/db/client";
import { accounts, catalogCompanies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { captureIntegrationException } from "@/lib/sentry/capture";

export type WatchlistMutationResult = { error: string };

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

async function requireAccount(email: string): Promise<string> {
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");
  return account.id;
}

function revalidateWatchlistPaths(watchlistId: string) {
  revalidatePath(`/portfolio/${watchlistId}`);
  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath("/portfolio");
  revalidatePath("/watchlists");
}

function parseTeamIds(formData: FormData): string[] {
  return formData
    .getAll("teamIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export async function createWatchlistAction(
  formData: FormData,
): Promise<WatchlistMutationResult | void> {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("scope") ?? "private") as "private" | "account" | "team";
  const kind = String(formData.get("kind") ?? "watchlist") as "portfolio" | "watchlist";
  const fundName = (formData.get("fundName") as string | null)?.trim() || undefined;
  const cohortRaw = String(formData.get("cohort") ?? "").trim();
  const teamIds = parseTeamIds(formData);
  if (!name) return;
  if (scope === "team" && teamIds.length === 0) {
    return { error: "Select at least one team for team-scoped access." };
  }
  if (teamIds.length > 0) {
    const accountTeams = await listTeams(accountId);
    const allowed = new Set(accountTeams.map((t) => t.id));
    if (teamIds.some((id) => !allowed.has(id))) {
      return { error: "One or more selected teams are invalid." };
    }
  }
  let description: string | undefined;
  if (kind === "portfolio") {
    if (!(ROUND_BUCKETS as readonly string[]).includes(cohortRaw)) {
      return { error: "Select a stage (cohort) for this portfolio." };
    }
    description = manualCohortDescription(cohortRaw as RoundBucket);
  }
  let wl;
  try {
    wl = await createWatchlist({
      name,
      ownerEmail: email,
      accountId,
      scope,
      kind,
      fundName,
      description,
      teamIds: scope === "team" ? teamIds : undefined,
    });
  } catch (error) {
    if (isDuplicateWatchlistNameError(error)) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/portfolio");
  revalidatePath("/watchlists");
  redirect(kind === "portfolio" ? `/portfolio/${wl.id}` : `/watchlists/${wl.id}`);
}

/** Fetch/merge holdings and create auto portfolios when missing (idempotent). */
export async function ensureInvestorPortfoliosAction(
  firmNameHint?: string,
): Promise<{ ok: boolean; holdingCount: number }> {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const db = await getDb();
  const [account] = await db
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  // Investor accounts store the firm on catalog_companies (primaryCompanyUuid is null).
  const [catalog] = await db
    .select({
      name: catalogCompanies.name,
      domain: catalogCompanies.domain,
    })
    .from(catalogCompanies)
    .where(eq(catalogCompanies.accountId, accountId))
    .limit(1);
  const firmName = (
    firmNameHint?.trim() ||
    catalog?.name?.trim() ||
    account?.name ||
    ""
  ).trim();
  if (!firmName) return { ok: false, holdingCount: 0 };
  try {
    const result = await autoBuildInvestorPortfolios({
      accountId,
      userEmail: email,
      firmName,
      firmDomain: catalog?.domain ?? null,
      force: false,
    });
    revalidatePath("/portfolio");
    return { ok: true, holdingCount: result.holdingCount };
  } catch (e) {
    // Claim fires auto-build in parallel with ?first=1 ensure — duplicate
    // name must not surface as an RSC digest to the client.
    if (isDuplicateWatchlistNameError(e)) {
      revalidatePath("/portfolio");
      return { ok: true, holdingCount: 0 };
    }
    captureIntegrationException(e, {
      integration: "neptune",
      operation: "ensure_investor_portfolios",
    });
    throw e;
  }
}

export async function renameWatchlistAction(
  formData: FormData,
): Promise<WatchlistMutationResult | void> {
  await requireEmail();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  try {
    await renameWatchlist(id, name);
  } catch (error) {
    if (isDuplicateWatchlistNameError(error)) {
      return { error: error.message };
    }
    throw error;
  }
  revalidateWatchlistPaths(id);
}

export async function setScopeAction(
  formData: FormData,
): Promise<WatchlistMutationResult | void> {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("id") ?? "");
  const scope = String(formData.get("scope") ?? "private") as "private" | "account" | "team";
  const teamIds = parseTeamIds(formData);
  if (!id) return;
  const wl = await getWatchlist(id);
  if (!wl || wl.accountId !== accountId) return;
  if (wl.ownerEmail !== email) return;
  if (scope === "team" && teamIds.length === 0) {
    const existing = await listWatchlistTeamIds(id);
    if (existing.length === 0) {
      return { error: "Select at least one team for team-scoped access." };
    }
    await setScope(id, scope);
  } else {
    await setScope(id, scope, scope === "team" ? teamIds : undefined);
  }
  revalidateWatchlistPaths(id);
}

export async function setWatchlistTeamsAction(
  formData: FormData,
): Promise<WatchlistMutationResult | void> {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("id") ?? "");
  const teamIds = parseTeamIds(formData);
  if (!id) return;
  const wl = await getWatchlist(id);
  if (!wl || wl.accountId !== accountId) return;
  if (wl.ownerEmail !== email) return;
  if (teamIds.length === 0) {
    return { error: "Select at least one team for team-scoped access." };
  }
  const accountTeams = await listTeams(accountId);
  const allowed = new Set(accountTeams.map((t) => t.id));
  if (teamIds.some((tid) => !allowed.has(tid))) {
    return { error: "One or more selected teams are invalid." };
  }
  await setScope(id, "team", teamIds);
  revalidateWatchlistPaths(id);
}

export async function addWatchlistShareAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const memberEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!watchlistId || !memberEmail) return;
  const wl = await getWatchlist(watchlistId);
  if (!wl || wl.accountId !== accountId) return;
  if (wl.ownerEmail !== email) return;
  const membership = await getMembership({ accountId, userEmail: memberEmail });
  if (!membership) return;
  await addWatchlistShare({ watchlistId, userEmail: memberEmail });
  revalidateWatchlistPaths(watchlistId);
}

export async function removeWatchlistShareAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const memberEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!watchlistId || !memberEmail) return;
  const wl = await getWatchlist(watchlistId);
  if (!wl || wl.accountId !== accountId) return;
  if (wl.ownerEmail !== email) return;
  await removeWatchlistShare({ watchlistId, userEmail: memberEmail });
  revalidateWatchlistPaths(watchlistId);
}

export async function deleteWatchlistAction(formData: FormData) {
  await requireEmail();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteWatchlist(id);
  revalidatePath("/portfolio");
  revalidatePath("/watchlists");
  const returnTo = String(formData.get("returnTo") ?? "/portfolio");
  redirect(returnTo === "/watchlists" ? "/watchlists" : "/portfolio");
}

export async function addCompanyAction(formData: FormData) {
  const email = await requireEmail();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const companyUuid = String(formData.get("companyUuid") ?? "");
  const name = (formData.get("name") as string | null) ?? undefined;
  if (!watchlistId || !companyUuid) return;
  await addCompanyToWatchlist({ watchlistId, companyUuid, name, addedByEmail: email });
  revalidateWatchlistPaths(watchlistId);
}

export async function removeCompanyAction(formData: FormData) {
  await requireEmail();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const companyUuid = String(formData.get("companyUuid") ?? "");
  if (!watchlistId || !companyUuid) return;
  await removeCompanyFromWatchlist(watchlistId, companyUuid);
  revalidateWatchlistPaths(watchlistId);
}

/**
 * Save which benchmark metrics this portfolio surfaces. Empty selection
 * clears the override so the portfolio falls back to the default set. The
 * picker posts multiple `metricId` form entries — we collect them all.
 */
export async function setBenchmarkMetricsAction(formData: FormData) {
  await requireEmail();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const metricIds = formData
    .getAll("metricId")
    .map((v) => String(v))
    .filter(Boolean);
  await setBenchmarkMetricIds(id, metricIds.length > 0 ? metricIds : null);
  revalidateWatchlistPaths(id);
}

export async function setFollowerAction(formData: FormData) {
  const email = await requireEmail();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const cadence = (formData.get("cadence") as Cadence | null) ?? undefined;
  const starredRaw = formData.get("starred");
  const starred =
    starredRaw == null ? undefined : starredRaw === "true" || starredRaw === "on" || starredRaw === "1";
  if (!watchlistId) return;
  await setFollower({ watchlistId, userEmail: email, cadence, starred });
  revalidateWatchlistPaths(watchlistId);
}
