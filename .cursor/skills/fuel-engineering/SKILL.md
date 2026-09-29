---
name: fuel-engineering
description: Works in the Fuel 2.0 monorepo per CLAUDE.md — Next.js 15, Drizzle/Postgres, Cognito, CDK, inline Theme atoms, integrations, agent/MCP skills. Use for any Fuel feature, refactor, DB migration, auth/API, design port, or when the user references CLAUDE.md or Fuel conventions.
---

# Fuel 2.0 Engineering

**Start here:** read [`CLAUDE.md`](../../../CLAUDE.md) at the repo root — canonical architecture, commands, and known gaps.

## Quick commands (repo root)

| Task | Command |
|------|---------|
| Dev (DB + Next) | `npm run dev` |
| DB up/down | `npm run db:up` / `db:down` |
| Migrate / seed / reset | `db:migrate` / `db:seed` / `db:reset` |
| Generate migration | `npm run db:generate --workspace=apps/web -- --name <name>` |
| Typecheck / lint / build | `typecheck` / `lint` / `build` |

## Reference files (this skill)

| Topic | File |
|-------|------|
| Architecture & domains | [architecture.md](architecture.md) |
| Design system & prototype | [design-system.md](design-system.md) |
| DB & Drizzle | [database.md](database.md) |
| Auth, accounts, integrations, MCP | [backend.md](backend.md) |
| Next.js / React patterns | [nextjs.md](nextjs.md) |
| Components, forms, API UX | [components-and-api.md](components-and-api.md) |
| Signal pick + value input | [signals.md](signals.md) |
| Not built yet | [not-yet-built.md](not-yet-built.md) |

## Expected AI workflow

**Before:** read `CLAUDE.md` · analyze patterns · search primitives (`atoms.tsx`, `theme.ts`, `lib/*`, existing views)

**During:** match repo conventions · explain non-obvious architecture choices

**After:** `npm run typecheck` · remove dead code · respect account scoping and auth rules

## General standards

- Strict TypeScript; `@/*` imports; reuse types and helpers before adding new ones
- Separate business logic from UI; avoid monolithic files
- Migration from other repos: replicate UX, adapt implementation, reuse tokens — no legacy abstractions
