# Architecture (from CLAUDE.md)

## What this is

Fuel 2.0 is York IE's internal portfolio / pipeline / value-creation platform.

- **Frontend:** Next.js App Router + Postgres + Drizzle + Cognito
- **Infra:** CDK — Aurora Serverless v2 (RDS Proxy), Lambda, CloudFront (`packages/infrastructure`)
- **UI origin:** 1:1 port from Claude Design prototype (inline-styled atoms); newer surfaces mix Tailwind
- **Roadmap:** Go + Google ADK agent service — see `techstack.md` (not in repo yet)

## Monorepo layout

npm workspaces: `apps/*` + `packages/*`

| Package | Role |
|---------|------|
| `apps/web` | Next.js 15 application |
| `packages/infrastructure` | CDK stacks + migration-runner Lambda |
| `apps/agents/` | **Not scaffolded** |

## Web app data flow

1. App Router pages under `src/app/` — mostly async server components
2. Server loads data via `loadDataset()` (`src/db/queries.ts`, `server-only`, cached on `globalThis` pool)
3. Client interactivity in route-specific components, `AppShell`, or legacy `<FuelApp>` on `/dashboard`
4. `FuelApp` mirrors prototype `App` — owns theme, view mode, page, opened company (coarse client boundary while schema evolved)

## Views & shell

- `src/components/views/*.tsx` — one file per top-level page; props `{ t, data, onOpenCo? }`
- Placeholder views (Playbooks, Assessment, Action Items) may live inline in `FuelApp.tsx` per design
- `Shell.tsx` — PM (`viewMode === "pm"`) vs CM (`"cm"`) workspaces; different sidebar nav
- Persistence: `usePersistentState` + `localStorage` keys `fuel:theme`, `fuel:viewMode`, `fuel:page`

## Key paths

```
apps/web/src/
  app/           # App Router (+ api routes)
  components/    # atoms, views, Shell, AppShell, onboard, ai
  db/            # schema, queries, seed, fixture
  lib/           # auth, accounts, integrations, agent, theme
```
