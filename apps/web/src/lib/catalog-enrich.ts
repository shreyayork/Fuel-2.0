import "server-only";
import * as Sentry from "@sentry/nextjs";
import { brightDataScrape } from "./enrichment/brightdata";
import { fetchLinkedInCompany } from "./enrichment/linkedin-profile";
import { cachedFetch } from "./enrichment/cache";
import {
  crunchbaseSlugFromDomain,
  normalizeCrunchbaseCompanyUrl,
  normalizeLinkedInCompanyUrl,
} from "./enrichment/urls";
import { scrapeWebsiteMarkdown } from "./enrichment/scrape-web";
import { detectTechStack } from "./enrichment/tech-stack-client";
import { mapCrunchbaseFundingFields } from "./enrichment/crunchbase-fields";
import {
  classifyProviderFailure,
  scrubProviderError,
  type EnrichmentRequestTiming,
  type EnrichmentRunTiming,
} from "./enrichment/enrichment-timing";
import {
  fetchFuelDataEnrichmentSlice,
  mergeFuelHitIntoPayload,
} from "./onboard/fuel-data-enrichment";
import {
  getCatalogCompany,
  updateCatalogCompany,
  upsertCatalogByDomain,
} from "./catalog";
import { normalizeDomain } from "./fuel-data";
import {
  captureIntegrationException,
  captureIntegrationMessage,
} from "./sentry/capture";
import type { CatalogCompany } from "@/db/schema";

export type EnrichmentPhaseName =
  | "fuel_data_ready"
  | "website_ready"
  | "fast_complete"
  | "crunchbase_ready"
  | "bright_data_ready"
  | "complete";

export type EnrichmentPhaseUpdate = {
  phase: EnrichmentPhaseName;
  payload: EnrichmentPayload;
};

export type EnrichmentMonitoringContext = {
  runId: string;
  userId: string;
  companyId: string | null;
  targetSource: string;
};

function providerFromSource(source: string): string {
  if (source.startsWith("brightdata:crunchbase")) return "crunchbase";
  if (source.startsWith("brightdata:linkedin")) return "linkedin";
  if (source.startsWith("webscrape:")) return "website";
  if (source.startsWith("techstack:")) return "tech_stack";
  return source.split(":")[0] ?? "unknown";
}
export interface EnrichmentPayload {
  /** Normalized canonical domain (lowercased, suffix stripped). */
  domain: string;
  /** `https://<domain>` — the homepage we hit. */
  websiteUrl: string;
  /** Best-guess company name from the homepage `<title>`. */
  name: string | null;
  shortDescription: string | null;
  longDescription: string | null;
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
  fundingRounds: Array<{
    roundType: string;
    amountUsd: number | null;
    announcedOn: string | null;
    investors: string[];
  }> | null;
  crunchbaseUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  /** Per-source raw payloads — caller can persist these on `catalog_companies.sources`. */
  sources: Record<string, unknown>;
  /** Best-effort indication of which providers returned data. */
  providers: {
    website: boolean;
    techStack: boolean;
    crunchbase: boolean;
    linkedin: boolean;
    fuelData: boolean;
  };
  /** Precise timings for the pipeline run (UI dumps / diagnostics). */
  timing: EnrichmentRunTiming;
}
/**
 * Derive a best-guess Crunchbase organization slug from a domain.
 *
 * Prefers an explicit crunchbase.com URL in website markdown, then the shared
 * slug helper (domain overrides like york.ie → york-ie), then a TLD strip.
 */
