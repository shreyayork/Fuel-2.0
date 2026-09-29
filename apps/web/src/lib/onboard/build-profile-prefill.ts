import type { ExtractCompanyProfileResult } from "@/lib/agent/skills/extractCompanyProfile";
import type { CrunchbaseProfile } from "@/components/onboard/chat/types";
import {
  isBusinessModel,
  normalizeBusinessModel,
  type BusinessModel,
} from "@/lib/business-model";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import { formatBenchmarkUsd } from "@/lib/benchmarks-format";
import {
  extractCrunchbaseProfileFields,
  parseFoundedYear,
} from "@/lib/enrichment/crunchbase-fields";

export type ProfilePrefillFieldKey =
  | "name"
  | "description"
  | "industry"
  | "founded"
  | "locationCity"
  | "locationState"
  | "locationCountry"
  | "linkedinUrl"
  | "businessModel"
  | "stage"
  | "totalFunding";

export type FieldConfidence = "high" | "low";

export interface ProfileLocation {
  city: string;
  state: string;
  country: string;
}

export interface ProfilePrefillResult {
  crunchbaseProfile: CrunchbaseProfile;
  businessModel: BusinessModel | null;
  linkedinUrl: string;
  location: ProfileLocation;
  fieldSources: Partial<Record<ProfilePrefillFieldKey, string>>;
  fieldConfidence: Partial<Record<ProfilePrefillFieldKey, FieldConfidence>>;
}

function pick(
  a: string | null | undefined,
  b: string | null | undefined,
): string {
  return (a && a.trim()) || (b && b.trim()) || "";
}

function normStr(v: string | null | undefined): string {
  return v?.trim().toLowerCase() ?? "";
}

function valuesAgree(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const x = normStr(a);
  const y = normStr(b);
  return Boolean(x && y && (x === y || x.includes(y) || y.includes(x)));
}

function crunchbaseRecord(
  enrichment: EnrichmentPayload,
): Record<string, unknown> | undefined {
  return enrichment.sources.crunchbase as Record<string, unknown> | undefined;
}

function crunchbaseIndustry(
  cb: Record<string, unknown> | undefined,
): string | null {
  if (!cb) return null;
  if (typeof cb.industry === "string" && cb.industry.trim())
    return cb.industry.trim();
  const raw = cb.industries ?? cb.categories;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (!Array.isArray(raw)) return null;
  const names: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) names.push(item.trim());
    else if (typeof item === "object" && item && "name" in item) {
      const name = String((item as { name?: string }).name ?? "").trim();
      if (name) names.push(name);
    }
  }
  return names.length ? names.slice(0, 3).join(" · ") : null;
}

