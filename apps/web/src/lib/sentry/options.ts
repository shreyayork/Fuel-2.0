import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

export function getSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT ??
    process.env.STAGE ??
    process.env.NODE_ENV ??
    "development"
  );
}

export function getSentryRelease(): string | undefined {
  const release = process.env.SENTRY_RELEASE?.trim();
  return release || undefined;
}

export function isSentryEnabled(dsn: string | undefined): boolean {
  if (!dsn?.trim()) return false;
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SENTRY_ENABLE_IN_DEV !== "true"
  ) {
    return false;
  }
  return true;
}

function baseOptions(dsn: string | undefined): Partial<NodeOptions & EdgeOptions & BrowserOptions> {
  return {
    dsn,
    enabled: isSentryEnabled(dsn),
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  };
}

export function getServerSentryOptions(): NodeOptions {
  return {
    ...baseOptions(process.env.SENTRY_DSN),
  };
}

export function getEdgeSentryOptions(): EdgeOptions {
  return {
    ...baseOptions(process.env.SENTRY_DSN),
  };
}

export function getClientSentryOptions(): BrowserOptions {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    ...baseOptions(dsn),
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (typeof window === "undefined") return event;

      const hostname = window.location.hostname;
      if (
        (hostname === "localhost" || hostname === "127.0.0.1") &&
        process.env.SENTRY_ENABLE_IN_DEV !== "true"
      ) {
        return null;
      }

      return event;
    },
  };
}
