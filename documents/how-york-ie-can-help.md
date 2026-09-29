# How York IE Can Help — Plan, Catalog, and Implementation

> **Audience:** Engineers maintaining initiative generation, york_help copy, or the initiative drawer.  
> **Keep this doc current** when the approved service list, outcome statements, or generation paths change.  
> **Canonical code catalog (fallback):** `apps/web/src/lib/york-help/catalog-data.ts`  
> **Database catalog:** system playbook slug `york-help-catalog` — Super Admin editable JSON; loaded at generation time. Missing/invalid content falls back to the static list. Seeded with other system playbooks.

---

## 1. Purpose

Fuel already generates a **How York IE can help** block on initiatives. This work is a **stricter rewrite of that existing feature**, not a new surface.

**Before:** the model invented one selling sentence per milestone (~140 chars) and picked a service name from a short list.

**After:** pick **1–2 catalog services** for the initiative’s track. Show a **personalized title** for how York IE can help, then **one approved outcome refined** to this initiative and its milestones. End with the services-request CTA. Do not invent services not on the approved list.

```
[Title of how York IE can help]
[Approved outcome refined to this initiative and its milestones]

Talk to the York IE team → york.ie/services-request
```

---

## 2. Rules (source prompt)

When generating initiatives and milestones, include a **How York IE Can Help** section.

- Only reference services from the approved list below.
- Do not invent, paraphrase, or suggest services not on this list.
- Match service to initiative category:
  - R&D initiative (`category_id = dev`) → R&D services only
  - GTM initiative (`category_id = mkt`) → GTM services only
  - G&A initiative (`category_id = rev`) → G&A services only
- Suggest **1–2 services maximum**.
- `primary_service` is the catalog service name (grounding metadata, e.g. "Product Strategy"). Never `rd`, `gtm`, `ga`, R&D, GTM, or G&A.
- `title` is the **visible heading** — a short founder-facing title for how York IE can help with this initiative.
- `help` starts from one approved outcome and is refined to this initiative and its milestones.
- `track` is metadata only (`rd` if `category_id` is `dev`, `gtm` if `mkt`, `ga` if `rev`) — not the title.
- End with: `Talk to the York IE team → york.ie/services-request`

CTA URL: `https://york.ie/services-request/`

---

## 3. Where it belongs

Fuel generates initiatives (and nested `york_help`) in three paths. All three must use the same rules and catalog.

```
Overview generation  ─┐
Document / HubSpot   ─┼─► company_initiatives.york_help ─► Initiative drawer (YorkHelpPanel)
Manual create / edit ─┘
```

### 3.1 Overview suggested initiatives

| Piece | Location |
|---|---|
| Runtime | `apps/web/src/lib/overview/generate.ts` |
| System playbook | slug `overview-generation` — `DEFAULT_OVERVIEW_GENERATION_PROMPT` in `apps/web/src/lib/system-playbooks/defaults.ts` |
| Extra rules | `hydratePrompt()` strips any baked-in catalog from the playbook template, then appends one live `yorkHelpPromptAppendix()` in `initiativeRules` |
| Tool schema | `york_help` on `suggested_initiatives` in `generate.ts` (1–2 bullets; `primary_service`, `help`, `track`) |
| Normalize | `coerceYorkHelpFromRaw()` in `apps/web/src/lib/overview/normalize-ai-response.ts` |
| Persist | `apps/web/src/lib/overview/persist.ts` |

### 3.2 Document and HubSpot initiative jobs

| Piece | Location |
|---|---|
| Runtime | `apps/web/src/lib/initiatives/from-document.ts` (`document_initiative_generation`, `hubspot_initiative_generation`) |
| System playbook | slug `document-initiative-generation` — `DEFAULT_DOCUMENT_INITIATIVE_GENERATION_RULES` |
| Catalog inject | `buildSystemPrompt()` strips baked-in copies, then appends one live `yorkHelpPromptAppendix()` |
| HubSpot enqueue | `apps/web/src/lib/integrations/hubspot-intelligence.ts` → same generator |

### 3.3 Manual create / update (background job)

When a founder saves an initiative without nested york_help, `initiative-actions.ts` calls `scheduleYorkHelpRegeneration` → `regenerate.ts` → `generate.ts`.

| Piece | Location |
|---|---|
| System playbook | slug `york-help-generation` — `DEFAULT_YORK_HELP_GENERATION_PROMPT` |
| User payload | category-scoped catalog + approved outcomes (not names only) |
| Triggers | Manual create; update if title/description/pillar/milestones/etc. change; accept suggested initiative **only if** `york_help` is missing |

### 3.4 Display (initiative drawer only)

`YorkHelpPanel` in `apps/web/src/components/company/initiatives/YorkHelpPanel.tsx`, rendered from `InitiativesTab.tsx`.

- Heading = **personalized title** (`title`, falling back to catalog service name)
- Body = **approved outcome refined** to the initiative (`help`)
- CTA label always `Talk to the York IE team → york.ie/services-request`

