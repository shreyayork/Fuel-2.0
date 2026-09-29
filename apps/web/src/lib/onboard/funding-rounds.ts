import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import { formatBenchmarkUsd } from "@/lib/benchmarks-format";
import { normalizeFoundedYearForForm } from "@/lib/onboard/founded-year";

export interface FundingRoundRow {
  id: string;
  type: string;
  amount: string;
  date: string;
  investors: string;
}

const CB_ROUND_TYPE_MAP: Record<string, string> = {
  pre_seed: "Pre-seed",
  preseed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  series_d: "Series C",
  angel: "Angel",
  convertible_note: "Convertible Note",
  grant: "Grant",
  bridge: "Bridge",
  debt_financing: "Bridge",
};

export function normalizeCbRoundType(raw: string | null | undefined): string {
  if (!raw) return "";
  return CB_ROUND_TYPE_MAP[raw.toLowerCase().replace(/[-\s]/g, "_")] ?? "";
}

/** Neptune / enrichment funding row (amount in USD). */
export type FuelFundingRound = {
  roundType: string;
  amountUsd: number | null;
  announcedOn: string | null;
  investors: string[];
};

/** Structural Neptune round — avoids pulling server-only fuel-data into clients/tests. */
export type NeptuneFundingRoundLike = {
  investmentType?: string;
  raisedAmountUsd?: number;
  announcedOn?: string;
  investorNames?: string[];
  investors?: Array<{ name: string }>;
};

export function mapNeptuneFundingRounds(
  rounds: NeptuneFundingRoundLike[],
): FuelFundingRound[] {
  return rounds.map((r) => {
    const rawType = r.investmentType?.trim() ?? "";
    const mapped = normalizeCbRoundType(rawType);
    return {
      roundType: mapped || rawType,
      amountUsd: r.raisedAmountUsd ?? null,
      announcedOn: r.announcedOn ?? null,
      investors: (r.investorNames ?? r.investors?.map((i) => i.name) ?? []).filter(
        Boolean,
      ),
    };
  });
}

/** Picker-shaped funding rows (OnboardCompanyOption.funding). */
export function neptuneRoundsToPickerFunding(
  rounds: NeptuneFundingRoundLike[],
): Array<{ type: string; amount: string; date: string; investors: string }> {
  return mapNeptuneFundingRounds(rounds).map((r) => ({
    type: r.roundType,
    amount: r.amountUsd != null ? formatBenchmarkUsd(r.amountUsd) : "",
    date: r.announcedOn ?? "",
    investors: r.investors.join(", "),
  }));
}

/** Structural OpenSearch org fields used when merging into enrichment. */
export type FuelOrgHitLike = {
  name: string;
  shortDescription?: string;
  categories?: string[];
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  foundedOn?: string;
  employeeCount?: string;
  totalFundingUsd?: number;
  logoUrl?: string;
};

