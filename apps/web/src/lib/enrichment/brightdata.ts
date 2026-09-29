import "server-only";

/**
 * Bright Data Web Scraper API client.
 *
 * Uses the async `/datasets/v3/trigger` endpoint so we receive a `snapshot_id`
 * immediately, then poll `/progress` until ready. This avoids the sync
 * `/scrape` path which:
 *   1. Holds an HTTP connection open ~60s before auto-converting to async
 *   2. Burns most of our total timeout budget before polling even starts
 *   3. Can surface delayed `AbortError` when AbortController fires on a hung
 *      sync socket (observed wall-clock ~15m vs configured timeout)
 *
 * API key is loaded from AWS Secrets Manager at runtime (falls back to env
 * for local dev). Each dataset id is overridable via env.
 */

const TRIGGER_URL = "https://api.brightdata.com/datasets/v3/trigger";
const PROGRESS_URL = "https://api.brightdata.com/datasets/v3/progress";
const SNAPSHOT_URL = "https://api.brightdata.com/datasets/v3/snapshot";

export type BrightDataset =
  | "linkedin_company"
  | "linkedin_profile"
  | "linkedin_jobs"
  | "linkedin_posts"
  | "crunchbase_company"
  | "github_profile";

// Known Bright Data dataset IDs (as of publication). Every entry is
// overridable via `BRIGHTDATA_<UPPER>_DATASET_ID` env var.
const DEFAULT_DATASET_IDS: Record<BrightDataset, string> = {
  linkedin_company: "gd_l1vikfnt1wgvvqz95w",
  linkedin_profile: "gd_l1viktl72bvl7bjuj0",
  linkedin_jobs: "gd_lpfll7v5hcqtkxl6l",
  linkedin_posts: "gd_lyy3tktm25m4avu764",
  crunchbase_company: "gd_l1vijqt9jfj7olije",
  github_profile: "gd_lgodw1qxr6x2kyixud",
};

/**
 * Default overall budgets. Crunchbase heavy orgs measured ~9 min collection
 * (swiggy.com collection_duration ≈ 526s); 180s left jobs stuck in `running`.
 */
const DEFAULT_TIMEOUT_MS: Record<BrightDataset, number> = {
  linkedin_company: 180_000,
  linkedin_profile: 180_000,
  linkedin_jobs: 180_000,
  linkedin_posts: 180_000,
  crunchbase_company: 600_000,
  github_profile: 180_000,
};

/** Cap for the initial /trigger HTTP call (should return snapshot_id quickly). */
const TRIGGER_HTTP_TIMEOUT_MS = 30_000;

const POLL_INTERVAL_MS = 10_000;

export function datasetIdFor(kind: BrightDataset): string {
  const envKey = `BRIGHTDATA_${kind.toUpperCase()}_DATASET_ID`;
  return process.env[envKey] ?? DEFAULT_DATASET_IDS[kind];
}

export function defaultTimeoutMsFor(kind: BrightDataset): number {
  return DEFAULT_TIMEOUT_MS[kind];
}

let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  // Local dev escape hatch.
  if (process.env.BRIGHTDATA_API_KEY) {
    cachedApiKey = process.env.BRIGHTDATA_API_KEY;
    return cachedApiKey;
  }

  const arn = process.env.BRIGHTDATA_SECRET_ARN;
  if (!arn) throw new Error("Bright Data not configured (BRIGHTDATA_SECRET_ARN missing)");

  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  // Prefer IPv4 — some local networks time out on IPv6 to AWS endpoints.
  const { NodeHttpHandler } = await import("@smithy/node-http-handler");
  const https = await import("node:https");
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? arn.split(":")[3];
  const sm = new SecretsManagerClient({
    region,
    requestHandler: new NodeHttpHandler({
      httpsAgent: new https.Agent({ family: 4 }),
    }),
  });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error("Bright Data secret has no value");
  const parsed = JSON.parse(res.SecretString) as { apiKey?: string };
  if (!parsed.apiKey || parsed.apiKey === "PLACEHOLDER") {
    throw new Error("Bright Data API key not populated in Secrets Manager");
  }
  cachedApiKey = parsed.apiKey;
  return cachedApiKey;
}

export interface ScrapeOptions {
  kind: BrightDataset;
  url: string;
  /** Max ms for trigger + poll + download. Defaults are kind-specific. */
  timeoutMs?: number;
}

