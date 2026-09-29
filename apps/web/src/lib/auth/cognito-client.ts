import "server-only";
import {
  AdminGetUserCommand,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ListUsersCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { shouldForceIpv4 } from "./local-ipv4";

/**
 * Native Cognito SDK wrapper. Used by the signup / signin server actions
 * so the polished in-app form can drive Cognito directly instead of
 * bouncing through the hosted UI. Credentials always travel over TLS to
 * Cognito; we never store passwords ourselves.
 */
const REGION = process.env.COGNITO_REGION ?? "us-east-2";
const CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID ?? "";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? "";

let cached: CognitoIdentityProviderClient | null = null;

function client(): CognitoIdentityProviderClient {
  if (cached) return cached;
  cached = new CognitoIdentityProviderClient({
    region: REGION,
    ...(shouldForceIpv4()
      ? {
          requestHandler: new NodeHttpHandler({
            httpsAgent: new https.Agent({ family: 4 }),
            connectionTimeout: 10000,
            socketTimeout: 10000,
          }),
        }
      : {}),
  });
  return cached;
}

export interface SignUpInput {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
}

/**
 * Create a Cognito user. Cognito emails a 6-digit confirmation code to
 * the address; the user has to enter it before they can sign in.
 *
 * Maps Cognito's error codes to a small set of typed reasons so the
 * server action can render predictable UI states.
 */
export async function cognitoSignUp(input: SignUpInput): Promise<
  | {
      ok: true;
      userSub: string;
      codeDeliveryDestination?: string;
    }
  | {
      ok: false;
      reason:
        | "username_exists"
        | "invalid_password"
        | "invalid_email"
        | "rate_limited"
        | "unknown";
      message?: string;
    }
> {
  if (!CLIENT_ID) {
    return {
      ok: false,
      reason: "unknown",
      message: "COGNITO_USER_POOL_CLIENT_ID not configured",
    };
  }
  try {
    const res = await client().send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: input.email.trim().toLowerCase(),
        Password: input.password,
        UserAttributes: [
          { Name: "email", Value: input.email.trim().toLowerCase() },
          { Name: "given_name", Value: input.givenName.trim() },
          { Name: "family_name", Value: input.familyName.trim() },
        ],
      }),
    );
    return {
      ok: true,
      userSub: res.UserSub ?? "",
      codeDeliveryDestination: res.CodeDeliveryDetails?.Destination,
    };
  } catch (e) {
    return { ok: false, ...mapCognitoError(e) };
  }
}

export async function cognitoConfirmSignUp(opts: {
  email: string;
  code: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: "code_mismatch" | "code_expired" | "rate_limited" | "unknown";
      message?: string;
    }
> {
  if (!CLIENT_ID) {
    return {
      ok: false,
      reason: "unknown",
      message: "COGNITO_USER_POOL_CLIENT_ID not configured",
    };
  }
  try {
    await client().send(
      new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: opts.email.trim().toLowerCase(),
        ConfirmationCode: opts.code.trim(),
      }),
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, ...mapConfirmError(e) };
  }
}

export async function cognitoResendCode(
  email: string,
): Promise<{ ok: boolean }> {
  if (!CLIENT_ID) return { ok: false };
  try {
    await client().send(
      new ResendConfirmationCodeCommand({
        ClientId: CLIENT_ID,
        Username: email.trim().toLowerCase(),
      }),
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function cognitoPasswordSignIn(opts: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; tokens: AuthenticationResultType }
  | {
      ok: false;
      reason:
        | "user_not_confirmed"
        | "invalid_credentials"
        | "user_not_found"
        | "rate_limited"
        | "unknown";
      message?: string;
    }
> {
  if (!CLIENT_ID) {
    return {
      ok: false,
      reason: "unknown",
      message: "COGNITO_USER_POOL_CLIENT_ID not configured",
    };
  }
  try {
    const res = await client().send(
      new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: opts.email.trim().toLowerCase(),
          PASSWORD: opts.password,
        },
      }),
    );
    if (!res.AuthenticationResult) {
      // Cognito can return a challenge (MFA, password reset). For v1 we
      // don't enroll users in MFA, so this is treated as unknown.
      return {
        ok: false,
        reason: "unknown",
        message: "auth challenge unsupported",
      };
    }
    return { ok: true, tokens: res.AuthenticationResult };
  } catch (e) {
    return { ok: false, ...mapSignInError(e) };
  }
}

/**
 * Admin lookup — requires `cognito-idp:AdminGetUser` on the web Lambda.
 * Used before forgot-password so unregistered emails get a validation error
 * instead of advancing the recovery UI.
 */
