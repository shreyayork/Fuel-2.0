"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  addTeamMember,
  countOwners,
  createTeam,
  deleteTeam,
  getActiveAccountForUser,
  getMembership,
  getTeam,
  isDuplicateTeamNameError,
  listMembers,
  listTeamMembers,
  removeMember,
  removeTeamMember,
  renameAccount,
  setMemberRole,
  updateTeam,
} from "@/lib/accounts";
import {
  addWatchlistShare,
  getWatchlist,
  linkWatchlistToTeam,
  removeWatchlistShare,
  unlinkWatchlistFromTeam,
} from "@/lib/watchlists";
import {
  createInvite,
  pendingInviteCount,
  resendInvite,
  revokeInvite,
} from "@/lib/invites";

/** Hard cap on concurrent pending invites per account — soft abuse guard. */
const MAX_PENDING_INVITES = 50;

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

/**
 * Returns the caller's role in the account, throwing if they're not a
 * member or aren't an owner/admin. Used by all account-mutation actions.
 * The returned role is what subsequent calls use to gate owner-only ops.
 */
async function requireAdminWithRole(
  accountId: string,
  email: string,
): Promise<"owner" | "admin"> {
  const m = await getMembership({ accountId, userEmail: email });
  if (!m || (m.role !== "owner" && m.role !== "admin")) {
    throw new Error("not authorized");
  }
  return m.role;
}

async function requireAdmin(accountId: string, email: string) {
  await requireAdminWithRole(accountId, email);
}

export async function inviteMemberAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const invitee = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member") as "owner" | "admin" | "member";
  if (!accountId || !invitee) return;
  const callerRole = await requireAdminWithRole(accountId, email);
  // Only owners can mint additional owners. Otherwise an admin could
  // invite themselves at a personal email as `owner`, accept the invite,
  // and grant themselves owner powers.
  if (role === "owner" && callerRole !== "owner") {
    throw new Error("only an owner can invite another owner");
  }
  const pending = await pendingInviteCount(accountId);
  if (pending >= MAX_PENDING_INVITES) {
    throw new Error("Pending invite limit reached. Revoke unused invites before sending more.");
  }
  await createInvite({ accountId, email: invitee, role, invitedByEmail: email });
  revalidatePath("/account/users");
}

export async function revokeInviteAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const tokenHash = String(formData.get("tokenHash") ?? "");
  if (!accountId || !tokenHash) return;
  await requireAdmin(accountId, email);
  await revokeInvite({ accountId, tokenHash });
  revalidatePath("/account/users");
}

export async function resendInviteAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const tokenHash = String(formData.get("tokenHash") ?? "");
  if (!accountId || !tokenHash) return;
  await requireAdmin(accountId, email);
  await resendInvite({ accountId, tokenHash, actorEmail: email });
  revalidatePath("/account/users");
}

export async function removeMemberAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const memberEmail = String(formData.get("email") ?? "");
  if (!accountId || !memberEmail) return;
  const callerRole = await requireAdminWithRole(accountId, email);
  // Look up the target's current role to gate sensitive operations.
  const target = await getMembership({ accountId, userEmail: memberEmail });
  if (!target) return; // already gone
  // Only owners can remove another owner. Otherwise an admin could kick
  // the founder out of their own workspace.
  if (target.role === "owner" && callerRole !== "owner") {
    throw new Error("only an owner can remove another owner");
  }
  // Never let the last owner be removed — leaves the account ownerless.
  if (target.role === "owner") {
    const owners = await countOwners(accountId);
    if (owners <= 1) {
      throw new Error("Cannot remove the last owner. Promote someone else to owner first.");
    }
  }
  await removeMember(accountId, memberEmail);
  revalidatePath("/account/users");
}