/** Apply Fuel hit fields onto an enrichment payload (fill empty only). */
export function mergeFuelHitIntoPayload(
  payload: {
    name: string | null;
    shortDescription: string | null;
    industry: string | null;
    locationCity: string | null;
    locationState: string | null;
    locationCountry: string | null;
    foundedOn: string | null;
    employeeCount: string | null;
    totalFundingUsd: number | null;
    numFundingRounds: number | null;
    lastFundingType: string | null;
    lastFundingAt: string | null;
    fundingRounds: FuelFundingRound[] | null;
  },
  hit: FuelOrgHitLike,
  fundingRounds: FuelFundingRound[],
): void {
  if (!payload.name && hit.name) payload.name = hit.name;
  if (!payload.shortDescription && hit.shortDescription) {
    payload.shortDescription = hit.shortDescription;
  }
  if (!payload.industry && hit.categories && hit.categories.length > 0) {
    payload.industry = hit.categories.slice(0, 3).join(", ");
  }
  if (!payload.locationCity && hit.locationCity) {
    payload.locationCity = hit.locationCity;
  }
  if (!payload.locationState && hit.locationState) {
    payload.locationState = hit.locationState;
  }
  if (!payload.locationCountry && hit.locationCountry) {
    payload.locationCountry = hit.locationCountry;
  }
  if (!payload.foundedOn && hit.foundedOn) {
    payload.foundedOn =
      normalizeFoundedYearForForm(hit.foundedOn) || hit.foundedOn;
  }
  if (!payload.employeeCount && hit.employeeCount) {
    payload.employeeCount = hit.employeeCount;
  }
  if (payload.totalFundingUsd == null && hit.totalFundingUsd != null) {
    payload.totalFundingUsd = hit.totalFundingUsd;
  }
  if (fundingRounds.length > 0) {
    payload.fundingRounds = fundingRounds;
    payload.numFundingRounds = fundingRounds.length;
    payload.lastFundingType = fundingRounds[0]?.roundType ?? null;
    payload.lastFundingAt = fundingRounds[0]?.announcedOn ?? null;
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Most recent funding round type for cohort stage inference. */
export function latestFundingTypeFromRounds(
  rounds: Array<{ type: string; date?: string }>,
): string | null {
  if (!rounds.length) return null;
  const sorted = [...rounds].sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : Number.NaN;
    const db = b.date ? Date.parse(b.date) : Number.NaN;
    const aTime = Number.isFinite(da) ? da : 0;
    const bTime = Number.isFinite(db) ? db : 0;
    return bTime - aTime;
  });
  const type = sorted[0]?.type?.trim();
  return type || null;
}

export function initFundingRoundsFromEnrichment(opts: {
  enrichment: EnrichmentPayload | null;
  totalFundingLabel?: string;
  lastFundingType?: string | null;
  lastFundingAt?: string | null;
}): FundingRoundRow[] {
  const { enrichment, totalFundingLabel, lastFundingType, lastFundingAt } = opts;
  const rounds = enrichment?.fundingRounds;

  if (rounds && rounds.length > 0) {
    return rounds.map((r) => ({
      id: uid(),
      type: normalizeCbRoundType(r.roundType),
      amount: r.amountUsd ? formatBenchmarkUsd(r.amountUsd) : "",
      date: r.announcedOn ?? "",
      investors: r.investors.join(", "),
    }));
  }

  const total =
    totalFundingLabel ||
    (enrichment?.totalFundingUsd != null
      ? formatBenchmarkUsd(enrichment.totalFundingUsd)
      : "");
  const ft = lastFundingType ?? enrichment?.lastFundingType ?? null;
  const fa = lastFundingAt ?? enrichment?.lastFundingAt ?? null;

  if (total) {
    return [
      {
        id: uid(),
        type: normalizeCbRoundType(ft),
        amount: total,
        date: fa ?? "",
        investors: "",
      },
    ];
  }

  return [];
}

/** Normalize round date to ISO `yyyy-mm-dd`. Empty if unusable. */
export function toFundingRoundDateInputValue(
  raw: string | null | undefined,
): string {
  if (!raw?.trim()) return "";
  const t = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // mm/dd/yyyy (also mm-dd-yyyy / mm.dd.yyyy)
  const mdy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (mdy) {
    const month = mdy[1].padStart(2, "0");
    const day = mdy[2].padStart(2, "0");
    const y = mdy[3];
    const mi = Number(month);
    const di = Number(day);
    if (mi < 1 || mi > 12 || di < 1 || di > 31) return "";
    return `${y}-${month}-${day}`;
  }
  const ms = Date.parse(t);
  if (!Number.isFinite(ms)) return "";
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display funding dates in US format `mm/dd/yyyy` (ISO stored values convert). */
export function formatFundingRoundDateUs(
  raw: string | null | undefined,
): string {
  if (!raw?.trim()) return "";
  const t = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  // Draft or complete mm/dd/yyyy from the text field — keep as typed.
  return t;
}

/**
 * Force US date entry while typing (`mm/dd/yyyy`).
 * Digits only; slashes auto-inserted. Returns null to reject junk.
 */
export function sanitizeFundingRoundDateUsInput(raw: string): string | null {
  if (raw === "") return "";
  if (/[^\d/]/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += "/";
    out += digits[i];
  }
  return out;
}
