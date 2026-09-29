"use server";

import {
  cognitoChangePassword,
  cognitoPasswordSignIn,
} from "@/lib/auth/cognito-client";
import {
  performPasswordChange,
  type ChangePasswordResult,
} from "@/lib/auth/change-password";
import { canChangePassword } from "@/lib/auth/federated-auth";
import { resolveAuthedEmail } from "@/lib/auth/resolve-authed-email";
import { getSession } from "@/lib/auth/session";

export type { ChangePasswordResult };

export async function changePasswordAction(
  input: unknown,
): Promise<ChangePasswordResult> {
  const session = await getSession();
  if (!canChangePassword(session)) {
    return { ok: false, reason: "unavailable" };
  }
  return performPasswordChange(input, {
    resolveEmail: resolveAuthedEmail,
    signIn: cognitoPasswordSignIn,
    changePassword: cognitoChangePassword,
  });
}