export async function cognitoUserExists(email: string): Promise<
  | { ok: true; exists: boolean }
  | { ok: false; reason: "unconfigured" | "unknown"; message?: string }
> {
  if (!USER_POOL_ID) {
    return { ok: false, reason: "unconfigured" };
  }
  try {
    await client().send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email.trim().toLowerCase(),
      }),
    );
    return { ok: true, exists: true };
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err.name === "UserNotFoundException") {
      return { ok: true, exists: false };
    }
    captureIntegrationException(e, {
      integration: "cognito",
      operation: "adminGetUser",
    });
    return { ok: false, reason: "unknown", message: err.message };
  }
}

export type CognitoListUsersResult =
  | {
      ok: true;
      users: Array<{
        username?: string;
        attributes?: Array<{ Name?: string; Value?: string }>;
        userStatus?: string;
        enabled?: boolean;
        userCreateDate?: Date;
      }>;
      paginationToken?: string;
    }
  | { ok: false; reason: "unconfigured" | "rate_limited" | "unknown"; message?: string };

/**
 * Admin user-pool list — requires `cognito-idp:ListUsers`.
 *
 * Do not pass `AttributesToGet`. Cognito rejects the whole page with
 * InvalidParameterException when any returned user is missing a requested
 * attribute (common for `name` / given_name / family_name). Callers must
 * allowlist attributes after the response (see Super Admin mapper).
 */
export async function listCognitoUsers(opts: {
  filter?: string;
  limit: number;
  paginationToken?: string;
}): Promise<CognitoListUsersResult> {
  if (!USER_POOL_ID) {
    return { ok: false, reason: "unconfigured" };
  }
  try {
    const res = await client().send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: opts.limit,
        Filter: opts.filter,
        PaginationToken: opts.paginationToken,
      }),
    );
    return {
      ok: true,
      users: (res.Users ?? []).map((user) => ({
        username: user.Username,
        attributes: user.Attributes?.map((attr) => ({
          Name: attr.Name,
          Value: attr.Value,
        })),
        userStatus: user.UserStatus,
        enabled: user.Enabled,
        userCreateDate: user.UserCreateDate,
      })),
      paginationToken: res.PaginationToken,
    };
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err.name === "TooManyRequestsException" || err.name === "LimitExceededException") {
      return { ok: false, reason: "rate_limited", message: err.message };
    }
    captureIntegrationException(e, {
      integration: "cognito",
      operation: "listUsers",
      context: {
        errorName: err.name ?? "unknown",
        // Safe: Cognito exception class only — never credentials or tokens.
        errorMessage: err.message?.slice(0, 200) ?? null,
      },
    });
    return { ok: false, reason: "unknown", message: err.message };
  }
}

/** Start forgot-password. Cognito emails a confirmation code. */
export async function cognitoForgotPassword(
  email: string,
): Promise<
  | { ok: true; codeDeliveryDestination?: string }
  | {
      ok: false;
      reason: "invalid_email" | "rate_limited" | "unknown";
      message?: string;
    }
> {
  if (!CLIENT_ID) {
    return {
      ok: false,
      reason: "unknown",
      message: "COGNITO_USER_POOL_CLIENT_ID not configured",
    };
  }
  try {
    const res = await client().send(
      new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email.trim().toLowerCase(),
      }),
    );
    return {
      ok: true,
      codeDeliveryDestination: res.CodeDeliveryDetails?.Destination,
    };
  } catch (e) {
    const mapped = mapForgotPasswordError(e);
    if (mapped.reason === "unknown") {
      captureIntegrationException(e, {
        integration: "cognito",
        operation: "forgotPassword",
      });
    }
    return { ok: false, ...mapped };
  }
}

export async function cognitoConfirmForgotPassword(opts: {
  email: string;
  code: string;
  password: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      reason:
        | "code_mismatch"
        | "code_expired"
        | "invalid_password"
        | "rate_limited"
        | "unknown";
      message?: string;
    }
> {
  if (!CLIENT_ID) {
    return {
      ok: false,
      reason: "unknown",
      message: "COGNITO_USER_POOL_CLIENT_ID not configured",
    };
  }
  try {
    await client().send(
      new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: opts.email.trim().toLowerCase(),
        ConfirmationCode: opts.code.trim(),
        Password: opts.password,
      }),
    );
    return { ok: true };
  } catch (e) {
    const mapped = mapConfirmForgotPasswordError(e);
    if (mapped.reason === "unknown") {
      captureIntegrationException(e, {
        integration: "cognito",
        operation: "confirmForgotPassword",
      });
    }
    return { ok: false, ...mapped };
  }
}

