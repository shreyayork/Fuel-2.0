# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Fuel 2.0 is York IE's internal portfolio / pipeline / value-creation platform. Next.js App Router + Postgres + Drizzle + Cognito in front, CDK-managed AWS (Aurora Serverless v2 behind RDS Proxy, Lambda, CloudFront) underneath. The UI was originally ported 1:1 from a design prototype shipped via Claude Design (inline-styled atoms); newer surfaces mix Tailwind. A Go + Google ADK agent service is on the roadmap but not yet in the repo. See `techstack.md` for target architecture details.

## Commands

Run from repo root unless noted.

| Task                          | Command                                             |
|-------------------------------|-----------------------------------------------------|
| Start DB + dev server         | `npm run dev`                                       |
| DB only (daemonized)          | `npm run db:up` / `npm run db:down`                 |
| Apply migrations              | `npm run db:migrate`                                |
| Seed from fixture             | `npm run db:seed`                                   |
| Drop, migrate, seed           | `npm run db:reset` *(destructive)*                  |
| Drizzle studio (browse DB)    | `npm run db:studio --workspace=apps/web`            |
| Generate a migration          | `npm run db:generate --workspace=apps/web -- --name <name>` |
| Typecheck                     | `npm run typecheck`                                 |
| Lint                          | `npm run lint`                                      |
| Next production build         | `npm run build`                                     |
| e2e (Playwright, not wired)   | `npm run test:e2e --workspace=apps/web`             |

Postgres runs in Docker on `:5432` with credentials `fuel / fuel / fuel` (user / pass / db). `DATABASE_URL` is set in `apps/web/.env` and read by both Next.js and the Drizzle CLI.

## Architecture

**Monorepo.** npm workspaces `apps/*` + `packages/*`. Today: `apps/web` (Next.js 15) and `packages/infrastructure` (CDK stacks + a migration-runner Lambda). `apps/agents/` (ADK Go service) is not yet scaffolded.

**Web app data flow.** The app is a single App Router page (`apps/web/src/app/page.tsx`) that runs as a server component, calls `loadDataset()` (`src/db/queries.ts`) to fetch the entire domain in one trip, and passes it down to `<FuelApp>` — a client component that owns *all* interactive state (theme mode, view mode, page, opened-company). This mirrors the design prototype's `App` component and intentionally keeps server/client boundaries coarse while the schema is still in flux.

**Design system.** `src/lib/theme.ts` holds the two theme tokens (`editorial` = light, `signal` = dark; York navy/teal palette). `src/components/atoms.tsx` has the shared primitives (`Chip`, `KPI`, `Sparkline`, `PercentileBar`, `Tabs`, `SectionHead`, etc.). Every atom takes `t: Theme` as a prop and applies styles inline — this is a deliberate 1:1 port of `ds.jsx` from the design bundle. Tailwind is installed for *new* code, but don't mix it into the ported atoms without a reason; the token-driven inline-style approach is what keeps the two themes consistent. The pattern to migrate off inline styles (if we ever do) is a separate, deliberate pass.

**Views.** `src/components/views/*.tsx` — one file per top-level page (Portfolio, Pipeline, Initiatives, People, Benchmarks, CompanyProfile, CompanyPublicView, etc.). Each takes `{ t, data, onOpenCo? }` and renders directly from the dataset. Placeholder views (Playbooks, Assessment, Action Items) live inline in `FuelApp.tsx` as the design intended.

**Persistence.** The three interactive toggles (`fuel:theme`, `fuel:viewMode`, `fuel:page`) persist via `localStorage` through the `usePersistentState` helper in `FuelApp.tsx` — this matches the prototype's behavior so reloads don't reset the session.