function deriveCrunchbaseSlug(
  domain: string,
  websiteMarkdown?: string | null,
): string {
  // Prefer an explicit link in the scraped markdown.
  if (websiteMarkdown) {
    const match = /crunchbase\.com\/organization\/([a-zA-Z0-9_-]+)/i.exec(
      websiteMarkdown,
    );
    if (match?.[1]) return match[1].toLowerCase();
  }
  return crunchbaseSlugFromDomain(domain);
}
/**
 * Pure read-only enrichment pipeline. Runs Fuel org data (OpenSearch +
 * Neptune funding) in parallel with website scrape + tech-stack, then
 * Crunchbase (Bright Data) + LinkedIn. Merges into a normalized payload.
 * **No DB writes.**
 *
 * When `crunchbaseSlug` is not provided the pipeline auto-derives a slug
 * from the domain and attempts the scrape anyway — so the onboarding flow
 * gets founded / location / funding data without the caller needing a slug.
 * Failed Crunchbase scrapes are swallowed (cbResult = null) so a 404 on a
 * derived slug never blocks the rest of the enrichment.
 *
 * Two callers:
 *   - `enrichCompanyFromDomain` below, which then persists into
 *     `catalog_companies` for the existing "Add to Fuel" pipeline.
 *   - The founder-onboarding stream, which yields progress events while
 *     this runs and only persists *after* the user confirms.
 *
 * Throws if the domain doesn't normalize. Provider failures are swallowed
 * per-source so a single bad scrape doesn't blank the whole result.
 */
