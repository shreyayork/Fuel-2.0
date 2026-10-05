# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audiences, treated equally by workspace:

- **York IE operators / portfolio managers (PM workspace):** run portfolio and pipeline, track network (advisors, investors), and coordinate value-creation across companies.
- **Portfolio-company founders / company managers (CM workspace):** run their company operating overview, initiatives, benchmarks, and day-to-day company tools.

Secondary audiences present in product: advisors, investors, and super-admin operators of the platform itself.

## Product Purpose

Fuel 2.0 is York IE’s internal portfolio / pipeline / value-creation platform. It helps York IE and portfolio companies understand operating health, turn insight into initiatives and playbooks, and connect work to York IE services — with AI assistance grounded in company profile, cohort benchmarks, and approved catalogs.

Success means operators and founders can scan truth, act on the next initiative, and stay within account-scoped, authenticated workflows without leaving Fuel for a generic board or CRM.

## Positioning

AI-grounded operating overview and initiatives for portfolio companies, tied to cohort benchmarks and York IE’s approved services — not a generic CRM or task board.

## Operating Context

- Two workspaces: Portfolio Manager (PM) and Company Manager (CM), with different nav and home behavior.
- Company overview generation (Fuel AI) from profile, category answers, documents, and benchmarks.
- Initiatives with milestones and “How York IE can help” grounded in an approved service catalog (not invented services).
- Integrations: HubSpot, Granola, Slack, email; pipeline sync when portfolio manager features are enabled.
- Auth via Cognito; multi-account membership with roles (`owner | admin | member`).
- Super-admin surfaces for platform-wide administration (credits, coupons, playbooks, FAQs, cohorts, etc.).

## Capabilities and Constraints

**Capabilities (confirmed in product):** company profiles & public views; overview & intelligence; initiatives & playbooks; people/network; benchmarks; pipeline/portfolio (account-gated); integrations; onboarding; account settings & developer MCP tokens; super-admin tooling; agent/MCP skills.

**Constraints:**

- Account-scoped reads/writes; never trust client for email, domain, or account scope.
- Cognito identity (`sub` + email); no users table mirroring.
- Do not invent testimonials, pricing, market claims, or York IE services outside the approved catalog.
- York brand palette and type are binding for in-product UI unless design evidence says otherwise.
- Stack is the existing monorepo (`apps/web` Next.js 15, Drizzle/Postgres, Cognito, CDK) — not greenfield.

**Undecided:** native apps; automatic MCP token rotation; full `apps/agents` Go ADK service (roadmap only).

## Brand Commitments

- Product name: **Fuel** (Fuel 2.0); company: **York IE**.
- Voice: founder-friendly, plain language for CM; operational and scan-friendly for PM/admin.
- Identity constraints already in code: York navy / teal / gold; Inter + JetBrains Mono via theme tokens (`apps/web/src/lib/theme.ts`). Do not change palette without design evidence.
- External brand colors allowed only for third-party marks (HubSpot, Slack, Google OAuth, etc.).

## Evidence on Hand

- Live product UI and theme tokens in `apps/web`.
- Fixture/seed domain data for local development.
- Internal docs under `documents/` and `docs/runbooks/` (engineering/ops — not customer marketing proof).
- York IE help catalog (static + Super Admin playbook slug `york-help-catalog`).
- **Absent — do not fabricate:** customer testimonials, press quotes, pricing pages, independent benchmarks claimed as Fuel’s own.

## Product Principles

1. **Ground advice in evidence** — overviews, initiatives, and York help must come from profile, answers, documents, benchmarks, and approved catalogs.
2. **Respect the workspace** — PM and CM are different jobs; navigation and density should match the role, not a one-size dashboard.
3. **Account truth first** — identity and tenancy come from session; never from the client.
4. **Brand in precise details** — York tokens and voice, not decorative rebrands on every surface.
5. **Operate, don’t decorate** — app surfaces optimize for scanability, task completion, and trust over marketing theater.

## Accessibility & Inclusion

Theme muted colors already tuned toward WCAG AA contrast on light surfaces. Preserve visible focus, keyboard access on interactive controls, and do not disable pinch-zoom. No stricter product-specific standard was set beyond AA contrast and standard operable UI.
