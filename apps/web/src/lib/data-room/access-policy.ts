export type DataRoomAccessDecision = "allow" | "not_found" | "forbidden";

/**
 * Pure access policy for Data Room / Intelligence / Initiatives.
 * Catalog ownership is resolved by the caller.
 *
 * Non-catalog (fuel-data) companies are always allowed — rows are
 * account-scoped via accountId, including external companies the user
 * browses but has not claimed as their primary workspace.
 */
export function decideDataRoomAccess(opts: {
  isCatalog: boolean;
  catalogOwnedByAccount: boolean;
  isPrimaryCompany: boolean;
  portfolioManagerEnabled: boolean;
}): DataRoomAccessDecision {
  if (opts.isCatalog) {
    return opts.catalogOwnedByAccount ? "allow" : "not_found";
  }
  return "allow";
}
