import { z } from "zod";
import { PASSWORD_MIN_LENGTH, isPasswordStrong } from "./password-policy";

/**
 * Authenticated password change, decoupled from Next request plumbing so the
 * branch mapping is unit-testable.
 *
 * The Cognito AccessToken comes from re-authenticating the *session* email
 * with the supplied current password (`USER_PASSWORD_AUTH`) rather than from
 * the hosted-UI refresh exchange: the refresh cookie is optional (skipped when
 * the token exceeds the browser cookie limit) and `/oauth2/token` needs
 * `COGNITO_HOSTED_UI`, so neither is a reliable AccessToken source. The token
 * is used for the ChangePassword call only — never persisted.
 */

const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(256),
  confirmPassword: z.string().min(1).max(256),
});

export type ChangePasswordReason =
  | "invalid_input"
  | "weak_password"
  | "mismatch"
  | "reused_password"
  | "invalid_credentials"
  | "invalid_password"
  | "limit_exceeded"
  | "rate_limited"
  | "session_expired"
  | "unavailable"
  | "unknown";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: ChangePasswordReason; message?: string };

export const CHANGE_PASSWORD_COPY = {
  currentRequired: "Current password is required.",
  newRequired: "New password is required.",
  confirmRequired: "Confirm password is required.",
  currentIncorrect: "Current password is incorrect.",
  mismatch: "Passwords do not match.",
  weak:
    "Password needs 12+ characters with upper, lower, number, and symbol.",
  reused: "New password must be different from your current password.",
  sessionExpired: "Your session expired. Sign in again to change your password.",
  unavailable: "Password changes aren't available in this environment.",
  rateLimited: "Too many attempts — wait a minute and try again.",
  limitExceeded: "Too many password changes — try again later.",
  unknown: "Something went wrong. Try again in a moment.",
} as const;

export type ChangePasswordField = "current" | "new" | "confirm";

export type ChangePasswordFieldErrors = Partial<
  Record<ChangePasswordField, string>
>;

/** Field-specific copy. Null means the reason is not a field error (use toast). */
export function fieldErrorsForReason(
  reason: ChangePasswordReason,
): ChangePasswordFieldErrors | null {
  switch (reason) {
    case "invalid_credentials":
      return { current: CHANGE_PASSWORD_COPY.currentIncorrect };
    case "mismatch":
      return { confirm: CHANGE_PASSWORD_COPY.mismatch };
    case "weak_password":
    case "invalid_password":
      return { new: CHANGE_PASSWORD_COPY.weak };
    case "reused_password":
      return { new: CHANGE_PASSWORD_COPY.reused };
    case "invalid_input":
      return { current: CHANGE_PASSWORD_COPY.currentRequired };
    default:
      return null;
  }
}

type SignInResult =
  | { ok: true; tokens: { AccessToken?: string } }
  | {
      ok: false;
      reason:
        | "user_not_confirmed"
        | "invalid_credentials"
        | "user_not_found"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

type CognitoChangeResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invalid_credentials"
        | "invalid_password"
        | "limit_exceeded"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

export interface ChangePasswordDeps {
  /** Session-derived email — never trust the client for identity. */
  resolveEmail: () => Promise<string | null>;
  signIn: (opts: { email: string; password: string }) => Promise<SignInResult>;
  changePassword: (opts: {
    accessToken: string;
    previousPassword: string;
    proposedPassword: string;
  }) => Promise<CognitoChangeResult>;
}

function isNotConfigured(message?: string): boolean {
  return Boolean(message?.includes("not configured"));
}

/** Cognito InvalidPasswordException when proposed === previous. */
export function isSameAsPreviousPasswordMessage(message?: string): boolean {
  if (!message) return false;
  return /same as previous|previously used|must be different/i.test(message);
}

export async function performPasswordChange(
  input: unknown,
  deps: ChangePasswordDeps,
): Promise<ChangePasswordResult> {
  const email = await deps.resolveEmail();
  if (!email) return { ok: false, reason: "session_expired" };

  const parsed = ChangePasswordInput.safeParse(input);
  if (!parsed.success) {
    const tooShort = parsed.error.issues.some(
      (issue) => issue.path[0] === "newPassword" && issue.code === "too_small",
    );
    return { ok: false, reason: tooShort ? "weak_password" : "invalid_input" };
  }
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) return { ok: false, reason: "mismatch" };
  if (!isPasswordStrong(newPassword)) return { ok: false, reason: "weak_password" };

  const auth = await deps.signIn({ email, password: currentPassword });
  if (!auth.ok) {
    switch (auth.reason) {
      case "invalid_credentials":
      case "user_not_found":
      case "user_not_confirmed":
        return { ok: false, reason: "invalid_credentials" };
      case "rate_limited":
        return { ok: false, reason: "rate_limited" };
      default:
        return {
          ok: false,
          reason: isNotConfigured(auth.message) ? "unavailable" : "unknown",
          message: auth.message,
        };
    }
  }

  const accessToken = auth.tokens.AccessToken;
  if (!accessToken) return { ok: false, reason: "unknown" };

  const changed = await deps.changePassword({
    accessToken,
    previousPassword: currentPassword,
    proposedPassword: newPassword,
  });
  if (!changed.ok) {
    if (
      changed.reason === "invalid_password" &&
      isSameAsPreviousPasswordMessage(changed.message)
    ) {
      return { ok: false, reason: "reused_password" };
    }
    return { ok: false, reason: changed.reason, message: changed.message };
  }
  return { ok: true };
}
