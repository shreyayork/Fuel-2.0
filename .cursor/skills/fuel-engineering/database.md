# Database (from CLAUDE.md)

## Setup

- Postgres in Docker on `:5432`
- Credentials: user `fuel`, password `fuel`, database `fuel`
- `DATABASE_URL` in `apps/web/.env` (Next.js + Drizzle CLI)

## Schema

`apps/web/src/db/schema.ts` — source of truth

- Enums at top of file — use for valid filter values
- Fixture-era: `companies`, `people`, `initiatives`, `initiative_team`, `signals`, `benchmarks`
- Platform: `accounts`, `account_members`, `teams`, `team_members`, integrations, watchlists, `context_items` (pgvector 1024-dim), `artifacts`, `playbooks`, `benchmark_cohorts`, `catalog_companies`, `portfolio_updates`, `agent_runs`, `agent_skill_invocations`, `mcp_api_tokens`, `enrichment_cache`, …

## Code

| File | Role |
|------|------|
| `queries.ts` | `loadDataset()` — `server-only`, cached |
| `fixture.ts` + `seed.ts` | Local prototype seed data |
| Pool | Single shared pool on `globalThis` for Next dev HMR |

## Commands

```bash
npm run db:up          # Docker Postgres
npm run db:migrate
npm run db:seed
npm run db:reset       # destructive
npm run db:generate --workspace=apps/web -- --name <name>
npm run db:studio --workspace=apps/web
```

## Security convention

Writes should filter by `ctx.accountId` — enforced by convention, not DB RLS.
