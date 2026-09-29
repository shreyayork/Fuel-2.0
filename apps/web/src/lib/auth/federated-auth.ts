import type { JWTPayload } from "jose";
import type { FuelSession } from "./verify";

type FederatedIdentity = {
  providerName?: string;
  providerType?: string;
};

function parseIdentities(raw: JWTPayload): FederatedIdentity[] {
  const claim = raw["identities"];
  if (!claim) return [];
  if (Array.isArray(claim)) {
    return claim.filter(
      (entry): entry is FederatedIdentity =>
        Boolean(entry) && typeof entry === "object",
    );
  }
  if (typeof claim === "string") {
    try {
      const parsed: unknown = JSON.parse(claim);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (entry): entry is FederatedIdentity =>
          Boolean(entry) && typeof entry === "object",
      );
    } catch {
      return [];
    }
  }
  return [];
}

function providerNames(raw: JWTPayload): string[] {
  const fromIdentities = parseIdentities(raw)
    .map((id) => id.providerName ?? id.providerType)
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => name.trim());

  if (fromIdentities.length > 0) return fromIdentities;

  // Fallback when identities claim is missing but Cognito username is federated.
  const username = raw["cognito:username"];
  if (typeof username === "string" && /^Google_/i.test(username)) {
    return ["Google"];
  }
  return [];
}

function isGoogleProvider(name: string): boolean {
  return /^google$/i.test(name.trim());
}

function isCognitoProvider(name: string): boolean {
  return /^cognito$/i.test(name.trim());
}

/**
 * Google-only Cognito users have no local password to change.
 * Native Cognito users (and linked Google+Cognito, if ever enabled) keep
 * password management. Missing/unrecognized identity data → treat as
 * password-capable (safe default: show the Update Password section).
 */
export function isGoogleOnlyAuthSession(
  session: FuelSession | null | undefined,
): boolean {
  if (!session?.raw) return false;
  const providers = providerNames(session.raw);
  if (providers.length === 0) return false;
  const hasGoogle = providers.some(isGoogleProvider);
  if (!hasGoogle) return false;
  return !providers.some(isCognitoProvider);
}

/** Inverse of {@link isGoogleOnlyAuthSession} for UI/action gates. */
export function canChangePassword(
  session: FuelSession | null | undefined,
): boolean {
  return !isGoogleOnlyAuthSession(session);
}