export async function setRoleAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const memberEmail = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "member") as "owner" | "admin" | "member";
  if (!accountId || !memberEmail) return;
  const callerRole = await requireAdminWithRole(accountId, email);
  const target = await getMembership({ accountId, userEmail: memberEmail });
  if (!target) throw new Error("member not found");
  // Only an owner can grant the `owner` role. Without this, an admin
  // could promote themselves (or anyone they invited) to owner.
  if (role === "owner" && callerRole !== "owner") {
    throw new Error("only an owner can grant the owner role");
  }
  // Only an owner can demote / change another owner's role (e.g. an
  // admin demoting the founder).
  if (target.role === "owner" && callerRole !== "owner") {
    throw new Error("only an owner can change another owner's role");
  }
  // Never let the last owner be demoted — leaves the account ownerless.
  if (target.role === "owner" && role !== "owner") {
    const owners = await countOwners(accountId);
    if (owners <= 1) {
      throw new Error("Cannot demote the last owner. Promote someone else first.");
    }
  }
  await setMemberRole(accountId, memberEmail, role);
  revalidatePath("/account/users");
}

export type TeamMutationResult = { error: string };

export async function createTeamAction(
  formData: FormData,
): Promise<TeamMutationResult | void> {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = (formData.get("description") as string | null) ?? undefined;
  const memberEmails = formData
    .getAll("memberEmails")
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);
  if (!accountId || !name) return;
  await requireAdmin(accountId, email);
  try {
    const team = await createTeam({ accountId, name, description: description ?? undefined });
    for (const memberEmail of [...new Set(memberEmails)]) {
      await addTeamMember({ accountId, teamId: team.id, userEmail: memberEmail });
    }
  } catch (error) {
    if (isDuplicateTeamNameError(error)) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/account/teams");
}

export async function updateTeamAction(
  formData: FormData,
): Promise<TeamMutationResult | void> {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = formData.get("description");
  const description =
    descriptionRaw === null ? undefined : String(descriptionRaw);
  const memberEmails = formData
    .getAll("memberEmails")
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);
  if (!accountId || !id || !name) return;
  await requireAdmin(accountId, email);
  const team = await getTeam(id);
  if (!team || team.accountId !== accountId) return;
  try {
    await updateTeam({
      id,
      accountId,
      name,
      description: description ?? null,
    });
    const current = await listTeamMembers(id);
    const currentSet = new Set(current.map((m) => m.userEmail.toLowerCase()));
    const nextSet = new Set(memberEmails);
    for (const memberEmail of nextSet) {
      if (!currentSet.has(memberEmail)) {
        await addTeamMember({ accountId, teamId: id, userEmail: memberEmail });
      }
    }
    for (const memberEmail of currentSet) {
      if (!nextSet.has(memberEmail)) {
        await removeTeamMember({ accountId, teamId: id, userEmail: memberEmail });
      }
    }
  } catch (error) {
    if (isDuplicateTeamNameError(error)) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/account/teams");
  revalidatePath("/watchlists");
  revalidatePath("/portfolio");
}

export async function deleteTeamAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!accountId || !id) return;
  await requireAdmin(accountId, email);
  const team = await getTeam(id);
  if (!team || team.accountId !== accountId) return;
  await deleteTeam(id);
  revalidatePath("/account/teams");
  revalidatePath("/watchlists");
  revalidatePath("/portfolio");
}

export async function addTeamMemberAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const memberEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!accountId || !teamId || !memberEmail) return;
  await requireAdmin(accountId, email);
  await addTeamMember({ accountId, teamId, userEmail: memberEmail });
  revalidatePath("/account/teams");
}

export async function removeTeamMemberAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const memberEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!accountId || !teamId || !memberEmail) return;
  await requireAdmin(accountId, email);
  await removeTeamMember({ accountId, teamId, userEmail: memberEmail });
  revalidatePath("/account/teams");
  revalidatePath("/watchlists");
  revalidatePath("/portfolio");
}

/**
 * Grant team-level access to a watchlist from the Teams settings screen.
 * Sets scope=team and links the team via watchlist_teams.
 */