function parseStageFromCrunchbase(
  cb: Record<string, unknown> | undefined,
): string {
  if (!cb) return "";
  const candidates = [
    cb.last_funding_type,
    cb.lastFundingType,
    cb.funding_stage,
    cb.last_round_type,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function formatCategories(
  enrichment: EnrichmentPayload,
  extracted: ExtractCompanyProfileResult | null,
): string {
  const parts: string[] = [];
  const industry = pick(extracted?.industry, enrichment.industry);
  if (industry) parts.push(industry);
  const cb = crunchbaseRecord(enrichment);
  const industries = cb?.industries ?? cb?.categories;
  if (Array.isArray(industries)) {
    for (const item of industries) {
      const name =
        typeof item === "string"
          ? item
          : typeof item === "object" && item && "name" in item
            ? String((item as { name?: string }).name ?? "")
            : "";
      if (name.trim() && !parts.includes(name.trim())) parts.push(name.trim());
    }
  } else if (typeof industries === "string" && industries.trim()) {
    parts.push(industries.trim());
  }
  return parts.slice(0, 3).join(" · ");
}

function resolveField(
  opts: {
    extracted?: string | null;
    enrichment?: string | null;
    cb?: string | null;
    linkedin?: string | null;
  },
  conflicts: Record<string, unknown>,
  fieldKey: string,
): { value: string; confidence: FieldConfidence; sources: string[] } {
  const sources: string[] = [];
  const candidates: Array<{ value: string; source: string }> = [];

  const add = (value: string | null | undefined, source: string) => {
    if (value?.trim()) candidates.push({ value: value.trim(), source });
  };

  add(opts.extracted, "Homepage (AI)");
  add(opts.enrichment, "Enrichment");
  add(opts.cb, "Crunchbase");
  add(opts.linkedin, "LinkedIn");

  if (candidates.length === 0) {
    return { value: "", confidence: "low", sources: [] };
  }

  const primary = candidates[0];
  sources.push(primary.source);

  const agreeing = candidates.filter((c) =>
    valuesAgree(c.value, primary.value),
  );
  if (agreeing.length >= 2) {
    for (const a of agreeing) {
      if (!sources.includes(a.source)) sources.push(a.source);
    }
    return { value: primary.value, confidence: "high", sources };
  }

  const disagreeing = candidates.filter(
    (c) => !valuesAgree(c.value, primary.value),
  );
  if (disagreeing.length > 0) {
    conflicts[fieldKey] = {
      chosen: primary.value,
      chosenSource: primary.source,
      alternatives: disagreeing.map((d) => ({
        value: d.value,
        source: d.source,
      })),
    };
  }

  return { value: primary.value, confidence: "low", sources };
}

/** Structured facts (location, founded) — prefer Crunchbase over homepage AI when CB succeeded. */
function resolveFactualField(
  opts: {
    extracted?: string | null;
    enrichment?: string | null;
    cb?: string | null;
    linkedin?: string | null;
  },
  conflicts: Record<string, unknown>,
  fieldKey: string,
  preferCrunchbase: boolean,
): { value: string; confidence: FieldConfidence; sources: string[] } {
  if (preferCrunchbase && opts.cb?.trim()) {
    return {
      value: opts.cb.trim(),
      confidence: "high",
      sources: ["Crunchbase"],
    };
  }

  const sources: string[] = [];
  const candidates: Array<{ value: string; source: string }> = [];
  const add = (value: string | null | undefined, source: string) => {
    if (value?.trim()) candidates.push({ value: value.trim(), source });
  };

  if (preferCrunchbase) {
    add(opts.cb, "Crunchbase");
    add(opts.enrichment, "Enrichment");
    add(opts.linkedin, "LinkedIn");
    add(opts.extracted, "Homepage (AI)");
  } else {
    add(opts.extracted, "Homepage (AI)");
    add(opts.enrichment, "Enrichment");
    add(opts.cb, "Crunchbase");
    add(opts.linkedin, "LinkedIn");
  }

  if (candidates.length === 0) {
    return { value: "", confidence: "low", sources: [] };
  }

  const primary = candidates[0];
  sources.push(primary.source);

  const agreeing = candidates.filter((c) =>
    valuesAgree(c.value, primary.value),
  );
  if (agreeing.length >= 2) {
    for (const a of agreeing) {
      if (!sources.includes(a.source)) sources.push(a.source);
    }
    return { value: primary.value, confidence: "high", sources };
  }

  const disagreeing = candidates.filter(
    (c) => !valuesAgree(c.value, primary.value),
  );
  if (disagreeing.length > 0) {
    conflicts[fieldKey] = {
      chosen: primary.value,
      chosenSource: primary.source,
      alternatives: disagreeing.map((d) => ({
        value: d.value,
        source: d.source,
      })),
    };
  }

  return {
    value: primary.value,
    confidence: preferCrunchbase ? "high" : "low",
    sources,
  };
}

export function parseLocationString(location: string): ProfileLocation {
  if (!location?.trim()) return { city: "", state: "", country: "" };
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return {
      city: parts[0],
      state: parts[1],
      country: parts.slice(2).join(", "),
    };
  }
  if (parts.length === 2) {
    return { city: parts[0], state: parts[1], country: "" };
  }
  return { city: parts[0] ?? "", state: "", country: "" };
}

/** Apply enrichment only to fields the founder has not edited. */
export function mergeUntouchedProfileFields<T extends Record<string, unknown>>(
  current: T,
  incoming: T,
  touchedFields: ReadonlySet<keyof T>,
): T {
  const merged = { ...current };
  for (const key of Object.keys(incoming) as Array<keyof T>) {
    if (!touchedFields.has(key)) merged[key] = incoming[key];
  }
  return merged;
}

/**
 * Merge priority: extracted > enrichment > footer hints > Crunchbase > LinkedIn.
 * Location and founded prefer Crunchbase when the CB scrape succeeded.
 * No synthetic defaults — empty string / null when unknown.
 *
 * `companyName` is an authoritative hint (override map, fuel-data, or user-
 * typed) — omit it when the onboarding flow only has a weak heuristic guess
 * so scraped enrichment can supply the display name.
 */
export function buildProfilePrefill(opts: {
  enrichment: EnrichmentPayload;
  extracted: ExtractCompanyProfileResult | null;
  companyName?: string;
  teamSize?: string;
  domain?: string;
}): ProfilePrefillResult {
  const { enrichment, extracted, companyName, teamSize } = opts;
  const cb = crunchbaseRecord(enrichment);
  const cbFields = extractCrunchbaseProfileFields(cb);
  const preferCb = enrichment.providers.crunchbase === true;
  const li = enrichment.sources.linkedin as Record<string, unknown> | undefined;
  const mergeConflicts: Record<string, unknown> = {};

  const nameResolved = resolveField(
    {
      extracted: extracted?.name ?? null,
      enrichment: enrichment.name,
      cb: typeof cb?.name === "string" ? cb.name : null,
      linkedin:
        typeof li?.name === "string"
          ? li.name
          : typeof li?.company_name === "string"
            ? li.company_name
            : null,
    },
    mergeConflicts,
    "name",
  );

  const name =
    companyName?.trim() ||
    nameResolved.value ||
    opts.domain ||
    enrichment.domain;

  const descriptionResolved = resolveField(
    {
      extracted: extracted?.shortDescription ?? null,
      enrichment: enrichment.shortDescription,
      linkedin:
        typeof li?.description === "string"
          ? li.description
          : typeof li?.tagline === "string"
            ? li.tagline
            : null,
    },
    mergeConflicts,
    "description",
  );

  const industryResolved = resolveField(
    {
      extracted: extracted?.industry ?? null,
      enrichment: enrichment.industry,
      cb: crunchbaseIndustry(cb),
      linkedin: typeof li?.industry === "string" ? li.industry : null,
    },
    mergeConflicts,
    "industry",
  );

  const industryValue =
    industryResolved.value || formatCategories(enrichment, extracted);

  const foundedResolved = resolveFactualField(
    {
      extracted: parseFoundedYear(extracted?.foundedOn),
      enrichment: parseFoundedYear(enrichment.foundedOn),
      cb: cbFields.foundedOn,
    },
    mergeConflicts,
    "founded",
    preferCb,
  );

  const cityResolved = resolveFactualField(
    {
      extracted: extracted?.locationCity ?? null,
      enrichment: enrichment.locationCity,
      cb: cbFields.locationCity,
      linkedin:
        typeof li?.headquarters_city === "string" ? li.headquarters_city : null,
    },
    mergeConflicts,
    "locationCity",
    preferCb,
  );

  const stateResolved = resolveFactualField(
    {
      extracted: extracted?.locationState ?? null,
      enrichment: enrichment.locationState,
      cb: cbFields.locationState,
      linkedin:
        typeof li?.headquarters_state === "string"
          ? li.headquarters_state
          : null,
    },
    mergeConflicts,
    "locationState",
    preferCb,
  );

  const countryResolved = resolveFactualField(
    {
      extracted: extracted?.locationCountry ?? null,
      enrichment: enrichment.locationCountry,
      cb: cbFields.locationCountry,
      linkedin:
        typeof li?.headquarters_country === "string"
          ? li.headquarters_country
          : null,
    },
    mergeConflicts,
    "locationCountry",
    preferCb,
  );

  const linkedinResolved = resolveField(
    {
      extracted: extracted?.linkedinUrl ?? null,
      enrichment: enrichment.linkedinUrl,
      cb: cbFields.linkedinUrl,
      linkedin: typeof li?.url === "string" ? li.url : null,
    },
    mergeConflicts,
    "linkedinUrl",
  );

  const extractedModel = isBusinessModel(extracted?.businessModel)
    ? extracted.businessModel
    : normalizeBusinessModel(extracted?.businessModel);

  let businessModel: BusinessModel | null = extractedModel;
  let businessModelConfidence: FieldConfidence = "low";
  let businessModelSource = extracted?.sources?.businessModel ?? "";

  if (extractedModel && enrichment.providers.crunchbase) {
    businessModelConfidence = "high";
    businessModelSource = businessModelSource || "Homepage (AI) + Crunchbase";
  } else if (extractedModel && enrichment.providers.linkedin) {
    businessModelConfidence = "high";
    businessModelSource = businessModelSource || "Homepage (AI) + LinkedIn";
  } else if (!extractedModel) {
    businessModel = null;
  }

  if (Object.keys(mergeConflicts).length > 0) {
    enrichment.sources.mergeConflicts = mergeConflicts;
  }

  const fieldSources: Partial<Record<ProfilePrefillFieldKey, string>> = {};
  const fieldConfidence: Partial<
    Record<ProfilePrefillFieldKey, FieldConfidence>
  > = {};

  const setFieldMeta = (
    key: ProfilePrefillFieldKey,
    resolved: { sources: string[]; confidence: FieldConfidence },
    llmSource?: string,
  ) => {
    fieldConfidence[key] = resolved.confidence;
    if (resolved.sources.length) {
      fieldSources[key] = resolved.sources.join(" + ");
    } else if (llmSource) {
      fieldSources[key] = llmSource;
      fieldConfidence[key] = "low";
    }
  };

  setFieldMeta("name", nameResolved, extracted?.sources?.name);
  setFieldMeta(
    "description",
    descriptionResolved,
    extracted?.sources?.shortDescription,
  );
  setFieldMeta("industry", industryResolved, extracted?.sources?.industry);
  setFieldMeta("founded", foundedResolved, extracted?.sources?.foundedOn);
  setFieldMeta("locationCity", cityResolved, extracted?.sources?.locationCity);
  setFieldMeta(
    "locationState",
    stateResolved,
    extracted?.sources?.locationState,
  );
  setFieldMeta(
    "locationCountry",
    countryResolved,
    extracted?.sources?.locationCountry,
  );
  setFieldMeta(
    "linkedinUrl",
    linkedinResolved,
    extracted?.sources?.linkedinUrl,
  );

  if (businessModel) {
    fieldSources.businessModel = businessModelSource || "Homepage (AI)";
    fieldConfidence.businessModel = businessModelConfidence;
  }

  const stage = parseStageFromCrunchbase(cb);
  if (stage) {
    fieldSources.stage = "Crunchbase";
    fieldConfidence.stage = "high";
  }

  const totalFunding =
    enrichment.totalFundingUsd != null
      ? formatBenchmarkUsd(enrichment.totalFundingUsd)
      : "";
  if (totalFunding) {
    fieldSources.totalFunding = "Crunchbase";
    fieldConfidence.totalFunding = "high";
  }

  const location: ProfileLocation = {
    city: cityResolved.value,
    state: stateResolved.value,
    country: countryResolved.value,
  };

  const crunchbaseProfile: CrunchbaseProfile = {
    name,
    description: descriptionResolved.value,
    stage,
    employees: teamSize || "",
    founded: foundedResolved.value,
    location: [location.city, location.state, location.country]
      .filter(Boolean)
      .join(", "),
    totalFunding,
    category: industryValue,
    website: enrichment.websiteUrl || enrichment.domain,
  };

  return {
    crunchbaseProfile,
    businessModel,
    linkedinUrl: linkedinResolved.value,
    location,
    fieldSources,
    fieldConfidence,
  };
}