Same payload is mapped in `CompanyPageBody.tsx` and `GET /api/company/[uuid]/initiatives`.

### 3.5 Super Admin playbook rows

Runtime loads DB content via `loadSystemPlaybookTemplate()`, falling back to `defaults.ts`. Seed updates playbook content when it differs from `defaults.ts`.

In deployed envs, confirm these System playbooks after deploy/seed:

- Overview Page Generation
- Document Initiative Generation
- York Help Generation
- York Help Service Catalog (`york-help-catalog` — JSON `{ dev, mkt, rev }` of `{ name, outcomes }`)

Changing `defaults.ts` alone does not update existing DB rows until seed (or a Super Admin edit) runs. Re-seed **overwrites** Super Admin edits when seed content differs (same as overview).

---

## 4. Where it does **not** belong

These mention York, R&D/GTM/G&A, or “initiatives,” but they are **not** initiative/milestone York-help generation.

| Surface | Why skip |
|---|---|
| `york-partner/` + Overview/Sidebar York partner chips | Scorecard marketing; different copy catalog (`DEFAULT_CHIP_HEADLINES`) |
| Intelligence generation / context extraction | Insights only; no york_help |
| Overview brief analysis | Cohort paragraphs, not initiatives |
| Onboard benchmark Initiative cards | Chat cards, not persisted `company_initiatives` |
| Agent default system / playbook runs | General assistant; would invent services |
| Agent skills `listInitiatives` / `getInitiative` / `getCompanyInitiatives` | Read existing rows; do not generate help |
| Suggested playbooks on overview | Playbook slugs, not York services |
| Weekly digest email CTA | Separate “Talk to York IE” email copy |

---

## 5. What changed in code

### Shared catalog (system playbook + static fallback)

Runtime loads the `york-help-catalog` system playbook via `loadYorkHelpServiceCatalog()` (`apps/web/src/lib/york-help/load-catalog.ts`).

- Playbook content is JSON: `{ "dev": [{ "name", "outcomes" }], "mkt": [...], "rev": [...] }`.
- Super Admin edits it the same way as Overview Page Generation.
- If the playbook is missing, empty, or not valid JSON, use `YORK_HELP_SERVICE_CATALOG` in `catalog-data.ts`.
- A category omitted from the JSON falls back to that category’s static list.
- Seed is `buildSystemPlaybookSeeds()` (same path as overview) — no dedicated table or seeder.

`catalog-data.ts` still holds:

- Static service names + approved outcome statements
- `serializeYorkHelpCatalog()` / `parseYorkHelpCatalogContent()`
- `mergeYorkHelpServiceCatalog()` — override rows + per-category static fallback
- `coerceYorkHelpFromRaw()` / `catalogFallbackYorkHelp()` / `yorkHelpPromptAppendix()` — accept an optional live catalog

Constants in `apps/web/src/lib/york-help/constants.ts`:

| Constant | Value |
|---|---|
| `YORK_HELP_SECTION_TITLE` | `How York IE can help` |
| `YORK_HELP_CTA_LABEL` | `Talk to the York IE team → york.ie/services-request` |
| `YORK_HELP_CTA_URL` | `https://york.ie/services-request/` |
| `YORK_HELP_MAX_SERVICES` | `2` |

### Stored JSON shape

`company_initiatives.york_help` is unchanged at the field level:

```json
{
  "section_title": "How York IE can help",
  "bullets": [
    {
      "milestone": "Marketing Strategy",
      "help": "ICP and segmentation grounded in customer and pipeline data",
      "primary_service": "Marketing Strategy",
      "track": "gtm"
    }
  ],
  "cta_label": "Talk to the York IE team → york.ie/services-request"
}
```

- `bullets`: **1–2 services**, not one per milestone
- `help`: approved outcome statement
- `milestone`: mirrors `primary_service` for stored-shape compatibility (UI no longer shows it)

Existing saved rows keep old invented copy until the next generate/regenerate.

### Files touched

| File | Change |
|---|---|
| `apps/web/src/lib/york-help/load-catalog.ts` | Load `york-help-catalog` playbook with static fallback |
| `apps/web/src/lib/system-playbooks/slugs.ts` | Slug `york-help-catalog` |
| `apps/web/src/lib/york-help/catalog-data.test.ts` | Unit tests for coerce/fallback/parse |
| `apps/web/src/lib/york-help/catalog.ts` | Re-export catalog-data |
| `apps/web/src/lib/york-help/constants.ts` | New CTA label; max services |
| `apps/web/src/lib/york-help/types.ts` | Max 2 bullets |
| `apps/web/src/lib/york-help/fallback.ts` | Approved outcomes instead of invented templates |
| `apps/web/src/lib/york-help/generate.ts` | Category catalog in user payload; coerce output |
| `apps/web/src/lib/system-playbooks/defaults.ts` | Generation playbooks + `york-help-catalog` JSON seed |
| `apps/web/src/lib/system-playbooks/inventory.ts` | Inventory notes |
| `apps/web/src/lib/overview/prompt.ts` | Hydrate appends catalog appendix |
| `apps/web/src/lib/overview/generate.ts` | Tool schema 1–2 services |
| `apps/web/src/lib/overview/types.ts` | Max 2 bullets; milestone optional on input |
| `apps/web/src/lib/overview/normalize-ai-response.ts` | Coerce + catalog fallback |
| `apps/web/src/lib/overview/persist.ts` | Milestone fallback to service name |
| `apps/web/src/lib/initiatives/from-document.ts` | Catalog appendix + tool schema |
| `apps/web/src/components/company/initiatives/YorkHelpPanel.tsx` | Service name + approved outcome + new CTA |
| `apps/web/src/db/schema.ts` | Comment on 1–2 service bullets |
| `apps/web/package.json` | Register catalog-data unit test |