/**
 * Authenticated password change. Requires a Cognito AccessToken — never
 * persist that token beyond the request.
 */
export async function cognitoChangePassword(opts: {
  accessToken: string;
  previousPassword: string;
  proposedPassword: string;
}): Promise<
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
    }
> {
  try {
    await client().send(
      new ChangePasswordCommand({
        AccessToken: opts.accessToken,
        PreviousPassword: opts.previousPassword,
        ProposedPassword: opts.proposedPassword,
      }),
    );
    return { ok: true };
  } catch (e) {
    const mapped = mapChangePasswordError(e);
    if (mapped.reason === "unknown") {
      captureIntegrationException(e, {
        integration: "cognito",
        operation: "changePassword",
      });
    }
    return { ok: false, ...mapped };
  }
}

function mapCognitoError(e: unknown): {
  reason:
    | "username_exists"
    | "invalid_password"
    | "invalid_email"
    | "rate_limited"
    | "unknown";
  message?: string;
} {
  const err = e as { name?: string; message?: string };
  switch (err.name) {
    case "UsernameExistsException":
      return { reason: "username_exists" };
    case "InvalidPasswordException":
      return { reason: "invalid_password", message: err.message };
    case "InvalidParameterException":
      return { reason: "invalid_email", message: err.message };
    case "TooManyRequestsException":
    case "LimitExceededException":
      return { reason: "rate_limited" };
    default:
      return { reason: "unknown", message: err.message };
  }
}

function mapConfirmError(e: unknown): {
  reason: "code_mismatch" | "code_expired" | "rate_limited" | "unknown";
  message?: string;
} {
  const err = e as { name?: string; message?: string };
  switch (err.name) {
    case "CodeMismatchException":
      return { reason: "code_mismatch" };
    case "ExpiredCodeException":
      return { reason: "code_expired" };
    case "TooManyRequestsException":
    case "LimitExceededException":
      return { reason: "rate_limited" };
    default:
      return { reason: "unknown", message: err.message };
  }
}

function mapSignInError(e: unknown): {
  reason:
    | "user_not_confirmed"
    | "invalid_credentials"
    | "user_not_found"
    | "rate_limited"
    | "unknown";
  message?: string;
} {
  const err = e as { name?: string; message?: string };
  switch (err.name) {
    case "UserNotConfirmedException":
      return { reason: "user_not_confirmed" };
    case "NotAuthorizedException":
      // With preventUserExistenceErrors=true the pool returns this for
      // both bad password AND nonexistent user. Surface as generic.
      return { reason: "invalid_credentials" };
    case "UserNotFoundException":
      return { reason: "user_not_found" };
    case "TooManyRequestsException":
    case "LimitExceededException":
      return { reason: "rate_limited" };
    default:
      return { reason: "unknown", message: err.message };
  }
}

function mapForgotPasswordError(e: unknown): {
  reason: "invalid_email" | "rate_limited" | "unknown";
  message?: string;
} {
  const err = e as { name?: string; message?: string };
  switch (err.name) {
    case "InvalidParameterException":
      return { reason: "invalid_email", message: err.message };
    case "TooManyRequestsException":
    case "LimitExceededException":
      return { reason: "rate_limited" };
    default:
      return { reason: "unknown", message: err.message };
  }
}

function mapConfirmForgotPasswordError(e: unknown): {
  reason:
    | "code_mismatch"
    | "code_expired"
    | "invalid_password"
    | "rate_limited"
    | "unknown";
  message?: string;
} {
  const err = e as { name?: string; message?: string };
  switch (err.name) {
    case "CodeMismatchException":
      return { reason: "code_mismatch" };
    case "ExpiredCodeException":
      return { reason: "code_expired" };
    case "InvalidPasswordException":
      return { reason: "invalid_password", message: err.message };
    case "TooManyRequestsException":
    case "LimitExceededException":
      return { reason: "rate_limited" };
    default:
      return { reason: "unknown", message: err.message };
  }
}

function mapChangePasswordError(e: unknown): {
  reason:
    | "invalid_credentials"
    | "invalid_password"
    | "limit_exceeded"
    | "rate_limited"
    | "unknown";
  message?: string;
} {
  const err = e as { name?: string; message?: string };
  switch (err.name) {
    case "NotAuthorizedException":
      return { reason: "invalid_credentials" };
    case "InvalidPasswordException":
      return { reason: "invalid_password", message: err.message };
    case "LimitExceededException":
      return { reason: "limit_exceeded" };
    case "TooManyRequestsException":
      return { reason: "rate_limited" };
    default:
      return { reason: "unknown", message: err.message };
  }
}