**Database.** `src/db/schema.ts` is the source of truth. Fixture-era tables (`companies`, `people`, `initiatives`, `initiative_team`, `signals`, `benchmarks`) coexist with the shipped platform tables: `accounts` + `account_members` + `teams` + `team_members`; `integration_connections` + `integration_pipeline_configs` + `pipeline_companies` (HubSpot/Granola/Slack/email); `watchlists` + `watchlist_companies` + `watchlist_followers` + `watchlist_shares` + `watchlist_teams`; `context_items` (pgvector embeddings, 1024-dim); `artifacts`; `playbooks`; `benchmark_cohorts`; `catalog_companies`; `portfolio_updates`; `agent_runs` + `agent_skill_invocations`; `mcp_api_tokens`; `enrichment_cache`. Enums are declared at the top of `schema.ts` — check there for valid values when writing filters. `src/db/fixture.ts` + `src/db/seed.ts` still seed the design prototype's data for local dev. `src/db/queries.ts` is marked `server-only`. A single shared `Pool` is cached on `globalThis` to survive Next dev HMR.

**Auth.** Cognito user pools per stage; `src/lib/auth/verify.ts` verifies ID tokens against the pool's JWKS with `jose`. `src/lib/auth/session.ts` manages `fuel_id` + `fuel_refresh` httpOnly cookies. OAuth2 authorization-code flow lives at `src/app/api/auth/callback/route.ts` and talks to `COGNITO_HOSTED_UI`. There is no users table — user identity comes from Cognito `sub` + `email` claims. `bcryptjs` is installed but unused. Expected env at runtime: `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID`, `COGNITO_HOSTED_UI`, `APP_URL`, `STAGE`.

**Accounts + membership.** Every authenticated user belongs to one or more `accounts`; `account_members.role` is `owner | admin | member`. `lib/accounts.ts` owns the membership resolver (`getActiveAccountForUser`) and CRUD. Most writes must filter by `ctx.accountId` to avoid cross-account leakage — this is enforced by convention, not at the DB layer.

**Integrations + pipelines.** `lib/integrations.ts` manages OAuth installs for hubspot/granola/slack/email; credentials are stored encrypted in `integration_connections.credentials` (jsonb). HubSpot deal pipelines sync into `pipeline_companies` via webhook (`/api/integrations/hubspot/webhook`) and periodic reconcile (`/api/cron/reconcile-hubspot`). `/api/admin/pipeline-diag` is an internal diagnostic.

**Agent runtime + MCP.** `src/lib/agent/` defines a skill framework: each skill is a small file with a Zod input schema, `readOnly` flag, `costTokens`, and an async `execute(input, ctx)` that receives `{ userEmail, accountId }`. `agentRuns` + `agentSkillInvocations` record executions. The MCP server at `src/app/api/mcp/route.ts` authenticates via bearer tokens (`fuel_…`, sha256-hashed in `mcp_api_tokens`), re-verifies account membership on every request, and builds a fresh `McpServer` instance per request so the skill context stays scoped. Tokens are created + revoked from the Developer page under `/account/developer` — they don't rotate automatically. Skill additions register in `src/lib/agent/skills/index.ts`.

**Ported role modes.** The app has two workspaces — Portfolio Manager (`viewMode === "pm"`, the default) and Company Manager (`viewMode === "cm"`, dashboard for a single company). The sidebar nav groups and page keys differ between the two; Shell.tsx owns both.

## Working with the design source

The original design prototype (`Fuel 2.0 Redesign.html` + `ds.jsx` + `shell.jsx` + `views.jsx` + `data.js`) is **not** in the repo — it was exported from Claude Design. If you need to reference it, it's under `/tmp/fuel-design/fuel-2-0/project/` in the current machine's tmp directory. When the design changes, re-read the prototype and update the TSX ports — but resist the urge to change visual tokens without evidence it came from the source, since the palette and typography were explicitly dictated by the user (York navy `#284256`, teal `#00B48A`, gold `#ECD67F`, Inter + JetBrains Mono).

## Things that don't exist yet

- `apps/agents` (Google ADK + Go service)
- Playwright specs (only the dev dep + script are wired)
- Token expiration / rotation in `mcp_api_tokens` (tokens live until revoked)
- A users table — user identity is Cognito-resolved at request time, not mirrored

When asked to add any of these, check `techstack.md` for target choices.

## Cursor agent context

- **Rules:** `.cursor/rules/` — `general-engineering.mdc` (always on), plus scoped rules for `apps/web`, DB, and auth/API
- **Skill:** `.cursor/skills/fuel-engineering/` — expanded reference derived from this file; invoke for Fuel-specific work
