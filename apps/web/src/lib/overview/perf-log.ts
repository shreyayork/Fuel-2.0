/**
 * Server-only timing + Bedrock request logs for Overview generation.
 *
 * Timing: OVERVIEW_PERF_LOG=1|true|on · 0|false|off · unset = on in non-production
 * Prompts: OVERVIEW_PROMPT_LOG=1|true|on · 0|false|off · unset = on in non-production
 */
import "server-only";

export type OverviewPerfLabels =
  | "Database Fetch"
  | "Bedrock Request"
  | "Bedrock Response Processing"
  | "Database Save"
  | "Total API Time";

export type OverviewPerfContext = {
  runId: string;
  companyUuid: string;
  accountId?: string;
  /** Optional route / entrypoint label for log lines. */
  source?: string;
};

export type OverviewPerfSession = {
  enabled: boolean;
  /** Update identifiers after enqueue when runId becomes known. */
  setRunId: (runId: string) => void;
  /** Time an async phase; no-ops when logging is disabled. */
  time: <T>(label: OverviewPerfLabels | string, fn: () => Promise<T>) => Promise<T>;
  /** Record a pre-measured duration (ms). */
  add: (label: OverviewPerfLabels | string, ms: number) => void;
  /** Emit the summary block. Safe to call more than once (subsequent calls no-op). */
  finish: (opts?: { status?: "ok" | "error"; error?: string }) => void;
};

export type OverviewBedrockRequestLog = {
  requestId?: string | null;
  companyUuid?: string | null;
  accountId?: string | null;
  userEmail?: string | null;
  modelId: string;
  /** Template before INPUT JSON hydration. */
  systemTemplate: string;
  /** Fixed user turn sent to Converse. */
  userPrompt: string;
  /** Fully resolved system text (template + INPUT + rules). */
  resolvedSystemPrompt: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
  toolName?: string;
};

const NOOP: OverviewPerfSession = {
  enabled: false,
  setRunId: () => undefined,
  time: async (_label, fn) => fn(),
  add: () => undefined,
  finish: () => undefined,
};

function readEnvFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  return process.env.NODE_ENV !== "production";
}

function readPerfFlag(): boolean {
  return readEnvFlag("OVERVIEW_PERF_LOG");
}

/** Prompt dumps: dedicated flag, else follow OVERVIEW_PERF_LOG, else non-prod default. */
function readPromptFlag(): boolean {
  const raw = process.env.OVERVIEW_PROMPT_LOG?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  // Mirror explicit PERF on/off when PROMPT is unset.
  const perfRaw = process.env.OVERVIEW_PERF_LOG?.trim().toLowerCase();
  if (perfRaw === "0" || perfRaw === "false" || perfRaw === "off" || perfRaw === "no") {
    return false;
  }
  if (perfRaw === "1" || perfRaw === "true" || perfRaw === "on" || perfRaw === "yes") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

/** Format ms for logs: `180ms` under 1s, else `4.21s`. */
export function formatOverviewDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_RE = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi;
const LONG_TOKEN_RE = /\b(?:sk|pk|tok|token|key|secret)[-_]?[A-Za-z0-9]{16,}\b/gi;

/** Mask emails / credential-like substrings before logging prompts. */
export function redactOverviewLogText(text: string): string {
  return text
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(BEARER_RE, "$1[redacted-token]")
    .replace(LONG_TOKEN_RE, "[redacted-secret]");
}

/**
 * Log the exact Bedrock Converse payload (server console only).
 * Gated by OVERVIEW_PROMPT_LOG.
 */
export function logOverviewBedrockRequest(payload: OverviewBedrockRequestLog): void {
  if (!readPromptFlag()) return;

  const params = payload.parameters;
  const lines = [
    "========== Bedrock Overview Request ==========",
    `Timestamp: ${new Date().toISOString()}`,
    `Request ID: ${payload.requestId?.trim() || "n/a"}`,
    `Company ID: ${payload.companyUuid?.trim() || "n/a"}`,
    `Account ID: ${payload.accountId?.trim() || "n/a"}`,
    `User ID: ${payload.userEmail ? redactOverviewLogText(payload.userEmail) : "n/a"}`,
    `Model: ${payload.modelId}`,
    "",
    "System prompt sent to Bedrock:",
    redactOverviewLogText(payload.resolvedSystemPrompt),
    "",
    "User Prompt:",
    redactOverviewLogText(payload.userPrompt),
    "",
    "Parameters:",
    `temperature: ${params.temperature}`,
    `maxTokens: ${params.maxTokens}`,
    `topP: ${params.topP ?? "default"}`,
  ];
  if (payload.toolName) {
    lines.push(`toolChoice: ${payload.toolName}`);
  }
  lines.push("==============================================");
  console.info(lines.join("\n"));
}

export type OverviewBedrockResponseLog = {
  requestId?: string | null;
  companyUuid?: string | null;
  accountId?: string | null;
  modelId: string;
  bedrockMs: number;
  stopReason?: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  } | null;
  /** Raw tool input / message content returned by Bedrock. */
  rawOutput: unknown;
  /** Parsed+normalized overview after Zod (null when validation failed). */
  parsedResult?: unknown;
  parseError?: string | null;
};

