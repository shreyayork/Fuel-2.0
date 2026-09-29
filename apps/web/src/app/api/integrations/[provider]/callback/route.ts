import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getProvider } from "@/lib/integrations/registry";
import {
  exchangeCodeForTokens,
  exchangeDcrCode,
  isConfigured,
  type DcrInstallPrep,
} from "@/lib/integrations/oauth";
import { upsertIntegration } from "@/lib/integrations";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectTo(req: Request, path: string): Response {
  // Prefer APP_URL so the browser lands on the canonical host (and keeps its
  // session cookie) rather than on the raw Lambda Function URL.
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL(path, base), { status: 302 });
}

function fail(req: Request, reason: string): Response {
  return redirectTo(req, `/account/integrations?error=${encodeURIComponent(reason)}`);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await ctx.params;
  const provider = getProvider(providerId);
  if (!provider || provider.auth.kind !== "oauth2") return fail(req, "unknown_provider");

  const origin = new URL(req.url).origin;
  if (!(await isConfigured(provider, origin))) return fail(req, `${provider.id}_not_configured`);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  if (errParam) return fail(req, errParam);
  if (!code || !state) return fail(req, "missing_code_or_state");

  const jar = await cookies();
  const stateCookie = `fuel_oauth_state_${provider.id}`;
  const cookieState = jar.get(stateCookie)?.value;
  if (!cookieState || cookieState !== state) return fail(req, "state_mismatch");
  jar.delete(stateCookie);

  const [accountIdFromState] = state.split(".");
  const session = process.env.COGNITO_USER_POOL_ID ? await getSession() : null;
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account || account.id !== accountIdFromState) return fail(req, "account_mismatch");

  let tokens;
  let dcrState: DcrInstallPrep["dcrState"] | undefined;
  const isDcr = provider.auth.kind === "oauth2" && provider.auth.dcr;
  try {
    if (isDcr) {
      const dcrCookie = jar.get(`fuel_oauth_dcr_${provider.id}`)?.value;
      if (!dcrCookie) return fail(req, "missing_dcr_state");
      dcrState = JSON.parse(Buffer.from(dcrCookie, "base64url").toString("utf8")) as DcrInstallPrep["dcrState"];
      jar.delete(`fuel_oauth_dcr_${provider.id}`);
      tokens = await exchangeDcrCode({ provider, origin, code, dcrState });
    } else {
      tokens = await exchangeCodeForTokens({ provider, origin, code });
    }
  } catch (e) {
    captureIntegrationException(e, {
      integration: providerId,
      operation: "oauth_exchange",
      context: { accountId: accountIdFromState },
    });
    return fail(req, `exchange_failed:${(e as Error).message.slice(0, 80)}`);
  }

  // Provider-specific enrichment (HubSpot's `hub_id`, etc.)
  let accountExternalId: string | undefined;
  let metadata: Record<string, unknown> | undefined;
  if (provider.auth.kind === "oauth2" && provider.auth.tokenInfo) {
    try {
      const info = await provider.auth.tokenInfo(tokens.access_token);
      accountExternalId = info.accountExternalId;
      metadata = info.metadata;
    } catch {
      // Non-fatal — we still store tokens; metadata can be filled in later.
    }
  }

  // Persist DCR client creds on the connection so refresh works later.
  if (dcrState) {
    metadata = {
      ...(metadata ?? {}),
      dcr: {
        clientId: dcrState.clientId,
        clientSecret: dcrState.clientSecret,
        tokenUrl: dcrState.tokenUrl,
        registrationAccessToken: dcrState.registrationAccessToken,
        registrationClientUri: dcrState.registrationClientUri,
      },
      mcpUrl: provider.auth.kind === "oauth2" ? provider.auth.mcpUrl : undefined,
    };
  }

  // Slack bot tokens don't expire, so `expires_in` is absent — store null so
  // we don't emit NaN or a bogus past date.
  const expiresAt =
    typeof tokens.expires_in === "number" && Number.isFinite(tokens.expires_in)
      ? Date.now() + tokens.expires_in * 1000
      : null;
  await upsertIntegration({
    accountId: account.id,
    provider: provider.id,
    installedByEmail: email,
    scope: isDcr ? "user" : "account",
    credentials: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      tokenType: tokens.token_type,
    },
    accountExternalId,
    metadata,
  });

  return redirectTo(
    req,
    provider.configurePath
      ? `${provider.configurePath}?connected=1`
      : `/account/integrations?connected=${provider.id}`,
  );
}
