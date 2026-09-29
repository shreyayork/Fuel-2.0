# Production deploy

## Current status (2026-09-17 first deploy)

| Item | Status |
|------|--------|
| SM placeholders `fuel2-prod-*` (5) | **Done** — values still `REPLACE_ME` |
| Stack `fuel2-prod` | **CREATE_COMPLETE** (Aurora PG **16.11**, reader, 14d backup, RETAIN) |
| Stack `fuel2-prod-peering` | **CREATE_COMPLETE** |
| Schema migration (`MigrationFn`) | **Done** — `{ok:true, migrated:true, seeded:null}` (empty; no fixture seed) |
| `https://v2.fuel.york.ie/` | **HTTP 200** (login may fail until Google redirect + real secrets) |
| Dev / stage stacks | Unaffected |

### Notable first-deploy incident

1. Initial create failed: Aurora engine **16.4** no longer creatable in `us-east-2` (live dev/stage already on **16.11**).
2. Fix: bump `packages/infrastructure/lib/database.ts` → `VER_16_11`.
3. Cleaned `ROLLBACK_COMPLETE` stack + RETAIN orphans (Cognito pool, S3 assets/uploads buckets), then redeployed.
4. Deploy path: **local** `cdk deploy` (`gh` CLI unavailable; not via GitHub Actions this time). CDK CLI hung after main stack `CREATE_COMPLETE`; peering deployed in a follow-up invoke. Prefer Actions next time for cleaner logs.
5. **Sign-in 500 after Cognito success:** local `npm run build:opennext` inlined `DATABASE_URL=…@localhost:5433` into the server bundle. Lambda env correctly had `DB_PROXY_ENDPOINT` / `DB_SECRET_ARN` (no `DATABASE_URL`), but `getDb()` preferred the baked localhost URL → `ECONNREFUSED 127.0.0.1:5433` on `account_members` lookup in `resolvePostAuthRedirect`. Fix: prefer SM+proxy in `apps/web/src/db/client.ts`; rebuild/redeploy **without** a local `DATABASE_URL` in the build env (or rely on the code order fix).

### Key outputs

- Web: `https://v2.fuel.york.ie`
- Cognito Hosted UI: `https://fuel2-prod.auth.us-east-2.amazoncognito.com`
- Google redirect (add in Google Console): `https://fuel2-prod.auth.us-east-2.amazoncognito.com/oauth2/idpresponse`
- User pool: `us-east-2_8oSVdbaEX`

## Remaining manual steps (before prod is fully functional)

1. **GitHub `prod` environment** — confirm required reviewers set (still unconfirmed).
2. **Replace SM placeholders** with real prod credentials (do **not** copy from dev/stage):
   - `fuel2-prod-hubspot-oauth` `{clientId, clientSecret}`
   - `fuel2-prod-slack-oauth` `{SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET}` (matches existing stage/dev key shape)
   - `fuel2-prod-brightdata-api` `{apiKey}`
   - `fuel2-prod-stripe-api` `{secretKey, webhookSecret}` (**live** Stripe keys)
   - `fuel2-prod-public-api` `{clientId, clientSecret}`
3. **Google Console** — add OAuth redirect URI:  
   `https://fuel2-prod.auth.us-east-2.amazoncognito.com/oauth2/idpresponse`
4. **HubSpot prod app** (Option A — separate app; do not overwrite stage `targetUrl`):
   - Create prod HubSpot developer app; webhook → `https://v2.fuel.york.ie/api/integrations/hubspot/webhook`
   - Put real `{clientId, clientSecret}` into `fuel2-prod-hubspot-oauth`
   - OAuth redirect: `https://v2.fuel.york.ie/api/integrations/hubspot/callback`
   - **Re-auth plan:** any install that used the stage HubSpot client against prod must re-authorize with the prod app (refresh tokens bound to stage client id)
5. Redeploy / bounce web Lambda after secret updates if CFN already resolved placeholder dynamic refs for `PUBLIC_API_*` (cron token is CDK-generated; OAuth/API secrets are read at runtime via ARN — updating SM values is enough for hubspot/slack/stripe/brightdata). For `PUBLIC_API_CLIENT_*` injected via `secretValueFromJson` at deploy time, run a no-op stack update / redeploy so Lambda env picks up new values.

## GitHub Environment

- Environment name: `prod` (matches `deploy-prod` → `environment: prod` in `.github/workflows/pipeline.yml`).
- Exists and is scoped to the `main` branch.
- Deploy trigger: Actions → Pipeline → **Run workflow** on `main` only (`workflow_dispatch` + job `if` on `refs/heads/main`).

## Deploy paths (in-repo)

| Path | Stacks | Migrations |
|------|--------|------------|
| GitHub `deploy-prod` (`main` + `workflow_dispatch`) | `fuel2-prod` + `fuel2-prod-peering` | Yes (post-deploy MigrationFn) |
| Local `npm run deploy:prod` / `diff:prod` | same | Manual invoke if needed |

**Pre-existing (not fixed in prod-readiness work):** `deploy:stage` / stage CI / `diff:stage` / `diff:dev` omit peering stacks. Only `deploy:dev` (local + CI) and prod (local + CI) deploy peering.

## HubSpot webhooks (stage + prod)

### Constraint

HubSpot Projects allow **one** `webhooks` component per app, with a **single** `targetUrl`. You cannot point the same app at both `stage.v2.fuel.york.ie` and `v2.fuel.york.ie`.

In-repo project `tools/hubspot-app/fuel2-hubspot-app` is the **stage** app (`name`: "Fuel 2.0 (stage)"). Active `targetUrl`:

`https://stage.v2.fuel.york.ie/api/integrations/hubspot/webhook`

### Chosen approach: Option A

Separate HubSpot apps per env. Matches env-scoped `fuel2-{STAGE}-hubspot-oauth`. Options B (shared fan-out) and C (manual retarget) rejected — see prior decision notes in git history / earlier runbook revisions.

### Current state

- Stage webhook URL intact in `webhooks-hsmeta.json`.
- Prod HubSpot app **not created yet** (manual follow-up above).

Do not change stage `targetUrl` to prod in this repo's HubSpot project.

## Retry / rollback

- Failed create left `ROLLBACK_COMPLETE` → delete stack, remove RETAIN orphans (Cognito `fuel2-prod` pool, `fuel2-prod-webassets*` / `fuel2-prod-webuploads*` buckets), fix root cause, redeploy.
- App rollback after healthy deploy: redeploy prior git SHA via same pipeline / `cdk deploy` (rolling Lambda + assets). Aurora/Cognito are RETAIN — do not delete casually.