export async function linkTeamWatchlistAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  if (!accountId || !teamId || !watchlistId) return;
  await requireAdmin(accountId, email);
  const [team, wl] = await Promise.all([getTeam(teamId), getWatchlist(watchlistId)]);
  if (!team || team.accountId !== accountId) return;
  if (!wl || wl.accountId !== accountId) return;
  await linkWatchlistToTeam({ watchlistId, teamId });
  revalidatePath("/account/teams");
  revalidateWatchlistPaths(watchlistId);
}

export async function unlinkTeamWatchlistAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  if (!accountId || !teamId || !watchlistId) return;
  await requireAdmin(accountId, email);
  const team = await getTeam(teamId);
  if (!team || team.accountId !== accountId) return;
  await unlinkWatchlistFromTeam({ watchlistId, teamId });
  revalidatePath("/account/teams");
  revalidateWatchlistPaths(watchlistId);
}

/** Tag a person onto a watchlist (watchlist_shares) from the Teams screen. */
export async function addWatchlistShareFromTeamAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const memberEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!accountId || !watchlistId || !memberEmail) return;
  await requireAdmin(accountId, email);
  const wl = await getWatchlist(watchlistId);
  if (!wl || wl.accountId !== accountId) return;
  const membership = await getMembership({ accountId, userEmail: memberEmail });
  if (!membership) throw new Error("user is not an account member");
  await addWatchlistShare({ watchlistId, userEmail: memberEmail });
  revalidatePath("/account/teams");
  revalidateWatchlistPaths(watchlistId);
}

export async function removeWatchlistShareFromTeamAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const memberEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!accountId || !watchlistId || !memberEmail) return;
  await requireAdmin(accountId, email);
  const wl = await getWatchlist(watchlistId);
  if (!wl || wl.accountId !== accountId) return;
  await removeWatchlistShare({ watchlistId, userEmail: memberEmail });
  revalidatePath("/account/teams");
  revalidateWatchlistPaths(watchlistId);
}

function revalidateWatchlistPaths(watchlistId: string) {
  revalidatePath(`/portfolio/${watchlistId}`);
  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath("/portfolio");
  revalidatePath("/watchlists");
}

export async function renameAccountAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!accountId || !name) return;
  await requireAdmin(accountId, email);
  await renameAccount(accountId, name);
  revalidatePath("/account/settings");
}

export async function setPortfolioManagerEnabledAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const enabled = formData.get("enabled") === "on";
  if (!accountId) return;
  await requireAdmin(accountId, email);
  const { setAccountPortfolioManagerEnabled } = await import("@/lib/accounts");
  await setAccountPortfolioManagerEnabled(accountId, enabled);
  // Revalidate the entire app shell so the sidebar nav reflects immediately.
  revalidatePath("/", "layout");
}

/**
 * Set the company this account identifies as "their own" (Company Manager
 * mode). Empty string clears the pointer. Writes revalidate the layout so
 * the landing page picks up the new redirect target on the next nav.
 */
export async function setPrimaryCompanyAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = String(formData.get("accountId") ?? "");
  const companyUuid = String(formData.get("companyUuid") ?? "").trim() || null;
  if (!accountId) return;
  await requireAdmin(accountId, email);
  const { setAccountPrimaryCompany } = await import("@/lib/accounts");
  await setAccountPrimaryCompany(accountId, companyUuid);
  revalidatePath("/", "layout");
}

export type AccountMemberOption = {
  email: string;
  role: "owner" | "admin" | "member";
};

/**
 * Account members for the caller's active workspace. Used by assignee
 * pickers — identity is email (no users table). Reuses `listMembers`.
 */
export async function listActiveAccountMembersAction(): Promise<AccountMemberOption[]> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return [];
  const members = await listMembers(account.id);
  return members.map((m) => ({ email: m.userEmail, role: m.role }));
}
