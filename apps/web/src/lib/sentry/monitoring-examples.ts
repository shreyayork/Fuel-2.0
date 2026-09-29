/**
 * Reference examples for custom Sentry monitoring.
 * Import from "@/lib/sentry/monitoring-examples" only where needed — not wired globally.
 */
import * as Sentry from "@sentry/nextjs";

/** Capture a handled exception with optional extra context. */
export function captureHandledException(error: unknown, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.setContext("handled_error", context);
  }
  Sentry.captureException(error);
}

/** Capture a custom informational or warning event. */
export function captureCustomMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  Sentry.captureMessage(message, level);
}

/** Attach the authenticated user to subsequent events in this scope. */
export function setSentryUser(user: { id: string; email?: string }): void {
  Sentry.setUser({ id: user.id, email: user.email });
}

/** Add a searchable tag to the current scope. */
export function setSentryTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/** Attach structured context to the current scope. */
export function setSentryContext(name: string, context: Record<string, unknown>): void {
  Sentry.setContext(name, context);
}

/** Example: instrument a server action or API handler. */
export async function exampleInstrumentedOperation(accountId: string): Promise<void> {
  Sentry.setTag("account_id", accountId);
  Sentry.setContext("operation", { name: "exampleInstrumentedOperation" });

  try {
    // ... business logic
    Sentry.captureMessage("Operation completed", "info");
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
