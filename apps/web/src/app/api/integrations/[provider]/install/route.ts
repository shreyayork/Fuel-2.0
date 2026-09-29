import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getProvider } from "@/lib/integrations/registry";
import { buildAuthorizeUrl, isConfigured, prepareDcrInstall } from "@/lib/integrations/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) redirect("/sign-in");
  }
  const email = (await getSession())?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) return NextResponse.json({ error: "no active account" }, { status: 400 });

  const { provider: providerId } = await ctx.params;
  const provider = getProvider(providerId);
  if (!provider || provider.auth.kind !== "oauth2") {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const origin = new URL(req.url).origin;
  if (!(await isConfigured(provider, origin))) {
    return NextResponse.json(
      { error: `${provider.id} OAuth not configured` },
      { status: 500 },
    );
  }

  const nonce = randomBytes(16).toString("base64url");
  const state = `${account.id}.${nonce}`;
  const jar = await cookies();
  jar.set(`fuel_oauth_state_${provider.id}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/integrations/${provider.id}`,
    maxAge: 600,
  });

  // DCR providers: discover → register → redirect with PKCE. Stash the DCR
  // creds + code verifier in a separate short-lived cookie so the callback
  // can finish the token exchange.
  if (provider.auth.kind === "oauth2" && provider.auth.dcr) {
    const { authorizeUrl, dcrState } = await prepareDcrInstall({ provider, origin, state });
    jar.set(
      `fuel_oauth_dcr_${provider.id}`,
      Buffer.from(JSON.stringify(dcrState)).toString("base64url"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/api/integrations/${provider.id}`,
        maxAge: 600,
      },
    );
    return NextResponse.redirect(authorizeUrl);
  }

  return NextResponse.redirect(
    await buildAuthorizeUrl({ provider, origin, state }),
  );
}
