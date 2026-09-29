# Auth, accounts, integrations, agent (from CLAUDE.md)

## Auth

- Cognito user pools per stage
- `lib/auth/verify.ts` — ID tokens via pool JWKS (`jose`)
- `lib/auth/session.ts` — httpOnly `fuel_id` + `fuel_refresh`
- OAuth code flow: `app/api/auth/callback/route.ts` → `COGNITO_HOSTED_UI`
- **No users table** — identity from Cognito `sub` + `email` at request time
- `bcryptjs` is installed but unused

**Runtime env:** `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID`, `COGNITO_HOSTED_UI`, `APP_URL`, `STAGE`

## Accounts

- `lib/accounts.ts` — `getActiveAccountForUser`, membership CRUD
- Roles: `owner | admin | member`
- Scope writes with `ctx.accountId`

## Integrations

- `lib/integrations.ts` — OAuth installs (hubspot, granola, slack, email)
- Credentials encrypted in `integration_connections.credentials` (jsonb)
- HubSpot: webhook `/api/integrations/hubspot/webhook` + cron `/api/cron/reconcile-hubspot`
- Diagnostic: `/api/admin/pipeline-diag`

## Agent runtime + MCP

**Skills** (`lib/agent/skills/`):

- Zod input schema, `readOnly`, `costTokens`
- `execute(input, ctx)` with `{ userEmail, accountId }`
- Register new skills in `lib/agent/skills/index.ts`
- Persisted in `agentRuns` + `agentSkillInvocations`

**MCP** (`app/api/mcp/route.ts`):

- Bearer tokens `fuel_…` (sha256 in `mcp_api_tokens`)
- Re-verify account membership each request
- Fresh `McpServer` per request for scoped context
- Create/revoke tokens at `/account/developer` — **no automatic rotation**
