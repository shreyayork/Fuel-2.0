import { z } from "zod";

const EmailInput = z.object({
  email: z.string().email().max(254),
});

export type ForgotPasswordReason =
  | "invalid_input"
  | "user_not_found"
  | "invalid_email"
  | "rate_limited"
  | "unavailable"
  | "unknown";

export type ForgotPasswordResult =
  | { ok: true; codeDeliveryDestination?: string }
  | { ok: false; reason: ForgotPasswordReason; message?: string };

export const FORGOT_PASSWORD_COPY = {
  userNotFound: "We don't have an account for that email yet.",
} as const;

type UserExistsResult =
  | { ok: true; exists: boolean }
  | { ok: false; reason: "unconfigured" | "unknown"; message?: string };

type CognitoForgotResult =
  | { ok: true; codeDeliveryDestination?: string }
  | {
      ok: false;
      reason: "invalid_email" | "rate_limited" | "unknown";
      message?: string;
    };

export interface ForgotPasswordDeps {
  userExists: (email: string) => Promise<UserExistsResult>;
  forgotPassword: (email: string) => Promise<CognitoForgotResult>;
}

function isNotConfigured(message?: string): boolean {
  return Boolean(message?.includes("not configured"));
}

export async function performForgotPassword(
  input: unknown,
  deps: ForgotPasswordDeps,
): Promise<ForgotPasswordResult> {
  const parsed = EmailInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const lookup = await deps.userExists(email);
  if (!lookup.ok) {
    if (lookup.reason === "unconfigured") {
      // Local dev without a user pool — skip existence check.
    } else {
      return { ok: false, reason: "unknown", message: lookup.message };
    }
  } else if (!lookup.exists) {
    return { ok: false, reason: "user_not_found" };
  }

  const res = await deps.forgotPassword(email);
  if (!res.ok) {
    if (res.reason === "rate_limited" || res.reason === "invalid_email") {
      return { ok: false, reason: res.reason, message: res.message };
    }
    if (isNotConfigured(res.message)) {
      return { ok: false, reason: "unavailable", message: res.message };
    }
    return { ok: false, reason: res.reason, message: res.message };
  }

  return { ok: true, codeDeliveryDestination: res.codeDeliveryDestination };
}