export async function runEnrichmentPipeline(opts: {
  domain: string;
  crunchbaseSlug?: string | null;
  monitoring?: EnrichmentMonitoringContext;
  /** `fast` stops after Fuel data, website, and tech stack. */
  mode?: "fast" | "full";
  /** Optional progressive hooks — used by onboard NDJSON stream. */
  onPhase?: (update: EnrichmentPhaseUpdate) => void | Promise<void>;
}): Promise<EnrichmentPayload> {
  const cleanDomain = normalizeDomain(opts.domain);
  if (!cleanDomain) {
    throw new Error("runEnrichmentPipeline: invalid domain");
  }
  const websiteUrl = `https://${cleanDomain}`;
  const overallStart = new Date();
  const requests: EnrichmentRequestTiming[] = [];
  const unavailable: string[] = [];
  const monitoredProviderCall = <T>(
    provider: string,
    call: () => Promise<T>,
  ): Promise<T> =>
    opts.monitoring
      ? Sentry.startSpan(
          {
            name: `enrichment.${provider}`,
            op: "external.provider",
            attributes: {
              "enrichment.run_id": opts.monitoring.runId,
              "enrichment.provider": provider,
              "enrichment.domain": cleanDomain,
            },
          },
          call,
        )
      : call();

  async function timedCached<T>(args: {
    source: string;
    url: string;
    subjectKey: string;
    ttlSeconds: number;
    costTokens: number;
    fetcher: () => Promise<T>;
  }) {
    const startedAt = new Date();
    const provider = providerFromSource(args.source);
    try {
      const fetchProvider = () =>
        cachedFetch({
          source: args.source,
          subjectKey: args.subjectKey,
          ttlSeconds: args.ttlSeconds,
          costTokens: args.costTokens,
          captureFailure: !opts.monitoring,
          fetcher: args.fetcher,
        });
      const result = await monitoredProviderCall(provider, fetchProvider);
      const completedAt = new Date();
      const dataError =
        result.data &&
        typeof result.data === "object" &&
        "error" in result.data &&
        typeof result.data.error === "string"
          ? result.data.error
          : null;
      const ok = Boolean(result.data) && !result.error && !dataError;
      const error = result.error
        ? scrubProviderError(result.error)
        : dataError
          ? scrubProviderError(dataError)
        : ok
          ? null
          : "empty response";
      const durationMs = completedAt.getTime() - startedAt.getTime();
      requests.push({
        source: args.source,
        url: args.url,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        ok,
        cached: result.cached,
        error,
      });
      if (!ok) {
        unavailable.push(
          `${args.source}${error ? ` (error: ${error})` : ""}`,
        );
        if (opts.monitoring) captureIntegrationMessage(`${provider} enrichment failed`, {
          integration: provider,
          operation: "onboard_provider_enrichment",
          level: "warning",
          userId: opts.monitoring?.userId,
          tags: { provider },
          context: {
            runId: opts.monitoring?.runId,
            domain: cleanDomain,
            companyId: opts.monitoring?.companyId,
            targetSource: opts.monitoring?.targetSource,
            source: args.source,
            status: classifyProviderFailure(error),
            durationMs,
            cached: result.cached,
            error,
          },
        });
      }
      return result;
    } catch (err) {
      const completedAt = new Date();
      const error = scrubProviderError(
        err instanceof Error ? err.message : String(err),
      );
      const durationMs = completedAt.getTime() - startedAt.getTime();
      requests.push({
        source: args.source,
        url: args.url,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        ok: false,
        cached: false,
        error,
      });
      unavailable.push(`${args.source} (error: ${error})`);
      if (opts.monitoring) captureIntegrationException(err, {
        integration: provider,
        operation: "onboard_provider_enrichment",
        level: "warning",
        userId: opts.monitoring?.userId,
        tags: { provider },
        context: {
          runId: opts.monitoring?.runId,
          domain: cleanDomain,
          companyId: opts.monitoring?.companyId,
          targetSource: opts.monitoring?.targetSource,
          source: args.source,
          status: classifyProviderFailure(error),
          durationMs,
          cached: false,
          error,
        },
      });
      return null;
    }
  }

  // Fuel-data (OpenSearch + Neptune) in parallel with website + tech-stack.
  // Emit fuel_data_ready as soon as Fuel returns so unlock can happen before
  // website/CB finish when ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE is on.
  const fuelPromise = monitoredProviderCall("fuel_data", () =>
    fetchFuelDataEnrichmentSlice(cleanDomain, opts.monitoring),
  );
  const webTechPromise = Promise.all([
    timedCached({
      source: "webscrape:markdown",
      url: websiteUrl,
      subjectKey: websiteUrl,
      ttlSeconds: 7 * 24 * 3600,
      costTokens: 2_000,
      fetcher: () =>
        scrapeWebsiteMarkdown({
          url: websiteUrl,
          maxChars: 12_000,
          timeoutSeconds: 10,
        }),
    }),
    timedCached({
      source: "techstack:wappalyzer",
      url: websiteUrl,
      subjectKey: websiteUrl,
      ttlSeconds: 30 * 24 * 3600,
      costTokens: 2_000,
      fetcher: () => detectTechStack({ url: websiteUrl, timeoutSeconds: 10 }),
    }),
  ]);

  const snapshotTiming = (): EnrichmentRunTiming => ({
    startedAt: overallStart.toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - overallStart.getTime(),
    requests: [...requests],
    unavailable: [...unavailable],
  });

  const sources: Record<string, unknown> = {};
  const payload: EnrichmentPayload = {
    domain: cleanDomain,
    websiteUrl,
    name: null,
    shortDescription: null,
    longDescription: null,
    industry: null,
    locationCity: null,
    locationState: null,
    locationCountry: null,
    foundedOn: null,
    employeeCount: null,
    totalFundingUsd: null,
    numFundingRounds: null,
    lastFundingType: null,
    lastFundingAt: null,
    fundingRounds: null,
    crunchbaseUrl: null,
    linkedinUrl: null,
    twitterUrl: null,
    sources,
    providers: {
      website: false,
      techStack: false,
      crunchbase: false,
      linkedin: false,
      fuelData: false,
    },
    timing: snapshotTiming(),
  };

  const fuelSlice = await fuelPromise;
  const fuelStarted = overallStart;
  const fuelCompleted = new Date();
  requests.push({
    source: "fuel-data:organization",
    url: cleanDomain,
    startedAt: fuelStarted.toISOString(),
    completedAt: fuelCompleted.toISOString(),
    durationMs: fuelSlice.durationMs,
    ok: Boolean(fuelSlice.hit) && !fuelSlice.error,
    cached: false,
    error: fuelSlice.error,
  });
  if (fuelSlice.hit) {
    sources.fuelData = {
      uuid: fuelSlice.hit.uuid,
      name: fuelSlice.hit.name,
      domain: fuelSlice.hit.domain,
      fundingRoundCount: fuelSlice.fundingRounds.length,
    };
    // Prefer OpenSearch logo before LinkedIn scrape fills sources.logoUrl.
    const fuelLogo = fuelSlice.hit.logoUrl?.trim();
    if (fuelLogo) {
      sources.logoUrl = fuelLogo;
    }
    payload.providers.fuelData = true;
    mergeFuelHitIntoPayload(payload, fuelSlice.hit, fuelSlice.fundingRounds);
  } else if (fuelSlice.error) {
    unavailable.push(`fuel-data:organization (error: ${fuelSlice.error})`);
  }
  payload.timing = snapshotTiming();
  await opts.onPhase?.({
    phase: "fuel_data_ready",
    payload: {
      ...payload,
      sources: { ...sources },
      providers: { ...payload.providers },
      timing: snapshotTiming(),
    },
  });

  const [webResult, techResult] = await webTechPromise;
  // Determine the Crunchbase slug: explicit > extracted from markdown > domain-derived.
  const websiteMarkdown =
    (webResult?.data as { markdown?: string } | null)?.markdown ?? null;
  const webSocial = (
    webResult?.data as {
      socialLinks?: {
        linkedinUrl?: string | null;
        twitterUrl?: string | null;
        crunchbaseUrl?: string | null;
      };
    } | null
  )?.socialLinks;
  const cbSlug =
    opts.crunchbaseSlug ?? deriveCrunchbaseSlug(cleanDomain, websiteMarkdown);
  const cbUrl = normalizeCrunchbaseCompanyUrl(cbSlug);

  // Prefer LinkedIn from homepage social links so LI can run in parallel with CB.
  let earlyLinkedInUrl: string | null = null;
  if (webSocial?.linkedinUrl) {
    try {
      earlyLinkedInUrl = normalizeLinkedInCompanyUrl(webSocial.linkedinUrl);
    } catch {
      earlyLinkedInUrl = null;
    }
  }
  if (earlyLinkedInUrl && !payload.linkedinUrl) {
    payload.linkedinUrl = earlyLinkedInUrl;
  }
  if (webSocial?.twitterUrl && !payload.twitterUrl) {
    payload.twitterUrl = webSocial.twitterUrl;
  }

  if (webResult?.data) {
    const web = webResult.data as {
      title?: string | null;
      description?: string | null;
      markdown?: string | null;
      socialLinks?: {
        linkedinUrl?: string | null;
        twitterUrl?: string | null;
      };
    };
    sources.website = web;
    payload.providers.website = true;
    if (!payload.shortDescription) {
      payload.shortDescription = web.description ?? null;
    }
    payload.longDescription = web.markdown
      ? web.markdown.slice(0, 8_000)
      : null;
    if (!payload.name && web.title) payload.name = web.title.slice(0, 200);
  }
  if (techResult?.data) {
    sources.techStack = techResult.data;
    payload.providers.techStack = true;
  }
  payload.timing = snapshotTiming();
  await opts.onPhase?.({
    phase: "website_ready",
    payload: {
      ...payload,
      sources: { ...sources },
      providers: { ...payload.providers },
      timing: snapshotTiming(),
    },
  });

  if (opts.mode === "fast") {
    const completedAt = new Date();
    payload.timing = {
      startedAt: overallStart.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - overallStart.getTime(),
      requests,
      unavailable,
    };
    await opts.onPhase?.({ phase: "fast_complete", payload });
    return payload;
  }

  // Crunchbase + LinkedIn in parallel when homepage already exposed a
  // company LinkedIn URL (common). Otherwise LI waits for CB socials.
  const liParallelStarted = earlyLinkedInUrl ? new Date() : null;
  const linkedInPromise = earlyLinkedInUrl
    ? monitoredProviderCall("linkedin", () =>
        fetchLinkedInCompany(earlyLinkedInUrl, {
          captureFailure: !opts.monitoring,
        }),
      ).catch((err) => ({
        url: earlyLinkedInUrl!,
        cached: false,
        data: null as Record<string, unknown> | null,
        error: scrubProviderError(
          err instanceof Error ? err.message : String(err),
        ),
      }))
    : null;

  const cbResult = await timedCached({
    source: "brightdata:crunchbase_company",
    url: cbUrl,
    subjectKey: cbUrl,
    ttlSeconds: 30 * 24 * 3600,
    costTokens: 5_000,
    fetcher: () => brightDataScrape({ kind: "crunchbase_company", url: cbUrl }),
  });
  if (cbResult && (!cbResult.data || cbResult.error)) {
    console.error(
      `[enrichment] crunchbase fetch failed domain=${cleanDomain} slug=${cbSlug} url=${cbUrl}`,
      {
        cached: cbResult.cached,
        error: cbResult.error ?? "empty response",
      },
    );
  }
  if (cbResult?.data) {
    const cb = cbResult.data as Record<string, unknown>;
    sources.crunchbase = cb;
    payload.providers.crunchbase = true;
    const get = (k: string) => (cb[k] ?? null) as unknown;
    // Gap-fill only — Fuel data / website already preferred when present.
    let rawInd = get("industries") ?? get("industry");
    if (!payload.industry) {
      if (Array.isArray(rawInd)) {
        payload.industry =
          rawInd
            .map((i: any) =>
              typeof i === "string" ? i : i?.value || i?.name || i?.id,
            )
            .filter(Boolean)
            .slice(0, 3)
            .join(", ") || null;
      } else if (rawInd && typeof rawInd === "object") {
        payload.industry =
          (rawInd as any).value ||
          (rawInd as any).name ||
          (typeof rawInd === "string" ? rawInd : null);
      } else {
        payload.industry = (rawInd as string | null) || null;
      }
    }
    if (!payload.locationCity) {
      payload.locationCity = (get("headquarters_city") ?? get("city")) as
        | string
        | null;
    }
    if (!payload.locationState) {
      payload.locationState = (get("headquarters_state") ?? get("state")) as
        | string
        | null;
    }
    if (!payload.locationCountry) {
      payload.locationCountry = (get("headquarters_country") ??
        get("country")) as string | null;
    }
    if (!payload.foundedOn) {
      payload.foundedOn = (get("founded_date") ?? get("founded_on")) as
        | string
        | null;
    }
    if (!payload.employeeCount) {
      payload.employeeCount = (get("num_employees") ??
        get("employee_count") ??
        get("employees")) as string | null;
    }
    const funding = mapCrunchbaseFundingFields(cb);
    if (payload.totalFundingUsd == null && funding.totalFundingUsd != null) {
      payload.totalFundingUsd = funding.totalFundingUsd;
    }
    const hasFuelRounds = (payload.fundingRounds?.length ?? 0) > 0;
    if (!hasFuelRounds) {
      payload.numFundingRounds = funding.numFundingRounds;
      payload.lastFundingType = funding.lastFundingType;
      payload.lastFundingAt = funding.lastFundingAt;
      payload.fundingRounds = funding.fundingRounds;
    }
    if (!payload.crunchbaseUrl) {
      payload.crunchbaseUrl = (get("url") ??
        normalizeCrunchbaseCompanyUrl(
          opts.crunchbaseSlug ?? cleanDomain,
        )) as string;
    }
    // Extract LinkedIn / Twitter (X) company profile URLs.
    // The CB dataset often puts them in social media arrays rather than top-level linkedin_url.
    // Note the data source sometimes uses the typo key "socila_media_urls" (see document/enrich.js for real example).
    const getSocialUrl = (platform: "linkedin" | "twitter") => {
      const direct =
        platform === "linkedin"
          ? (get("linkedin_url") ?? get("linkedin"))
          : (get("twitter_url") ?? get("twitter") ?? get("x_url"));
      if (typeof direct === "string" && direct) return direct;
      // Search the common social url array keys (handle the "socila" typo)
      const arrayKeys = [
        "social_media_links",
        "social_media_urls",
        "socila_media_urls",
        "socials",
        "social_media",
      ];
      for (const key of arrayKeys) {
        const arr = get(key);
        if (Array.isArray(arr)) {
          const match = arr.find(
            (u: any) =>
              typeof u === "string" &&
              u
                .toLowerCase()
                .includes(platform === "linkedin" ? "linkedin.com" : "x.com/"),
          );
          if (match) return match;
        }
      }
      return null;
    };
    payload.linkedinUrl =
      payload.linkedinUrl ??
      earlyLinkedInUrl ??
      ((getSocialUrl("linkedin") ??
        get("linkedin_url") ??
        get("linkedin")) as string | null);
    payload.twitterUrl =
      payload.twitterUrl ??
      ((getSocialUrl("twitter") ??
        get("twitter_url") ??
        get("twitter")) as string | null);
    // Fallback location parsing for shapes seen in real CB responses (document/enrich.js sample has
    // "address", "region", "country_code", "location": [{name, permalink}, ...] instead of headquarters_* keys).
    if (
      !payload.locationCity &&
      !payload.locationState &&
      !payload.locationCountry
    ) {
      const address = get("address") as string | null;
      if (address) {
        const parts = address
          .split(/[,·|]/)
          .map((p: string) => p.trim())
          .filter(Boolean);
        if (parts[0] && !payload.locationCity) payload.locationCity = parts[0];
        if (parts[1] && !payload.locationState)
          payload.locationState = parts[1];
        if (parts[2] && !payload.locationCountry)
          payload.locationCountry = parts[2];
      }
      const locArr = get("location") as any[] | null;
      if (Array.isArray(locArr) && locArr.length) {
        const names = locArr
          .map((l: any) => l?.name)
          .filter(Boolean) as string[];
        if (names[0] && !payload.locationCity) payload.locationCity = names[0];
        if (names[1] && !payload.locationState)
          payload.locationState = names[1];
        if (names[2] && !payload.locationCountry)
          payload.locationCountry = names[2];
      }
      const region = get("region") as string | null;
      if (region && !payload.locationState) payload.locationState = region;
      const cc = (get("country_code") ?? get("country")) as string | null;
      if (cc && !payload.locationCountry) payload.locationCountry = cc;
    }
  }

  // Unlock consumers once Crunchbase (funding / core profile) is mapped.
  // LinkedIn continues below and is often much shorter than CB for heavy orgs.
  payload.timing = snapshotTiming();
  await opts.onPhase?.({
    phase: "crunchbase_ready",
    payload: {
      ...payload,
      sources: { ...sources },
      providers: { ...payload.providers },
      timing: snapshotTiming(),
    },
  });

  // Step 3: LinkedIn company page scrape.
  // Prefer homepage social LinkedIn so this can overlap Crunchbase. Falls back
  // to CB-derived URL when the site had no company LinkedIn link.
  // Only fires when a /company/ URL is available — never guesses.
  const liUrl = payload.linkedinUrl;
  let liResult: Awaited<ReturnType<typeof fetchLinkedInCompany>> | null = null;
  const liStarted = liParallelStarted ?? new Date();
  if (liUrl) {
    if (linkedInPromise) {
      liResult = await linkedInPromise;
    } else {
      liResult = await monitoredProviderCall("linkedin", () =>
        fetchLinkedInCompany(liUrl, {
          captureFailure: !opts.monitoring,
        }),
      ).catch((err) => ({
        url: liUrl,
        cached: false,
        data: null,
        error: scrubProviderError(
          err instanceof Error ? err.message : String(err),
        ),
      }));
    }
    const completedAt = new Date();
    const ok = Boolean(liResult.data) && !liResult.error;
    const error = liResult.error
      ? scrubProviderError(liResult.error)
      : ok
        ? null
        : "empty response";
    // Avoid duplicate timing rows if a parallel throw path already pushed one.
    if (!requests.some((r) => r.source === "brightdata:linkedin_company")) {
      requests.push({
        source: "brightdata:linkedin_company",
        url: liResult.url,
        startedAt: liStarted.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - liStarted.getTime(),
        ok,
        cached: liResult.cached,
        error,
      });
      if (!ok) {
        unavailable.push(
          `brightdata:linkedin_company${error ? ` (error: ${error})` : ""}`,
        );
        if (opts.monitoring) captureIntegrationMessage("linkedin enrichment failed", {
          integration: "linkedin",
          operation: "onboard_provider_enrichment",
          level: "warning",
          userId: opts.monitoring?.userId,
          tags: { provider: "linkedin" },
          context: {
            runId: opts.monitoring?.runId,
            domain: cleanDomain,
            companyId: opts.monitoring?.companyId,
            targetSource: opts.monitoring?.targetSource,
            source: "brightdata:linkedin_company",
            status: classifyProviderFailure(error),
            durationMs: completedAt.getTime() - liStarted.getTime(),
            cached: liResult.cached,
            error,
          },
        });
      }
    }
    if (liResult.data) {
      const li = liResult.data as Record<string, unknown>;
      sources.linkedin = li;
      payload.providers.linkedin = true;
      const liGet = (k: string) => (li[k] ?? null) as unknown;
      // Name — only fill if website/CB didn't find one
      if (!payload.name) {
        const liName = liGet("name") ?? liGet("company_name");
        if (typeof liName === "string" && liName) payload.name = liName;
      }
      // Short description — LinkedIn "tagline" or "headline"
      if (!payload.shortDescription) {
        const tagline =
          liGet("tagline") ?? liGet("headline") ?? liGet("slogan");
        if (typeof tagline === "string" && tagline)
          payload.shortDescription = tagline;
      }
      // Long description — LinkedIn "description" / "about" / "overview"
      if (!payload.longDescription) {
        const about =
          liGet("description") ??
          liGet("about") ??
          liGet("overview") ??
          liGet("about_us");
        if (typeof about === "string" && about)
          payload.longDescription = about.slice(0, 8_000);
      }
      // Industry — LinkedIn often has cleaner industry labels than CB
      if (!payload.industry) {
        const liInd = liGet("industry") ?? liGet("industries");
        if (typeof liInd === "string" && liInd) payload.industry = liInd;
      }
      // Employee count — LinkedIn company_size is a range string like "51-200 employees"
      if (!payload.employeeCount) {
        const size =
          liGet("company_size") ??
          liGet("staff_count_range") ??
          liGet("employees") ??
          liGet("headcount") ??
          liGet("num_employees");
        if (size != null) payload.employeeCount = String(size);
      }
      // Founded year
      if (!payload.foundedOn) {
        const founded =
          liGet("founded_on") ?? liGet("founded") ?? liGet("founded_year");
        if (founded != null) payload.foundedOn = String(founded);
      }
      // Headquarters — LinkedIn often returns city/state/country separately
      if (!payload.locationCity) {
        const city = liGet("hq_city") ?? liGet("city");
        if (typeof city === "string" && city) payload.locationCity = city;
      }
      if (!payload.locationState) {
        const state = liGet("hq_state") ?? liGet("hq_region") ?? liGet("state");
        if (typeof state === "string" && state) payload.locationState = state;
      }
      if (!payload.locationCountry) {
        const country = liGet("hq_country") ?? liGet("country");
        if (typeof country === "string" && country)
          payload.locationCountry = country;
      }
      // Fallback: parse the "headquarters" string "City, State, Country"
      if (
        !payload.locationCity &&
        !payload.locationState &&
        !payload.locationCountry
      ) {
        const hq = liGet("headquarters") ?? liGet("hq");
        if (typeof hq === "string" && hq) {
          const parts = hq
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          if (parts[0]) payload.locationCity = parts[0];
          if (parts[1]) payload.locationState = parts[1];
          if (parts[2]) payload.locationCountry = parts[2];
        }
      }
      // Logo — take from LinkedIn if CB didn't provide one
      const liLogo = liGet("logo") ?? liGet("logo_url") ?? liGet("image");
      if (typeof liLogo === "string" && liLogo && !sources.logoUrl) {
        sources.logoUrl = liLogo;
      }
    }
  } else {
    unavailable.push(
      "brightdata:linkedin_company (no LinkedIn company URL from website/Crunchbase)",
    );
  }

  payload.timing = snapshotTiming();
  await opts.onPhase?.({
    phase: "bright_data_ready",
    payload: {
      ...payload,
      sources: { ...sources },
      providers: { ...payload.providers },
      timing: snapshotTiming(),
    },
  });

  const overallEnd = new Date();
  payload.timing = {
    startedAt: overallStart.toISOString(),
    completedAt: overallEnd.toISOString(),
    durationMs: overallEnd.getTime() - overallStart.getTime(),
    requests,
    unavailable,
  };
  await opts.onPhase?.({ phase: "complete", payload });
  return payload;
}
/**
 * Enrich a domain → create / update the account's `catalog_companies` row.
 * Thin wrapper around `runEnrichmentPipeline` that handles persistence so
 * the existing "Add to Fuel" / catalog flow keeps the same shape.
 *
 * The founder-onboarding path bypasses this and writes via
 * `provisionCompanyAccount` after the user confirms the scraped profile.
 */
