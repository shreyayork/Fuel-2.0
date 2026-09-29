/** ISO country row for onboard location pickers. */
export type GeoCountry = {
  code: string;
  name: string;
};

/** ISO subdivision (state / region / province) within a country. */
export type GeoSubdivision = {
  code: string;
  name: string;
};

/** Result of resolving a free-text / code country value against the dataset. */
export type ResolvedCountry = {
  /** ISO 3166-1 alpha-2 when matched; null when unmatched legacy value. */
  code: string | null;
  /** Display name to store / show (canonical when matched, else original). */
  name: string;
  matched: boolean;
};

/** Result of resolving a free-text / code subdivision value. */
export type ResolvedSubdivision = {
  code: string | null;
  name: string;
  matched: boolean;
};
