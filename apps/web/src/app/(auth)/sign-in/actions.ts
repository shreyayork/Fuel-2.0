"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cognitoConfirmSignUp,
  cognitoPasswordSignIn,
  cognitoResendCode,
  cognitoSignUp,
} from "@/lib/auth/cognito-client";
import { resolvePostAuthRedirect } from "@/lib/auth/home-path";
import { setSessionCookies } from "@/lib/auth/session";

/**
 * Native sign-in / sign-up server actions. The page form posts to these
 * directly; no /api/* round-trip. On success we set the same httpOnly
 * session cookies that the OAuth callback writes, so downstream auth
 * (middleware, layout) doesn't care which path got the user signed in.
 */

const SignUpInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(256),
  givenName: z.string().trim().min(1).max(60),
  familyName: z.string().trim().min(1).max(60),
});

const ConfirmInput = z.object({
  email: z.string().email().max(254),
  code: z.string().trim().min(4).max(10),
});

const SignInInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

export type SignUpResult =
  | { ok: true; codeDeliveryDestination?: string }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "username_exists"
        | "invalid_password"
        | "invalid_email"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

export async function signUpAction(input: unknown): Promise<SignUpResult> {
  const parsed = SignUpInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".");
    const message = issue?.message ?? "invalid input";
    console.warn("[signUp] zod rejected", { field, message });
    return {
      ok: false,
      reason: "invalid_input",
      message: field ? `${field}: ${message}` : message,
    };
  }
  const res = await cognitoSignUp(parsed.data);
  if (!res.ok) {
    console.warn("[signUp] cognito rejected", {
      reason: res.reason,
      message: res.message,
    });
    return { ok: false, reason: res.reason, message: res.message };
  }
  return { ok: true, codeDeliveryDestination: res.codeDeliveryDestination };
}

export type ConfirmSignUpResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "code_mismatch"
        | "code_expired"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

export async function confirmSignUpAction(
  input: unknown,
): Promise<ConfirmSignUpResult> {
  const parsed = ConfirmInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.warn("[confirmSignUp] zod rejected", {
      field: issue?.path,
      message: issue?.message,
    });
    return { ok: false, reason: "invalid_input", message: issue?.message };
  }
  const res = await cognitoConfirmSignUp(parsed.data);
  if (!res.ok) {
    console.warn("[confirmSignUp] cognito rejected", { reason: res.reason });
    return { ok: false, reason: res.reason, message: res.message };
  }
  return { ok: true };
}

export async function resendCodeAction(
  email: string,
): Promise<{ ok: boolean }> {
  if (typeof email !== "string" || !email.includes("@")) return { ok: false };
  return cognitoResendCode(email);
}

export type SignInResult =
  | { ok: true; redirect: string }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "user_not_confirmed"
        | "invalid_credentials"
        | "user_not_found"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

export async function signInAction(
  input: unknown,
  nextPath?: string,
): Promise<SignInResult> {
  const parsed = SignInInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.warn("[signIn] zod rejected", {
      field: issue?.path,
      message: issue?.message,
    });
    return { ok: false, reason: "invalid_input", message: issue?.message };
  }
  const res = await cognitoPasswordSignIn(parsed.data);
  if (!res.ok) {
    console.warn("[signIn] cognito rejected", { reason: res.reason });
    return { ok: false, reason: res.reason, message: res.message };
  }
  const idToken = res.tokens.IdToken;
  const expiresIn = res.tokens.ExpiresIn ?? 3600;
  if (!idToken)
    return { ok: false, reason: "unknown", message: "missing id token" };
  await setSessionCookies(idToken, res.tokens.RefreshToken, expiresIn);
  const redirect = await resolvePostAuthRedirect(parsed.data.email, nextPath);
  return { ok: true, redirect };
}

/**
 * Confirm + sign in in one shot. Used by the post-signup verification
 * step so the user lands authenticated without re-typing their password.
 * The password is held in form state on the client only — never persisted.
 *
 * Unified result so the caller has one switch over `reason`.
 */
export type ConfirmAndSignInResult =
  | { ok: true; redirect: string }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "code_mismatch"
        | "code_expired"
        | "user_not_confirmed"
        | "invalid_credentials"
        | "user_not_found"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

export async function confirmAndSignInAction(
  input: { email: string; code: string; password: string },
  nextPath?: string,
): Promise<ConfirmAndSignInResult> {
  const confirm = await confirmSignUpAction({
    email: input.email,
    code: input.code,
  });
  if (!confirm.ok)
    return { ok: false, reason: confirm.reason, message: confirm.message };
  const signIn = await signInAction(
    { email: input.email, password: input.password },
    nextPath,
  );
  if (!signIn.ok)
    return { ok: false, reason: signIn.reason, message: signIn.message };
  return { ok: true, redirect: signIn.redirect };
}

/** Server-action wrapper for form actions that hard-redirect on success. */
export async function signInAndRedirect(
  input: { email: string; password: string },
  nextPath?: string,
): Promise<Exclude<SignInResult, { ok: true }>> {
  const result = await signInAction(input, nextPath);
  if (result.ok) {
    redirect(result.redirect);
  }
  return result;
}

/** Confirm + sign in, then redirect on success (for native form actions). */
export async function confirmAndSignInAndRedirect(
  input: { email: string; code: string; password: string },
  nextPath?: string,
): Promise<Exclude<ConfirmAndSignInResult, { ok: true }>> {
  const result = await confirmAndSignInAction(input, nextPath);
  if (result.ok) {
    redirect(result.redirect);
  }
  return result;
}
