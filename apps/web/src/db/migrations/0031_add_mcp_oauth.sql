-- OAuth 2.1 + DCR support so claude.ai's "Custom Connector" web flow can
-- authenticate against /api/mcp. Two short-lived tables:
--   - mcp_oauth_clients: registered DCR clients (one row per Claude install).
--   - mcp_oauth_authorization_codes: one-shot codes (TTL ~5 min) bridging
--     the user-facing /authorize step to the /token POST exchange.
-- Access tokens reuse mcp_api_tokens; we just stamp `issued_via='oauth'`.

CREATE TABLE "mcp_oauth_clients" (
  "client_id" text PRIMARY KEY,
  -- bcrypt-style hash of client_secret, or NULL for public clients.
  "client_secret_hash" text,
  "name" text NOT NULL,
  "redirect_uris" jsonb NOT NULL,
  "token_endpoint_auth_method" text NOT NULL DEFAULT 'none',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_used_at" timestamp
);

CREATE TABLE "mcp_oauth_authorization_codes" (
  "code" text PRIMARY KEY,
  "client_id" text NOT NULL REFERENCES "mcp_oauth_clients"("client_id") ON DELETE CASCADE,
  "user_email" text NOT NULL,
  "account_id" text NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "redirect_uri" text NOT NULL,
  "scope" text,
  -- PKCE per RFC 7636. Plain method is intentionally rejected.
  "code_challenge" text NOT NULL,
  "code_challenge_method" text NOT NULL DEFAULT 'S256',
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "mcp_oauth_authorization_codes_expires_idx"
  ON "mcp_oauth_authorization_codes" ("expires_at");

ALTER TABLE "mcp_api_tokens" ADD COLUMN "issued_via" text NOT NULL DEFAULT 'manual';
ALTER TABLE "mcp_api_tokens" ADD COLUMN "client_id" text REFERENCES "mcp_oauth_clients"("client_id") ON DELETE SET NULL;
