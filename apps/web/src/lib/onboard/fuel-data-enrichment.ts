import "server-only";
import {
  getCompanyByDomain,
  getCompanyFunding,
  type CompanyHit,
} from "@/lib/fuel-data";
import { scrubProviderError } from "@/lib/enrichment/enrichment-timing";
import {
  mapNeptuneFundingRounds,
  type FuelFundingRound,
} from "@/lib/onboard/funding-rounds";
import { captureIntegrationException } from "@/lib/sentry/capture";

const FUEL_ORG_TIMEOUT_MS = 5_000;
const FUEL_FUNDING_TIMEOUT_MS = 3_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export type { FuelFundingRound };
export {
  mapNeptuneFundingRounds,
  mergeFuelHitIntoPayload,
  neptuneRoundsToPickerFunding,
} from "@/lib/onboard/funding-rounds";

export type FuelDataEnrichmentSlice = {
  hit: CompanyHit | null;
  fundingRounds: FuelFundingRound[];
  durationMs: number;
  error: string | null;
};

export type FuelDataMonitoringContext = {
  runId: string;
  userId: string;
  companyId: string | null;
  targetSource: string;
};

/**
 * OpenSearch org + Neptune funding for a domain.
 * Neptune failure → empty funding, never throws for funding.
 * OpenSearch failure → hit null + error string.
 */
export async function fetchFuelDataEnrichmentSlice(
  domain: string,
  monitoring?: FuelDataMonitoringContext,
): Promise<FuelDataEnrichmentSlice> {
  const started = Date.now();
  let hit: CompanyHit | null = null;
  let error: string | null = null;

  try {
    hit = await withTimeout(
      getCompanyByDomain(domain),
      FUEL_ORG_TIMEOUT_MS,
      "fuel-data organization lookup",
    );
  } catch (e) {
    captureIntegrationException(e, {
      integration: "fuel_data",
      operation: "fuel_data_enrichment_org",
      level: "warning",
      userId: monitoring?.userId,
      tags: { provider: "fuel_data" },
      context: {
        runId: monitoring?.runId,
        domain,
        companyId: monitoring?.companyId,
        targetSource: monitoring?.targetSource,
        durationMs: Date.now() - started,
      },
    });
    error = scrubProviderError(
      e instanceof Error ? e.message : String(e),
    );
    return {
      hit: null,
      fundingRounds: [],
      durationMs: Date.now() - started,
      error,
    };
  }

  if (!hit?.uuid) {
    return {
      hit: null,
      fundingRounds: [],
      durationMs: Date.now() - started,
      error: null,
    };
  }

  let fundingRounds: FuelFundingRound[] = [];
  try {
    const rounds = await withTimeout(
      getCompanyFunding(hit.uuid, 50),
      FUEL_FUNDING_TIMEOUT_MS,
      "fuel-data funding lookup",
    );
    fundingRounds = mapNeptuneFundingRounds(rounds);
  } catch (e) {
    captureIntegrationException(e, {
      integration: "fuel_data",
      operation: "fuel_data_enrichment_funding",
      level: "warning",
      userId: monitoring?.userId,
      tags: { provider: "fuel_data" },
      context: {
        runId: monitoring?.runId,
        domain,
        companyId: monitoring?.companyId,
        targetSource: monitoring?.targetSource,
        durationMs: Date.now() - started,
      },
    });
    // Funding optional — do not fail the slice.
    error = scrubProviderError(
      e instanceof Error ? e.message : String(e),
    );
  }

  return {
    hit,
    fundingRounds,
    durationMs: Date.now() - started,
    error,
  };
}
