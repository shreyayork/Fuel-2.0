import "server-only";
import { getCatalogCompany, isCatalogUuid } from "@/lib/catalog";
import type { AccountForUser } from "@/lib/accounts";
import {
  decideDataRoomAccess,
  type DataRoomAccessDecision,
} from "./access-policy";

export type { DataRoomAccessDecision };
export { decideDataRoomAccess };

export class DataRoomAccessError extends Error {
  readonly code: "not_found" | "forbidden";

  constructor(code: "not_found" | "forbidden") {
    super(code);
    this.name = "DataRoomAccessError";
    this.code = code;
  }
}

/**
 * Data Room / Intelligence / Initiatives access is allowed for:
 * - catalog companies owned by the account
 * - any fuel-data company UUID (account-scoped rows via accountId),
 *   including external companies the user has not claimed as primary
 */
export async function assertCompanyDataRoomAccess(
  account: AccountForUser,
  companyUuid: string,
): Promise<void> {
  const isCatalog = isCatalogUuid(companyUuid);
  let catalogOwnedByAccount = false;
  if (isCatalog) {
    const catalog = await getCatalogCompany(companyUuid);
    catalogOwnedByAccount = Boolean(catalog && catalog.accountId === account.id);
  }

  const decision = decideDataRoomAccess({
    isCatalog,
    catalogOwnedByAccount,
    isPrimaryCompany: account.primaryCompanyUuid === companyUuid,
    portfolioManagerEnabled: account.portfolioManagerEnabled,
  });

  if (decision === "allow") return;
  throw new DataRoomAccessError(decision);
}
