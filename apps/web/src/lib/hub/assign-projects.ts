import "server-only";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accountProjects, accounts } from "@/db/schema";

export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`account not found: ${accountId}`);
    this.name = "AccountNotFoundError";
  }
}

/**
 * Replace the project set for one account. Same project_id may exist on
 * other accounts; only rows for `accountId` are added/removed/updated.
 */
export async function assignProjectsToAccount(
  accountId: string,
  projectIds: string[],
): Promise<string[]> {
  const db = await getDb();
  const uniqueProjectIds = [...new Set(projectIds.map((id) => id.trim()).filter(Boolean))];

  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);
    if (!account) throw new AccountNotFoundError(accountId);

    if (uniqueProjectIds.length === 0) {
      await tx.delete(accountProjects).where(eq(accountProjects.accountId, accountId));
    } else {
      await tx
        .delete(accountProjects)
        .where(
          and(
            eq(accountProjects.accountId, accountId),
            notInArray(accountProjects.projectId, uniqueProjectIds),
          ),
        );

      const now = new Date();
      for (const projectId of uniqueProjectIds) {
        await tx
          .insert(accountProjects)
          .values({
            accountId,
            projectId,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [accountProjects.accountId, accountProjects.projectId],
            set: { updatedAt: now },
          });
      }
    }

    const rows = await tx
      .select({ projectId: accountProjects.projectId })
      .from(accountProjects)
      .where(eq(accountProjects.accountId, accountId))
      .orderBy(asc(accountProjects.projectId));

    return rows.map((r) => r.projectId);
  });
}