export async function enrichCompanyFromDomain(opts: {
  accountId: string;
  domain: string;
  name?: string | null;
  crunchbaseSlug?: string | null;
  authorEmail: string;
}): Promise<CatalogCompany> {
  const payload = await runEnrichmentPipeline({
    domain: opts.domain,
    crunchbaseSlug: opts.crunchbaseSlug,
  });
  // Ensure there's a row to attach enrichment to.
  const { row: initial } = await upsertCatalogByDomain({
    accountId: opts.accountId,
    domain: payload.domain,
    name: opts.name?.trim() || payload.domain,
    createdByEmail: opts.authorEmail,
  });
  return (await patchCatalogCompanyFromEnrichment(initial, payload)) ?? initial;
}

export function buildMissingCatalogEnrichmentPatch(
  initial: CatalogCompany,
  payload: EnrichmentPayload,
): Partial<CatalogCompany> {
  // Merge payload into the existing row — preserve existing values where the
  // scrape returned nothing, so re-runs don't overwrite hand edits with null.
  const mergedSources: Record<string, unknown> = {
    ...((initial.sources as Record<string, unknown>) ?? {}),
    ...payload.sources,
  };
  const patch: Partial<CatalogCompany> = { sources: mergedSources };
  if (!initial.shortDescription && payload.shortDescription)
    patch.shortDescription = payload.shortDescription;
  if (!initial.longDescription && payload.longDescription)
    patch.longDescription = payload.longDescription;
  if ((!initial.name || initial.name === payload.domain) && payload.name)
    patch.name = payload.name;
  if (!initial.industry && payload.industry) patch.industry = payload.industry;
  if (!initial.locationCity && payload.locationCity)
    patch.locationCity = payload.locationCity;
  if (!initial.locationState && payload.locationState)
    patch.locationState = payload.locationState;
  if (!initial.locationCountry && payload.locationCountry)
    patch.locationCountry = payload.locationCountry;
  if (!initial.foundedOn && payload.foundedOn)
    patch.foundedOn = payload.foundedOn;
  if (!initial.employeeCount && payload.employeeCount)
    patch.employeeCount = payload.employeeCount;
  if (!initial.totalFundingUsd && payload.totalFundingUsd != null)
    patch.totalFundingUsd = payload.totalFundingUsd;
  if (!initial.numFundingRounds && payload.numFundingRounds != null)
    patch.numFundingRounds = payload.numFundingRounds;
  if (!initial.crunchbaseUrl && payload.crunchbaseUrl)
    patch.crunchbaseUrl = payload.crunchbaseUrl;
  if (!initial.linkedinUrl && payload.linkedinUrl)
    patch.linkedinUrl = payload.linkedinUrl;
  if (!initial.twitterUrl && payload.twitterUrl)
    patch.twitterUrl = payload.twitterUrl;
  if (!initial.website) patch.website = payload.websiteUrl;
  return patch;
}

export async function patchCatalogCompanyFromEnrichment(
  company: CatalogCompany | string,
  payload: EnrichmentPayload,
): Promise<CatalogCompany | null> {
  const initial =
    typeof company === "string" ? await getCatalogCompany(company) : company;
  if (!initial) return null;
  return updateCatalogCompany({
    id: initial.id,
    patch: buildMissingCatalogEnrichmentPatch(initial, payload),
  });
}
