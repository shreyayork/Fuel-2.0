import * as Sentry from "@sentry/nextjs";
import type { SeverityLevel } from "@sentry/nextjs";

type IntegrationCaptureOptions = {
  integration: string;
  operation?: string;
  context?: Record<string, unknown>;
  tags?: Record<string, string | number | boolean>;
  userId?: string;
  level?: SeverityLevel;
};

function configureIntegrationScope(
  scope: Sentry.Scope,
  opts: IntegrationCaptureOptions,
): void {
  scope.setTag("integration", opts.integration);
  if (opts.operation) scope.setTag("operation", opts.operation);
  for (const [key, value] of Object.entries(opts.tags ?? {})) {
    scope.setTag(key, value);
  }
  if (opts.userId) scope.setUser({ id: opts.userId });
  if (opts.level) scope.setLevel(opts.level);
  if (opts.context) scope.setContext("operation", opts.context);
}

/** Capture integration failure with standard tags — no secrets in context. */
export function captureIntegrationException(
  error: unknown,
  opts: IntegrationCaptureOptions,
): void {
  Sentry.withScope((scope) => {
    configureIntegrationScope(scope, opts);
    Sentry.captureException(error);
  });
}

/** Capture integration warning without throwing. */
export function captureIntegrationMessage(
  message: string,
  opts: Omit<IntegrationCaptureOptions, "level"> & { level?: SeverityLevel },
): void {
  Sentry.withScope((scope) => {
    configureIntegrationScope(scope, opts);
    Sentry.captureMessage(message, opts.level ?? "warning");
  });
}

/** Fuel-data API route failures (OpenSearch / Neptune). */
export function captureFuelDataException(
  error: unknown,
  operation: string,
  extra?: {
    context?: Record<string, unknown>;
    tags?: Record<string, string | number | boolean>;
    level?: SeverityLevel;
  },
): void {
  captureIntegrationException(error, {
    integration: "fuel_data",
    operation,
    context: extra?.context,
    tags: extra?.tags,
    level: extra?.level,
  });
}

/**
 * Classify Neptune/OpenSearch transport failures so empty fallbacks are
 * distinguishable in Sentry from genuine zero-result queries.
 */
export function neptuneFailureKind(
  error: unknown,
): "neptune_connection_failure" | "neptune_query_failure" {
  const err = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const msg = `${err?.message ?? ""} ${err?.cause?.message ?? ""} ${err?.cause?.code ?? ""}`.toLowerCase();
  const code = (err?.cause?.code ?? "").toUpperCase();
  if (
    err?.name === "AbortError" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENETUNREACH" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    msg.includes("timeout") ||
    msg.includes("fetch failed") ||
    msg.includes("connect") ||
    msg.includes("network")
  ) {
    return "neptune_connection_failure";
  }
  return "neptune_query_failure";
}

/** Log then swallow — keeps empty fallback UX; surfaces failure to Sentry. */
export function captureNeptuneEmptyFallback(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>,
): void {
  const kind = neptuneFailureKind(error);
  captureFuelDataException(error, operation, {
    level: "error",
    tags: {
      neptune_failure_mode: kind,
      empty_fallback: true,
    },
    context: {
      ...context,
      empty_fallback: true,
      neptune_failure_mode: kind,
    },
  });
}
