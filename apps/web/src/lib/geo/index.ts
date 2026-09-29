/**
 * Client-bundled ISO countries + subdivisions (no cities).
 * Data derived from the countries-states-cities dataset (countries + states only).
 * Stored form values use display names for compatibility with existing free-text
 * catalog / claim fields; codes are used only for cascade lookups.
 */
import countriesData from "./countries-data.json";
import subdivisionsData from "./subdivisions-data.json";
import type {
  GeoCountry,
  GeoSubdivision,
  ResolvedCountry,
  ResolvedSubdivision,
} from "./types";

export type {
  GeoCountry,
  GeoSubdivision,
  ResolvedCountry,
  ResolvedSubdivision,
} from "./types";

const COUNTRIES = countriesData as GeoCountry[];
const SUBDIVISIONS = subdivisionsData as Record<string, GeoSubdivision[]>;

/** Extra aliases beyond ISO codes / official names (enrichment + legacy). */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US",
  "united states of america": "US",
  uk: "GB",
  "great britain": "GB",
  "u.s.": "US",
  "u.s.a.": "US",
  "u.k.": "GB",
};

const countriesByCode = new Map(
  COUNTRIES.map((c) => [c.code.toUpperCase(), c] as const),
);

const countriesByName = new Map(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c] as const),
);

for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
  const country = countriesByCode.get(code);
  if (country) countriesByName.set(alias, country);
}

/** All bundled ISO countries (sorted by name). */
export function listCountries(): GeoCountry[] {
  return COUNTRIES;
}

/** Subdivisions for a country code; empty when none / unknown. */
export function listSubdivisions(countryCode: string | null | undefined): GeoSubdivision[] {
  if (!countryCode) return [];
  return SUBDIVISIONS[countryCode.toUpperCase()] ?? [];
}

export function countryHasSubdivisions(
  countryCode: string | null | undefined,
): boolean {
  return listSubdivisions(countryCode).length > 0;
}

/**
 * Resolve free-text or ISO code to a display country name.
 * Unmatched values are preserved (not wiped) with `matched: false`.
 */
export function resolveCountry(raw: string | null | undefined): ResolvedCountry {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { code: null, name: "", matched: false };
  }
  const byCode = countriesByCode.get(trimmed.toUpperCase());
  if (byCode) {
    return { code: byCode.code, name: byCode.name, matched: true };
  }
  const byName = countriesByName.get(trimmed.toLowerCase());
  if (byName) {
    return { code: byName.code, name: byName.name, matched: true };
  }
  return { code: null, name: trimmed, matched: false };
}

/**
 * Resolve free-text or subdivision code within a country.
 * Unmatched values are preserved with `matched: false`.
 */
export function resolveSubdivision(
  countryCode: string | null | undefined,
  raw: string | null | undefined,
): ResolvedSubdivision {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { code: null, name: "", matched: false };
  }
  const rows = listSubdivisions(countryCode);
  if (rows.length === 0) {
    return { code: null, name: trimmed, matched: false };
  }
  const upper = trimmed.toUpperCase();
  const byCode = rows.find((s) => s.code.toUpperCase() === upper);
  if (byCode) {
    return { code: byCode.code, name: byCode.name, matched: true };
  }
  const lower = trimmed.toLowerCase();
  const byName = rows.find((s) => s.name.toLowerCase() === lower);
  if (byName) {
    return { code: byName.code, name: byName.name, matched: true };
  }
  return { code: null, name: trimmed, matched: false };
}

/** HQ location fields shared by onboarding profile forms. */
export type LocationFormFields = {
  country: string;
  stateRegion: string;
  city: string;
};

/**
 * Country change clears dependent state/city (cascade).
 * State and city patches merge — selecting a state must not wipe a scraped city.
 */
export function applyLocationCountryChange(nextCountry: string): LocationFormFields {
  return { country: nextCountry, stateRegion: "", city: "" };
}

export function applyLocationStateChange(
  prev: LocationFormFields,
  nextState: string,
): LocationFormFields {
  return { ...prev, stateRegion: nextState };
}

export function applyLocationCityChange(
  prev: LocationFormFields,
  nextCity: string,
): LocationFormFields {
  return { ...prev, city: nextCity };
}

/**
 * Normalize location fields for form display / persistence.
 * Stores display names; preserves unknown legacy strings.
 */
export function normalizeLocationForForm(input: {
  country: string;
  stateRegion: string;
  city: string;
}): { country: string; stateRegion: string; city: string; countryCode: string | null } {
  const country = resolveCountry(input.country);
  const state = resolveSubdivision(country.code, input.stateRegion);
  return {
    country: country.name,
    stateRegion: state.name,
    city: input.city.trim(),
    countryCode: country.code,
  };
}
