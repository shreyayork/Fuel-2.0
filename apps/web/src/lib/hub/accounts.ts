import "server-only";
import { asc, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accounts } from "@/db/schema";

export interface HubAccountRow {
  id: string;
  name: string;
  creator_email: string;
}

const MAX_RESULTS = 100;

/** Escape `%` and `_` so user input is treated literally in ILIKE patterns. */
function ilikeContains(term: string): string {
  return `%${term.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * List accounts for the Hub integration API. When `search` is provided,
 * matches case-insensitively against name and creator_email (substring).
 */
export async function searchHubAccounts(search?: string | null): Promise<HubAccountRow[]> {
  const db = await getDb();
  const term = search?.trim();

  const base = db
    .select({
      id: accounts.id,
      name: accounts.name,
      creatorEmail: accounts.creatorEmail,
    })
    .from(accounts);

  const rows = term
    ? await base
        .where(
          or(
            ilike(accounts.name, ilikeContains(term)),
            ilike(accounts.creatorEmail, ilikeContains(term)),
          ),
        )
        .orderBy(asc(accounts.name))
        .limit(MAX_RESULTS)
    : await base.orderBy(asc(accounts.name)).limit(MAX_RESULTS);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    creator_email: row.creatorEmail,
  }));
}
