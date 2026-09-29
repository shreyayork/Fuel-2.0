import { stripContinentFromCountry } from "@/lib/benchmarks-shared";
import { resolveCountry } from "@/lib/geo";

export type CrunchbaseProfileFields = {
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  foundedOn: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
};

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function isRegionCode(raw: string): boolean {
  return /^[A-Z]{2,3}$/.test(raw);
}

/** Map ISO codes / aliases to display names; preserve unmatched legacy strings. */
export function normalizeCountry(raw: string | null): string | null {
  if (!raw) return null;
  const resolved = resolveCountry(raw);
  return resolved.name || null;
}

/** Extract a 4-digit founding year from dates, copyright text, or numeric years. */
export function parseFoundedYear(raw: unknown): string | null {
  if (typeof raw === "number" && raw >= 1800 && raw <= 2100) return String(Math.trunc(raw));
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})(?:-\d{2}-\d{2})?/.exec(s);
  if (iso?.[1]) return iso[1];
  const embedded = /\b(19|20)\d{2}\b/.exec(s);
  return embedded?.[0] ?? null;
}

function parseLocationString(
  raw: string,
): Pick<CrunchbaseProfileFields, "locationCity" | "locationState" | "locationCountry"> {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const countryRaw = stripContinentFromCountry(parts.slice(2).join(", "));
    return {
      locationCity: parts[0],
      locationState: parts[1],
      locationCountry: normalizeCountry(countryRaw),
    };
  }
  if (parts.length === 2) {
    return {
      locationCity: parts[0],
      locationState: parts[1],
      locationCountry: null,
    };
  }
  return {
    locationCity: parts[0] ?? null,
    locationState: null,
    locationCountry: null,
  };
}

function locationFromObject(obj: Record<string, unknown>): Pick<
  CrunchbaseProfileFields,
  "locationCity" | "locationState" | "locationCountry"
> {
  const city = pickStr(obj.city ?? obj.location_city ?? obj.headquarters_city);
  let state = pickStr(
    obj.region ?? obj.state ?? obj.state_code ?? obj.location_state ?? obj.headquarters_state,
  );
  const country = normalizeCountry(
    pickStr(obj.country ?? obj.country_code ?? obj.location_country ?? obj.headquarters_country),
  );
  if (state && isRegionCode(state) && !city && !country) {
    state = null;
  }
  return {
    locationCity: city,
    locationState: state,
    locationCountry: country,
  };
}

function mergeLocation(
  base: Pick<CrunchbaseProfileFields, "locationCity" | "locationState" | "locationCountry">,
  next: Pick<CrunchbaseProfileFields, "locationCity" | "locationState" | "locationCountry">,
): Pick<CrunchbaseProfileFields, "locationCity" | "locationState" | "locationCountry"> {
  return {
    locationCity: base.locationCity ?? next.locationCity,
    locationState: base.locationState ?? next.locationState,
    locationCountry: base.locationCountry ?? next.locationCountry,
  };
}

/** Normalize Bright Data / Crunchbase payloads into flat profile fields. */
export function extractCrunchbaseProfileFields(
  cb: Record<string, unknown> | undefined,
): CrunchbaseProfileFields {
  const empty: CrunchbaseProfileFields = {
    locationCity: null,
    locationState: null,
    locationCountry: null,
    foundedOn: null,
    linkedinUrl: null,
    twitterUrl: null,
  };
  if (!cb) return empty;

  let loc: Pick<CrunchbaseProfileFields, "locationCity" | "locationState" | "locationCountry"> = {
    locationCity: null,
    locationState: null,
    locationCountry: null,
  };

  const locObj = cb.location_identifiers ?? cb.location;
  if (locObj && typeof locObj === "object" && !Array.isArray(locObj)) {
    loc = mergeLocation(loc, locationFromObject(locObj as Record<string, unknown>));
  }

  const hqObj = cb.headquarters;
  if (hqObj && typeof hqObj === "object" && !Array.isArray(hqObj)) {
    loc = mergeLocation(loc, locationFromObject(hqObj as Record<string, unknown>));
  }

  const locations = cb.locations ?? cb.headquarters_locations;
  if (Array.isArray(locations)) {
    for (const item of locations) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        loc = mergeLocation(loc, locationFromObject(item as Record<string, unknown>));
        if (loc.locationCity && loc.locationState && loc.locationCountry) break;
      }
    }
  }

  const hqText =
    pickStr(cb.headquarters_location) ??
    pickStr(typeof cb.headquarters === "string" ? cb.headquarters : null) ??
    pickStr(cb.location) ??
    pickStr(cb.address) ??
    pickStr(cb.company_headquarters);
  if (hqText) {
    loc = mergeLocation(loc, parseLocationString(hqText));
  }

  loc = mergeLocation(loc, {
    locationCity: pickStr(cb.headquarters_city ?? cb.city ?? cb.location_city),
    locationState: pickStr(
      cb.headquarters_state ?? cb.state ?? cb.state_code ?? cb.location_state,
    ),
    locationCountry: normalizeCountry(
      pickStr(cb.headquarters_country ?? cb.country ?? cb.country_code ?? cb.location_country),
    ),
  });

  const regionText = pickStr(cb.region);
  if (regionText) {
    if (regionText.includes(",") || regionText.includes(" ")) {
      loc = mergeLocation(loc, parseLocationString(regionText));
    } else if (!loc.locationCountry && isRegionCode(regionText)) {
      loc = mergeLocation(loc, { locationCity: null, locationState: null, locationCountry: normalizeCountry(regionText) });
    } else if (!loc.locationState && !isRegionCode(regionText)) {
      loc = mergeLocation(loc, { locationCity: null, locationState: regionText, locationCountry: null });
    }
  }

  const foundedRaw =
    cb.founded_on ??
    cb.founded_date ??
    cb.founding_date ??
    cb.founded ??
    cb.founded_year ??
    cb.year_founded ??
    cb.yearFounded;

  return {
    locationCity: loc.locationCity,
    locationState: loc.locationState,
    locationCountry: loc.locationCountry,
    foundedOn: parseFoundedYear(foundedRaw),
    linkedinUrl: pickStr(cb.linkedin_url ?? cb.linkedin),
    twitterUrl: pickStr(cb.twitter_url ?? cb.twitter),
  };
}