---

## 6. Approved service catalog + outcome statements

Copy `help` **exactly**. The model may choose only one outcome per selected service.

### R&D (`dev` / track `rd`)

**Product Strategy**

- Clear prioritization frameworks that reduce unnecessary development work
- Roadmap planning, architecture guidance, and product-market alignment

**AI Transformation**

- End-to-end AI strategy, adoption, and implementation embedded into your product and workflows
- AI features built into your product that differentiate it and drive customer retention

**AI, ML & Data Science**

- Custom ML models, LLMs, RAG pipelines, NLP, and Generative AI features built for production

**Full Lifecycle Software Development**

- MVP builds, feature delivery, modernization, and integrations with full-stack engineering support
- Accelerate roadmap execution and deliver MVPs and new features faster to capture revenue sooner

**QA Engineering & Automation**

- Automated test suites, release process design, and quality frameworks that reduce bugs and downtime

**DevOps**

- CI/CD pipelines, cloud infrastructure, serverless architecture, and infrastructure-as-code

**UX Design**

- Research, wireframing, prototyping, and high-fidelity design across web, mobile, and hybrid environments

**BI & Data Engineering**

- Data lakes, ETL pipelines, analytics dashboards, and business intelligence infrastructure

**Technical Assessment** *(added in this change; was missing from the old name-only catalog)*

- Fast, rigorous evaluations of software architecture, code quality, security posture, and engineering processes

**Tech Due Diligence**

- Pre-acquisition technical assessment, architecture review, code quality analysis, and risk reporting

**Mobile Apps**

- Native and hybrid iOS and Android applications, React Native, and cross-platform development

### GTM (`mkt` / track `gtm`)

**Marketing Strategy**

- ICP and segmentation grounded in customer and pipeline data
- Integrated channel strategy with clear priorities and ownership
- Marketing investments aligned to pipeline and revenue goals

**Sales & RevOps Strategy**

- GTM motion mapped to your business stage — product-led, sales-led, or hybrid

**Revenue Operations**

- Aligned sales, marketing, and customer success teams optimizing revenue generation
- Streamlined processes, clear reporting, and optimized technology across the revenue team

**CRM Architecture & Administration**

- CRM configured for how your sales motion actually works, with clean data and accurate forecasting

**Content Strategy & SEO**

- Organic growth engine built on keyword strategy, pillar content, and a production workflow that runs consistently

**Paid Media & Demand Generation**

- Paid channels, landing pages, and attribution infrastructure so pipeline is predictable and CAC is controlled

**Website Development & Optimization**

- B2B SaaS websites built for conversion — turning visits into qualified pipeline

**Email & Marketing Automation**

- Automated nurture sequences and lifecycle campaigns that convert without manual effort

**GTM Automation & AI**

- AI agents deployed across GTM workflows to compound output without adding headcount

**GTM Systems Assessments**

- Structured audit of current GTM strategy, tools, and integrations with a prioritized action plan

### G&A (`rev` / track `ga`)

**Accounting & Bookkeeping**

- Reliable month-end closes delivered on schedule with accurate, audit-ready financials
- Clean books, documented processes, and reliable controls ready for fundraising and diligence

**Financial Reporting**

- Consistent, trusted view of financial performance for leadership and investors every month

**FP&A and Strategic Finance**

- Rolling forecast and financial model that turns raw numbers into decisions
- Investor-grade financial models, dashboards, and materials for capital raises and board reporting

**Operational Finance Support**

- Foundational accounting and financial planning with strategic insights for confident decision-making

**Fundraising Prep**

- Investor-ready financial model, data room, and narrative aligned for diligence and capital raises

**Corporate Strategy**

- Annual operating plan tied to real books, with OKRs connected to business outcomes

---

## 7. Display format (per service)

```
[Title of how York IE can help]
[One approved outcome statement from the list above refined to this initiative and its milestones]
```

End with:

```
Talk to the York IE team → york.ie/services-request
```

---

## 8. Notes

- `documents/overview_final_prompt.md` is a captured Bedrock request dump. It still contains the **old** one-bullet-per-milestone york_help rules. It is **not** loaded at runtime; this file is the living spec.
- Invalid `york-help-catalog` JSON is captured as a Sentry warning and generation uses the static catalog.
