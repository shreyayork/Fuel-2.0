import "server-only";
import { createLocalJWKSet, jwtVerify, type JWTPayload } from "jose";
import https from "https";
import { shouldForceIpv4 } from "./local-ipv4";

const REGION = process.env.COGNITO_REGION ?? "us-east-2";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID;

type JwksJson = Parameters<typeof createLocalJWKSet>[0];

let jwks: ReturnType<typeof createLocalJWKSet> | null = null;

function jwksUrl(): URL {
  if (!USER_POOL_ID) throw new Error("COGNITO_USER_POOL_ID not configured");
  return new URL(
    `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
  );
}

function fetchJwksJsonIpv4(url: URL): Promise<JwksJson> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent: new https.Agent({ family: 4 }) }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`JWKS fetch failed: ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as JwksJson);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function loadJwksJson(): Promise<JwksJson> {
  const url = jwksUrl();
  if (shouldForceIpv4()) {
    return fetchJwksJsonIpv4(url);
  }
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  return (await res.json()) as JwksJson;
}

async function getJwks(): Promise<ReturnType<typeof createLocalJWKSet>> {
  if (!jwks) {
    jwks = createLocalJWKSet(await loadJwksJson());
  }
  return jwks;
}

export interface FuelSession {
  sub: string;
  email: string;
  givenName?: string;
  familyName?: string;
  org?: string;
  role?: string;
  /** Cognito user-pool groups (e.g. ["super-admin","internal"]). Empty when not set. */
  groups?: string[];
  raw: JWTPayload;
}

export async function verifyIdToken(token: string): Promise<FuelSession> {
  if (!USER_POOL_ID) throw new Error("COGNITO_USER_POOL_ID not configured");
  const { payload } = await jwtVerify(token, await getJwks(), {
    issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
    audience: CLIENT_ID,
  });
  if (payload.token_use !== "id") throw new Error("Expected id token");
  const rawGroups = payload["cognito:groups"];
  const groups = Array.isArray(rawGroups)
    ? rawGroups.map((g) => String(g))
    : undefined;
  return {
    sub: String(payload.sub),
    email: String(payload.email ?? ""),
    givenName: payload.given_name as string | undefined,
    familyName: payload.family_name as string | undefined,
    org: payload["custom:org"] as string | undefined,
    role: payload["custom:role"] as string | undefined,
    groups,
    raw: payload,
  };
}
