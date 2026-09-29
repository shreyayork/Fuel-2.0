# Tech stack — Fuel 2.0 (York IE)

## Monorepo
- npm workspaces: `apps/*` + `packages/*`
- Node 20 LTS, TypeScript 5
- Single `package.json` at root orchestrates workspace scripts

## Web app — `apps/web`
- **Next.js 15** (App Router, `output: "standalone"` for Lambda)
- React 19 + TypeScript
- **Tailwind CSS** (v4 via `@tailwindcss/postcss`) for new code; design-system atoms use inline styles keyed off a theme-token object (ported from the design prototype)
- **Radix UI** primitives for accessible components: accordion, checkbox, dialog, label, select, separator, slot
- **jose** for JWT sign/verify, **bcryptjs** for password hashing (auth arrives in a later pass)
- **Playwright** for e2e; `TARGET_ENV=staging|production` switches base URL

## Database
- **Postgres 16** — relational data (companies, people, initiatives, signals, benchmarks, plus the shipped platform tables — see `apps/web/src/db/schema.ts`)
  - Local: Docker container via `docker-compose.yml` on `localhost:5432`
  - Staging + production: **Aurora Serverless v2** in CDK, reached via RDS Proxy from Lambda
- **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) for schema, queries, and migrations
  - Schema lives in `apps/web/src/db/schema.ts`
  - Migrations generated with `drizzle-kit generate` into `apps/web/src/db/migrations/`
  - Seeder at `apps/web/src/db/seed.ts` loads the Fuel 2.0 mock fixture

## Agent framework (future)
- Go + **Google Agent Development Kit (ADK)** in `apps/agents/`
- Open questions tracked as follow-ups:
  - Skill catalog and how skills are registered / discovered
  - Per-feature memory strategy (what gets written, what's ephemeral)
  - How agents reach Postgres — direct DSN with an IAM-scoped role, or through an HTTP API on `apps/web`

## Infrastructure — `packages/infrastructure` (future)
- **AWS CDK** (`aws-cdk-lib` + `constructs`), one stack per environment (staging, production)
- Resources: CloudFront + Lambda (Next.js standalone), Lambda (ADK agents), Aurora Serverless v2 + RDS Proxy, Secrets Manager for DB creds
- Jest + ts-jest for unit tests on stack synth
- esbuild `0.21` pinned to avoid CDK NodejsFunction bundling regressions

## Dev workflow
- `npm run dev` at root → `docker compose up -d` (Postgres) + `next dev` on `:3000`
- `npm run db:migrate --workspace=apps/web` → apply Drizzle migrations
- `npm run db:seed --workspace=apps/web` → load the Fuel 2.0 fixture
- `npm run db:reset --workspace=apps/web` → drop, recreate, migrate, seed (destructive)
- `npm run deploy:staging` / `deploy:production` (in `packages/infrastructure`, once scaffolded) → build web workspace then `cdk deploy` the matching stack
- `npm run test:e2e --workspace=apps/web` → Playwright; set `TARGET_ENV=staging` to hit staging URL

## Environments
| Env        | Web                       | DB                                      | Secrets             |
|------------|---------------------------|-----------------------------------------|---------------------|
| local      | `next dev`                | Docker Postgres 16                      | `apps/web/.env`     |
| staging    | Lambda behind CloudFront  | Aurora Serverless v2 (min 0.5 ACU)      | AWS Secrets Manager |
| production | Lambda behind CloudFront  | Aurora Serverless v2 (autoscaling)      | AWS Secrets Manager |