/**
 * Log the Bedrock Converse response (server console only).
 * Gated by OVERVIEW_PROMPT_LOG (same flag as request prompt dumps).
 */
export function logOverviewBedrockResponse(payload: OverviewBedrockResponseLog): void {
  if (!readPromptFlag()) return;

  let rawJson: string;
  try {
    rawJson = JSON.stringify(payload.rawOutput, null, 2);
  } catch {
    rawJson = String(payload.rawOutput);
  }

  let parsedJson: string | null = null;
  if (payload.parsedResult !== undefined) {
    try {
      parsedJson = JSON.stringify(payload.parsedResult, null, 2);
    } catch {
      parsedJson = String(payload.parsedResult);
    }
  }

  const lines = [
    "========== Bedrock Overview Response ==========",
    `Timestamp: ${new Date().toISOString()}`,
    `Request ID: ${payload.requestId?.trim() || "n/a"}`,
    `Company ID: ${payload.companyUuid?.trim() || "n/a"}`,
    `Account ID: ${payload.accountId?.trim() || "n/a"}`,
    `Model: ${payload.modelId}`,
    `Bedrock latency: ${formatOverviewDuration(payload.bedrockMs)}`,
    `Stop reason: ${payload.stopReason ?? "n/a"}`,
    `Tokens: in=${payload.usage?.inputTokens ?? "n/a"} out=${payload.usage?.outputTokens ?? "n/a"} total=${payload.usage?.totalTokens ?? "n/a"}`,
    "",
    "Raw output:",
    redactOverviewLogText(rawJson),
  ];
  if (parsedJson != null) {
    lines.push("", "Parsed result:", redactOverviewLogText(parsedJson));
  }
  if (payload.parseError) {
    lines.push("", `Parse error: ${payload.parseError}`);
  }
  lines.push("===============================================");
  console.info(lines.join("\n"));
}

export type OverviewPersistStats = {
  companyUuid: string;
  snapshotId: string;
  generatedCount: number;
  persistedCount: number;
  initiativeCount: number;
  taggedLinkCount: number;
};

/**
 * Log how many generated intelligence items were saved after tagging.
 * Gated by OVERVIEW_PERF_LOG. Counts only — no titles or PII.
 */
export function logOverviewPersistStats(stats: OverviewPersistStats): void {
  if (!readPerfFlag()) return;
  const droppedCount = Math.max(0, stats.generatedCount - stats.persistedCount);
  console.info(
    [
      "[overview persist]",
      `companyUuid=${stats.companyUuid}`,
      `snapshotId=${stats.snapshotId}`,
      `generated=${stats.generatedCount}`,
      `persisted=${stats.persistedCount}`,
      `droppedUntagged=${droppedCount}`,
      `initiatives=${stats.initiativeCount}`,
      `taggedLinks=${stats.taggedLinkCount}`,
    ].join(" "),
  );
}

/**
 * Start a generation timing session. Near-zero cost when disabled
 * (returns a shared no-op object — no Date/Map allocation).
 */
export function beginOverviewPerfLog(ctx: OverviewPerfContext): OverviewPerfSession {
  if (!readPerfFlag()) return NOOP;

  const requestStarted = new Date();
  const wallStart = performance.now();
  const durations = new Map<string, number>();
  let runId = ctx.runId;
  let finished = false;

  const add = (label: string, ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return;
    durations.set(label, (durations.get(label) ?? 0) + ms);
  };

  return {
    enabled: true,
    setRunId(next) {
      runId = next;
    },
    async time(label, fn) {
      const t0 = performance.now();
      try {
        return await fn();
      } finally {
        add(label, performance.now() - t0);
      }
    },
    add,
    finish(opts) {
      if (finished) return;
      finished = true;

      if (!durations.has("Total API Time")) {
        add("Total API Time", performance.now() - wallStart);
      }

      const order: string[] = [
        "Database Fetch",
        "Bedrock Request",
        "Bedrock Response Processing",
        "Database Save",
        "Total API Time",
      ];

      const lines: string[] = [
        "========== Overview Generation ==========",
        `Request Started: ${requestStarted.toISOString()}`,
        `runId: ${runId}`,
        `companyUuid: ${ctx.companyUuid}`,
      ];
      if (ctx.accountId) lines.push(`accountId: ${ctx.accountId}`);
      if (ctx.source) lines.push(`source: ${ctx.source}`);
      if (opts?.status) lines.push(`status: ${opts.status}`);
      if (opts?.error) lines.push(`error: ${opts.error.slice(0, 200)}`);

      for (const label of order) {
        const ms = durations.get(label);
        if (ms != null) lines.push(`${label}: ${formatOverviewDuration(ms)}`);
      }

      for (const [label, ms] of durations) {
        if (!order.includes(label)) {
          lines.push(`${label}: ${formatOverviewDuration(ms)}`);
        }
      }

      lines.push("=========================================");
      console.info(lines.join("\n"));
    },
  };
}
