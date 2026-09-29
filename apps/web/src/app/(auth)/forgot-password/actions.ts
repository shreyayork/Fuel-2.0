"use server";

import { z } from "zod";
import {
  cognitoConfirmForgotPassword,
  cognitoForgotPassword,
  cognitoUserExists,
} from "@/lib/auth/cognito-client";
import {
  performForgotPassword,
  type ForgotPasswordResult,
} from "@/lib/auth/forgot-password";
import { isPasswordStrong } from "@/lib/auth/password-policy";

export type { ForgotPasswordResult };

export async function forgotPasswordAction(
  input: unknown,
): Promise<ForgotPasswordResult> {
  return performForgotPassword(input, {
    userExists: cognitoUserExists,
    forgotPassword: cognitoForgotPassword,
  });
}

const ConfirmInput = z.object({
  email: z.string().email().max(254),
  code: z.string().trim().min(4).max(10),
  password: z.string().min(12).max(256),
});

export type ConfirmForgotPasswordResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "weak_password"
        | "code_mismatch"
        | "code_expired"
        | "invalid_password"
        | "rate_limited"
        | "unknown";
      message?: string;
    };

export async function confirmForgotPasswordAction(
  input: unknown,
): Promise<ConfirmForgotPasswordResult> {
  const parsed = ConfirmInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!isPasswordStrong(parsed.data.password)) {
    return { ok: false, reason: "weak_password" };
  }
  return cognitoConfirmForgotPassword(parsed.data);
}
