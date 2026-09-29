/**
 * Fuel 1.0 watchlists only ever existed in the prod Amplify env, so every
 * Fuel 2.0 stage (dev, stage, prod) migrates from these tables.
 *
 * Shared by the migration Lambda and its CDK construct so the DynamoDB table
 * names read at runtime and the ARNs granted in IAM can never drift apart.
 */
export const LEGACY_SUFFIX = "rht7ttva25efbpq65ggzd4tfwi-prod";

export const LEGACY_TABLES = {
  account: `Account-${LEGACY_SUFFIX}`,
  watchlist: `Watchlist-${LEGACY_SUFFIX}`,
  watchlistSetting: `WatchlistSetting-${LEGACY_SUFFIX}`,
  watchlistUser: `WatchlistUser-${LEGACY_SUFFIX}`,
  watchlistTeam: `WatchlistTeam-${LEGACY_SUFFIX}`,
} as const;