export type MappedFundingRound = {
  roundType: string;
  amountUsd: number | null;
  announcedOn: string | null;
  investors: string[];
};

export type MappedCrunchbaseFunding = {
  fundingRounds: MappedFundingRound[] | null;
  totalFundingUsd: number | null;
  numFundingRounds: number | null;
  lastFundingType: string | null;
  lastFundingAt: string | null;
};

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function investorNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) =>
      typeof i === "string"
        ? i
        : typeof i === "object" && i
          ? String(
              (i as { name?: string; value?: string }).name ??
                (i as { value?: string }).value ??
                "",
            )
          : "",
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalize one Bright Data / Crunchbase funding-round object into the
 * enrichment shape. Returns null when the row looks like an *outbound*
 * investment (investor org → portfolio), not capital raised by the company.
 */
export function mapOneCrunchbaseFundingRound(
  raw: unknown,
): MappedFundingRound | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Outbound investor rows (funds_raised / investments) look like:
  //   { type: "investment", value: "York IE investment in Seed Round - Lexful",
  //     funding_round: { value: "Seed Round - Lexful" }, organization: {...} }
  // Those are NOT the company's own raise history.
  if (
    r.type === "investment" ||
    (typeof r.value === "string" &&
      /investment in/i.test(r.value) &&
      r.funding_round != null)
  ) {
    return null;
  }

  const nestedRound =
    r.funding_round && typeof r.funding_round === "object"
      ? (r.funding_round as Record<string, unknown>)
      : null;

  const roundType = String(
    r.investment_type ??
      r.funding_type ??
      r.round_type ??
      r.type ??
      nestedRound?.investment_type ??
      nestedRound?.value ??
      "",
  ).trim();

  const amountUsd =
    asFiniteNumber(r.raised_amount_usd) ??
    asFiniteNumber(r.money_raised_usd) ??
    asFiniteNumber(r.amount_usd) ??
    asFiniteNumber(r.raised_amount) ??
    null;

  const announcedOn = pickStr(
    (r.announced_on as string | null | undefined) ??
      (r.announced_at as string | null | undefined) ??
      (r.announced_date as string | null | undefined) ??
      (r.date as string | null | undefined) ??
      null,
  );

  const investors = investorNames(r.investors ?? r.investor_list);

  // Require at least a round type or an amount — skip empty shells.
  if (!roundType && amountUsd == null) return null;

  return {
    roundType,
    amountUsd,
    announcedOn,
    investors,
  };
}

/**
 * Map Bright Data Crunchbase company scrape → funding fields.
 *
 * Bright Data may expose inbound rounds as `funding_rounds` and/or
 * `funding_rounds_detailed`. Investor orgs also get `funds_raised` /
 * `investments` (outbound) — those must NOT become company fundingRounds.
 */
export function mapCrunchbaseFundingFields(
  cb: Record<string, unknown>,
): MappedCrunchbaseFunding {
  const candidates: unknown[] = [];
  // Bright Data may expose inbound rounds as an array under several keys.
  // Note: `funding_rounds` is sometimes a summary *object* (not an array) —
  // only array values are collected. Prefer detailed/list arrays when present.
  for (const key of [
    "funding_rounds_detailed",
    "funding_rounds_list",
    "funding_rounds",
  ] as const) {
    const raw = cb[key];
    if (Array.isArray(raw) && raw.length > 0) {
      candidates.push(...raw);
      break;
    }
  }

  const fundingRounds = candidates
    .map(mapOneCrunchbaseFundingRound)
    .filter((r): r is MappedFundingRound => r != null);

  const totalFundingUsd =
    asFiniteNumber(cb.total_funding_usd) ??
    asFiniteNumber(cb.total_funding) ??
    asFiniteNumber(cb.funding_total_usd) ??
    null;

  const numFundingRounds =
    asFiniteNumber(cb.num_funding_rounds) ??
    asFiniteNumber(cb.number_of_funding_rounds) ??
    (fundingRounds.length > 0 ? fundingRounds.length : null);

  const lastFundingType = pickStr(
    (cb.last_funding_type as string | null | undefined) ??
      (cb.last_equity_funding_type as string | null | undefined) ??
      fundingRounds[0]?.roundType ??
      null,
  );

  const lastFundingAt = pickStr(
    (cb.last_funding_at as string | null | undefined) ??
      (cb.last_funding_round_date as string | null | undefined) ??
      (cb.last_funding_date as string | null | undefined) ??
      fundingRounds[0]?.announcedOn ??
      null,
  );

  return {
    fundingRounds: fundingRounds.length > 0 ? fundingRounds : null,
    totalFundingUsd,
    numFundingRounds,
    lastFundingType,
    lastFundingAt,
  };
}

