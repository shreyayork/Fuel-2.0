import "server-only";
import type { IntegrationConnection } from "@/db/schema";

export type ProviderId = IntegrationConnection["provider"];

/**
 * OAuth2-specific configuration. If `tokenInfo` is supplied the callback will
 * call it after the token exchange to enrich the stored integration with the
 * provider's external account id + any metadata (e.g. HubSpot's `hub_id`).
 *
 * For MCP-style providers (Granola) we use Dynamic Client Registration: the
 * authorize/token endpoints come from OAuth metadata discovery and we register
 * a fresh client per install. Signal with `dcr: true` + `discoveryUrl`.
 */
export interface OAuth2Config {
  kind: "oauth2";
  /** Static authorize URL (ignored when `dcr: true`). */
  authorizeUrl?: string;
  /** Static token URL (ignored when `dcr: true`). */
  tokenUrl?: string;
  /** Space-separated scope list requested by default. */
  defaultScopes: string[];
  /** Dynamic Client Registration mode — discover endpoints + register per install. */
  dcr?: boolean;
  /** OAuth authorization-server metadata document URL (RFC 8414). */
  discoveryUrl?: string;
  /** Paired MCP server URL (used by the client after the token exchange). */
  mcpUrl?: string;
  /**
   * Called after code exchange to pull provider account id + metadata. Keeps
   * per-provider enrichment logic next to the provider definition.
   */
  tokenInfo?: (accessToken: string) => Promise<{
    accountExternalId?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface ProviderFeatures {
  /** Can contribute deal pipelines to Fuel's Pipeline view. */
  pipelines?: boolean;
  /** Can ingest items into context_items (emails, meetings, etc.). */
  contextIngest?: boolean;
}

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  category: "crm" | "meetings" | "chat" | "email";
  auth: OAuth2Config | { kind: "none" };
  features: ProviderFeatures;
  /** If set, the Integrations tab links here after the provider is connected. */
  configurePath?: string;
  /** `true` means the provider is ready to install; `false` shows a "soon" chip. */
  available: boolean;
}

// --- HubSpot -----------------------------------------------------------------

async function hubspotTokenInfo(accessToken: string) {
  const res = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`);
  if (!res.ok) throw new Error(`hubspot token info failed: ${res.status}`);
  const info = (await res.json()) as {
    hub_id: number;
    app_id: number;
    user: string;
    user_id: number;
    hub_domain: string;
    scopes: string[];
  };
  return {
    accountExternalId: String(info.hub_id),
    metadata: {
      hubDomain: info.hub_domain,
      installedByProviderUser: info.user,
      scopes: info.scopes,
    },
  };
}

// --- Slack ------------------------------------------------------------------

/**
 * Slack OAuth v2 uses a non-standard token response: instead of the usual
 * `access_token` the bot token lands under `access_token` (when using bot
 * scopes) and the team id under `team.id`. We only care about the team id
 * for webhook routing + the bot user id for diagnostics.
 */
async function slackTokenInfo(accessToken: string) {
  const res = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/x-www-form-urlencoded",
    },
  });
  if (!res.ok) throw new Error(`slack auth.test failed: ${res.status}`);
  const body = (await res.json()) as {
    ok: boolean;
    team_id?: string;
    team?: string;
    user_id?: string;
    bot_id?: string;
    error?: string;
  };
  if (!body.ok) throw new Error(`slack auth.test error: ${body.error ?? "unknown"}`);
  return {
    accountExternalId: body.team_id,
    metadata: {
      teamId: body.team_id,
      teamName: body.team,
      botUserId: body.user_id,
      botId: body.bot_id,
    },
  };
}

const HUBSPOT_DEFAULT_SCOPES = [
  "crm.objects.companies.read",
  "crm.objects.contacts.read",
  "crm.objects.deals.read",
  "crm.schemas.companies.read",
  "crm.schemas.contacts.read",
  "crm.schemas.deals.read",
  // Owners — used to resolve `hubspot_owner_id` on notes/emails back to a
  // user email for the context feed's authorEmail field.
  "crm.objects.owners.read",
  // Notes + emails live under the "engagements" umbrella in HubSpot's
  // permission grid. The portal/user must have sales seats enabled to grant
  // `sales-email-read`.
  "sales-email-read",
  "oauth",
];

/**
 * Scope names that must be present on the stored install to run activity
 * sync. Surfaced to the UI so a pre-existing install (which didn't request
 * these) can prompt a re-auth without us having to schema-match.
 */
export const HUBSPOT_ACTIVITY_SCOPES = [
  "crm.objects.owners.read",
  "sales-email-read",
];

// --- Registry ---------------------------------------------------------------

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    description:
      "Pull companies, contacts, deals and CRM activity into your private context.",
    category: "crm",
    auth: {
      kind: "oauth2",
      authorizeUrl: "https://app.hubspot.com/oauth/authorize",
      tokenUrl: "https://api.hubapi.com/oauth/v1/token",
      defaultScopes: HUBSPOT_DEFAULT_SCOPES,
      tokenInfo: hubspotTokenInfo,
    },
    features: { pipelines: true, contextIngest: true },
    configurePath: "/account/integrations/hubspot",
    available: true,
  },
  granola: {
    id: "granola",
    name: "Granola",
    description:
      "When you meet with someone from a company on your watchlist or in a portfolio, the Granola summary auto-syncs to that company's context, extracts signals, and generates Intelligence plus draft Initiatives.",
    category: "meetings",
    auth: {
      kind: "oauth2",
      dcr: true,
      discoveryUrl: "https://mcp.granola.ai/.well-known/oauth-authorization-server",
      mcpUrl: "https://mcp.granola.ai/mcp",
      defaultScopes: [],
    },
    features: { contextIngest: true },
    configurePath: "/account/integrations/granola",
    available: true,
  },
  slack: {
    id: "slack",
    name: "Slack",
    description:
      "Monitor channels where investor updates land. Each message becomes a context item and is extracted against the signal catalog.",
    category: "chat",
    auth: {
      kind: "oauth2",
      authorizeUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      defaultScopes: [
        "channels:history",
        "groups:history",
        "channels:read",
        "groups:read",
        "files:read",
        "team:read",
        "users:read",
        "users:read.email",
      ],
      tokenInfo: slackTokenInfo,
    },
    features: { contextIngest: true },
    configurePath: "/account/integrations/slack",
    available: true,
  },
  email: {
    id: "email",
    name: "Email",
    description: "Forward email threads to a per-account inbox to capture them.",
    category: "email",
    auth: { kind: "none" },
    features: { contextIngest: true },
    available: false,
  },
};

export function getProvider(id: string): ProviderDefinition | null {
  return (PROVIDERS as Record<string, ProviderDefinition | undefined>)[id] ?? null;
}

export function listProviders(): ProviderDefinition[] {
  return Object.values(PROVIDERS);
}
