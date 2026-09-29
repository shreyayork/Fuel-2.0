import { NextResponse, type NextRequest } from "next/server";
import { resolvePostAuthRedirect } from "@/lib/auth/home-path";
import { setSessionCookies, getSession } from "@/lib/auth/session";
import { captureIntegrationMessage } from "@/lib/sentry/capture";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  console.log("auth callback params", Object.fromEntries(params.entries()));
  const code = params.get("code");
  const appUrl = process.env.APP_URL ?? req.nextUrl.origin;
  const errorRedirect = (reason: string) =>
    NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(reason)}`, appUrl));

  const oauthError = params.get("error");
  if (oauthError) {
    console.warn("oauth error", oauthError, params.get("error_description"));
    return errorRedirect(oauthError);
  }
  if (!code) return errorRedirect("missing_code");

  const hostedUi = process.env.COGNITO_HOSTED_UI;
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
  if (!hostedUi || !clientId) return errorRedirect("unconfigured");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: `${appUrl}/api/auth/callback`,
  });

  const res = await fetch(`${hostedUi}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    captureIntegrationMessage("Cognito token exchange failed", {
      integration: "cognito",
      operation: "token_exchange",
      context: { status: res.status },
    });
    console.error("token exchange failed", res.status);
    return errorRedirect("token_exchange_failed");
  }
  const tokens = (await res.json()) as {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await setSessionCookies(tokens.id_token, tokens.refresh_token, tokens.expires_in);

  // Honor the `state` param if it's a same-origin path — that's how sign-in
  // → invite-acceptance rounds-trip through Cognito. Validates locally to
  // avoid open-redirect; otherwise land on the workspace home.
  const session = await getSession();
  const redirectPath = await resolvePostAuthRedirect(
    session?.email ?? "",
    params.get("state"),
  );
  return NextResponse.redirect(new URL(redirectPath, appUrl));
}