export interface ScrapeRecord {
  [key: string]: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll a Bright Data snapshot until it's ready, then download and return
 * the records array. Throws on failure or timeout.
 */
async function pollSnapshot(opts: {
  snapshotId: string;
  apiKey: string;
  kind: BrightDataset;
  remainingMs: number;
}): Promise<ScrapeRecord[]> {
  const { snapshotId, apiKey, kind } = opts;
  const deadline = Date.now() + opts.remainingMs;
  let lastStatus: string | null = null;
  let pollCount = 0;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    pollCount += 1;

    const progressRes = await fetch(`${PROGRESS_URL}/${snapshotId}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!progressRes.ok) {
      const text = await progressRes.text();
      throw new Error(
        `Bright Data ${kind} progress check failed: ${progressRes.status} ${text.slice(0, 300)}`,
      );
    }

    const progress = (await progressRes.json()) as { status: string; [k: string]: unknown };
    lastStatus = progress.status;

    if (progress.status === "ready") {
      const downloadRes = await fetch(
        `${SNAPSHOT_URL}/${snapshotId}?format=json`,
        { headers: { authorization: `Bearer ${apiKey}` } },
      );
      if (!downloadRes.ok) {
        const text = await downloadRes.text();
        throw new Error(
          `Bright Data ${kind} snapshot download failed: ${downloadRes.status} ${text.slice(0, 300)}`,
        );
      }
      const data = await downloadRes.json();
      return Array.isArray(data) ? data : [];
    }

    if (progress.status === "failed" || progress.status === "canceled") {
      throw new Error(
        `Bright Data ${kind} async scrape ${progress.status} (snapshot=${snapshotId})`,
      );
    }
  }

  throw new Error(
    `Bright Data ${kind} async scrape timed out after ${opts.remainingMs}ms (snapshot=${snapshotId}, lastStatus=${lastStatus}, polls=${pollCount})`,
  );
}

async function triggerSnapshot(opts: {
  apiKey: string;
  datasetId: string;
  kind: BrightDataset;
  targetUrl: string;
}): Promise<string> {
  const url = new URL(TRIGGER_URL);
  url.searchParams.set("dataset_id", opts.datasetId);
  url.searchParams.set("include_errors", "true");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRIGGER_HTTP_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${opts.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([{ url: opts.targetUrl }]),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `Bright Data ${opts.kind} trigger timed out after ${TRIGGER_HTTP_TIMEOUT_MS}ms`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Bright Data ${opts.kind} trigger failed: ${res.status} ${text.slice(0, 300)}`,
    );
  }

  const body = (await res.json()) as { snapshot_id?: unknown };
  if (typeof body.snapshot_id !== "string" || !body.snapshot_id) {
    const preview = JSON.stringify(body).slice(0, 300);
    throw new Error(
      `Bright Data ${opts.kind}: trigger returned no snapshot_id (body=${preview || "{}"})`,
    );
  }
  return body.snapshot_id;
}

/**
 * Scrape one URL via Bright Data async trigger + poll. Returns the first
 * record of the snapshot, or throws on HTTP/network/error-in-payload.
 */
export async function brightDataScrape(opts: ScrapeOptions): Promise<ScrapeRecord> {
  const apiKey = await getApiKey();
  const datasetId = datasetIdFor(opts.kind);
  const totalTimeoutMs = opts.timeoutMs ?? defaultTimeoutMsFor(opts.kind);
  const startedAt = Date.now();

  const snapshotId = await triggerSnapshot({
    apiKey,
    datasetId,
    kind: opts.kind,
    targetUrl: opts.url,
  });

  const elapsed = Date.now() - startedAt;
  const remainingMs = Math.max(totalTimeoutMs - elapsed, 30_000);

  const records = await pollSnapshot({
    snapshotId,
    apiKey,
    kind: opts.kind,
    remainingMs,
  });
  const record = records[0] as ScrapeRecord | undefined;
  if (!record) {
    throw new Error(
      `Bright Data ${opts.kind}: async snapshot resolved but returned no records (snapshot=${snapshotId})`,
    );
  }
  return validateRecord(record, opts.kind);
}

function validateRecord(record: ScrapeRecord, kind: BrightDataset): ScrapeRecord {
  const errorCode = (record.error_code ?? record.warning_code) as string | undefined;
  const errorMsg = (record.error ?? record.warning) as string | undefined;
  if (errorCode && errorMsg) {
    throw new Error(`Bright Data ${kind}: ${errorCode} ${errorMsg}`);
  }
  return record;
}
