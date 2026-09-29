# Overview Page — Implementation Knowledge Base

> **Audience:** Engineers maintaining or extending the company Overview tab in Fuel 2.0.  
> **Keep this doc current** when Overview features, APIs, or schema change.  
> **Related specs:** `document/cursor-prompt-overview-page.md` (original implementation prompt), Design sources under `Design/` (local, gitignored).

---

## 1. Overview

### Purpose

The **Overview** page is the founder home base after onboarding. It turns profile answers, track detail forms (R&D / GTM / G&A), and cohort benchmark metrics into an operating dashboard:

- An **AI advisor** summary with signal tags and recommended next actions
- Three **track glance cards** (R&D, GTM, G&A) with composite scores, focus copy, strengths/weaknesses
- **Drill-in category pages** for initiatives, intelligence, playbooks, and “your inputs”
- Drawers to **edit details**, **edit benchmarks**, and **add intelligence sources**

It is the default company tab for founder accounts (`isFounderHome`), not the PM portfolio shell.

### High-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ CompanyPublicView (tab=overview)                                 │
│   └── CompanyOverviewPage (client)                               │
│         ├── GET /api/company/:uuid/overview  (poll while gen.)   │
│         ├── OverviewAdvisorPanel + CategoryGlanceRow × 3         │
│         ├── CategoryDetailView (client nav, no route change)     │
│         └── Drawers: DetailAnswers · Benchmark · AddSources      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ lib/overview/*                                                   │
│   access → queries / sync / map-input / score / focus-narrative  │
│   generate (Bedrock) → normalize → persist → agent_runs          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Postgres (Drizzle)                                               │
│   overview_snapshots · overview_category_scores                  │
│   company_detail_answers · overview_playbook_suggestions         │
│   + company_intelligence / company_initiatives / playbooks       │
└──────────────────────────────────────────────────────────────────┘
```

**Split of concerns**

| Concern | Source of truth |
|--------|------------------|
| Numeric track scores | Deterministic (`score.ts`) — never trust AI numbers |
| Glance focus short description | Deterministic (`focus-narrative.ts`) |
| Recommended actions | Deterministic (`build-recommended-actions.ts`), recomputed on every GET |
| Advisor summary, strengths/weaknesses, insight, intelligence, initiatives | AI via Bedrock + `overview-generation` playbook |
| Playbook suggestions | AI slugs resolved against live catalog (`playbook-catalog.ts`) |

---

## 2. Implemented Features

### Overview cards and metrics

- **Page header** — “Benchmark overview” eyebrow, title, subtitle, Full benchmark CTA
- **Fuel AI · Advisor** — collapsible panel with:
  - AI summary
  - Recent signal tags (per track urgency)
  - Three recommended actions with CTAs
- **Three glance rows** (dev / mkt / rev):
  - Header bar: initiatives / intelligence / playbooks deep-links + update-details CTA
  - Score ring (0–100) with status label and contributor popover
  - Track name + full label + arrow
  - **Focus narrative** (short description under the title)
  - Primary strengths / Needs improvement lists

### Dynamic data integration

- Overview payload loaded from `GET /api/company/[uuid]/overview`
- Scores and focus lines derived from live answers + benchmark values + stored contributors
- Recommended actions rebuilt from live benchmark / sources / detail completeness on each load
- Category drill-in loads `GET .../overview/category/[categoryId]`
- Score ring popover loads `GET .../overview/score-breakdown/[categoryId]`

### Navigation to inner pages

- Clicking a glance row sets client `activeView` to `dev` | `mkt` | `rev` → `CategoryDetailView`
- Back control returns to glance overview (no Next.js route change)
- Header / widget links navigate company tabs (`intelligence`, `initiatives`, `research`) via `onNavigateTab` or `?tab=`

### Skeleton loading states

- **Initial fetch** (`loading && !data`): `OverviewPageSkeleton` — advisor + three glance placeholders using `MagicShimmer`
- **Generating** (`pending` / `running`): banner + embedded skeleton (`OverviewGeneratingState`)
- **Category detail** (no category yet): `CategoryDetailSkeleton`
- **Refetch / regenerate / drawer save**: keep existing paint until new data arrives (no flicker)

### Short descriptions for R&D, GTM, and G&A

Deterministic glance focus lines (Design `buildCategoryFocusNarrative`), e.g. when metrics are missing:

- **R&D:** *Product & engineering needs attention (N/100) — peers are pulling ahead. Log fte headcount and gross margin…*
- **GTM:** *Go-to-market needs attention… Log arr and logo retention…*
- **G&A:** *Ops & finance needs attention… Log cash on hand and monthly net burn…*

Rendered in `.sc-glance-focus` under each track title. Computed on GET and written on persist / answer sync.

### Drawers and forms

| Drawer | Purpose |
|--------|---------|
| **DetailAnswersDrawer** | Multi-step Profile → R&D → GTM → G&A answers; PATCH detail-answers (optional regenerate) |
| **BenchmarkEditDrawer** | Cohort metrics edit; GET/PATCH benchmark |
| **AddSourcesDrawer** | Title-only note or file upload into Data Room (`postDataRoomUpload`) |

### Loading, empty, success, and error states

| State | UI |
|-------|-----|
| Loading (no data) | Page skeleton |
| Fetch error | Message + Retry |
| Generation pending/running | Generating banner + skeleton; poll every 3s |
| Generation failed | Message + Retry generation |
| Empty (no advisor / categories) | “Generate your overview” CTA |
| Success | Advisor + glance rows (or category detail) |
| Category load error | “Could not load this track.” |

### Responsive behavior

- Advisor split collapses to a single column under ~960px (`scorecardCss.ts`)
- Glance layout stacks brief + insights on smaller breakpoints
- Category detail widgets (`sc-detail-widget--span-6`) go full-width on narrow viewports
- Drawers are full-height panels (ported Design patterns); portal to `document.body` with themed roots

---

## 3. Data Flow

### Where data comes from

1. **Onboarding / claim** — seeds detail answers from catalog onboarding snapshot; may enqueue overview generation
2. **`company_detail_answers`** — founder answers for profile + track questions
3. **Portfolio updates / observations** — benchmark metric values (`map-input` → `loadBenchmarkValuesForCompany`)
4. **Cohort benchmarks** — p25/p50/p75/p90 rows for scoring
5. **Bedrock generation** — narrative content persisted into overview tables + intelligence / draft initiatives / playbook suggestions
6. **Live recompute on read** — recommended actions + focus narratives

### API endpoints

| Endpoint | Methods | Role |
|----------|---------|------|
| `/api/company/[uuid]/overview` | GET | Main payload + generation status |
| `/api/company/[uuid]/overview/generate` | POST | Run generation; return payload |
| `/api/company/[uuid]/overview/regenerate` | POST | Same as generate (re-run) |
| `/api/company/[uuid]/overview/category/[categoryId]` | GET | Track detail payload |
| `/api/company/[uuid]/overview/score-breakdown/[categoryId]` | GET | Score contributors |
| `/api/company/[uuid]/overview/detail-answers` | GET, PATCH | Load / save detail answers |
| `/api/company/[uuid]/overview/benchmark` | GET, PATCH | Benchmark drawer |
| `/api/company/[uuid]/overview/approve-initiative` | POST | Draft → active initiative |
| `/api/internal/overview/generate` | POST | Worker for queued `agent_runs` (cron token) |

Also: onboard claim + company profile-actions can `enqueueOverviewJob` / `dispatchOverviewJob`.

### Generation pipeline

1. Enqueue or start `agent_runs` with kind `overview_generation`
2. Build model input (`map-input` + playbook catalog + cohort rows). Bedrock INPUT includes structured `company` (catalog + onboarding + `profile_*` answers) and optional `founderNarrative` from the latest portfolio update.
3. `generateOverviewAi` — Bedrock Converse + `record_overview` tool
4. `normalizeOverviewAiResponse` → Zod `OverviewAiResponseSchema`
5. `persistOverviewGeneration` — replace snapshot; write deterministic scores/focus; AI strengths/intel/initiatives/playbooks
6. Mark run complete / failed

### State management

- **Client:** local React state in `CompanyOverviewPage` (`data`, `loading`, `error`, `activeView`, drawer flags, advisor open)
- **No global Overview store** — refetch after mutations
- **Server:** Drizzle tables scoped by `accountId` + `companyUuid` (via `access.ts`)

### Backend → UI mapping (glance category)

| API / DB field | UI |
|----------------|-----|
| `categories[].score` / `statusLabel` | Score ring + status |
| `categories[].focusNarrative` | Short description under title |
| `categories[].strengths` / `weaknesses` | Insight columns |
| `categories[].intelligenceCount` etc. | Header bar counts / CTAs |
| `advisor.summary` / `signalTags` | Advisor left column |
| `advisor.recommendedActions` | Advisor right column CTAs |
| `generation.status` | Skeleton / generating / failed / content |

---

## 4. Components

### Page / layout

| Component | Responsibility |
|-----------|----------------|
| `CompanyOverviewPage` | Orchestrator: fetch, poll, regenerate, glance ↔ detail, drawers |
| `OverviewPageHeader` | Static header + Full benchmark |
| `OverviewGeneratingState` | Generating banner over embedded skeleton |
| `OverviewSkeletons` | `OverviewPageSkeleton`, `CategoryDetailSkeleton` |

### Glance surface

| Component | Responsibility |
|-----------|----------------|
| `OverviewAdvisorPanel` (`OverviewPanels.tsx`) | Advisor summary + tags + recommended actions |
| `CategoryGlanceRow` | One track card |
| `CategoryGlanceHeaderBar` | Counts / deep-links / update details |
| `GlanceScoreRing` | Ring + breakdown popover |
| `GlanceInsightsWrap` / `TrackInsightPanel` | Strength & weakness lists |
| `buildGlanceAnswersCta` | CTA label/tone from answer completeness |

### Category detail

| Component | Responsibility |
|-----------|----------------|
| `CategoryDetailView` | Full track dashboard (hero, widgets, inputs) |

### Drawers

| Component | Responsibility |
|-----------|----------------|
| `DetailAnswersDrawer` | Multi-step detail answers form (TS `drawerStyles`) |
| `BenchmarkEditDrawer` | Benchmark metrics form (TS `drawerStyles`) |
| `AddSourcesDrawer` | Data Room source upload / title note (TS `drawerStyles`) |

### Theme / styles

| Module | Responsibility |
|--------|----------------|
| `overview-theme.ts` | Design scorecard tokens via `OVERVIEW_THEME`; score tier + category accent helpers |
| `overviewTokens.ts` | PatriotPayJourney palette (`#3DD68C`, `#8FA99A`, …) — not York SIGNAL accent |
| `styles.ts` | CSSProperties helpers for page chrome (header, generating, tracks) |
| `drawerStyles.ts` | Drawer CSSProperties factories (detail / benchmark / sources) |
| `drawerShared.tsx` | Shared drawer portal shell, Escape hook, HoverBtn |
| `scorecardCss.ts` | Glance/advisor/detail class stylesheet as TypeScript |
| `OverviewStyleSheet.tsx` | Memoized inject of `overviewScorecardCss()` |

> **Note:** There is no standalone `.css` file for Overview. Drawer CSS class trees were removed; drawers use `drawerStyles` only. Client fetch helpers live in `lib/overview/client.ts`.

### Reusable patterns elsewhere

- `MagicShimmer` (`components/ai`) — skeleton bars
- Data Room upload helper used by Add Sources
- Company initiatives create/approve shared with Initiatives tab

---

## 5. Files Changed

### UI (`apps/web/src/components/company/overview/`)

| File | Why |
|------|-----|
| `CompanyOverviewPage.tsx` | Main Overview client page |
| `OverviewPageHeader.tsx` | Header chrome |
| `OverviewPanels.tsx` | Advisor panel |
| `CategoryGlanceRow.tsx` | Glance track row |
| `CategoryGlanceHeaderBar.tsx` | Glance actions |
| `GlanceScoreRing.tsx` | Score ring UI |
| `TrackInsightPanel.tsx` | Insights lists |
| `CategoryDetailView.tsx` | Track drill-in |
| `DetailAnswersDrawer.tsx` | Detail answers drawer |
| `BenchmarkEditDrawer.tsx` | Benchmark drawer |
| `AddSourcesDrawer.tsx` | Sources drawer |
| `OverviewGeneratingState.tsx` | Generating UX |
| `OverviewSkeletons.tsx` | Loading skeletons |
| `buildGlanceAnswersCta.ts` | CTA helper |
| `overview-theme.ts` | Theme helpers |
| `styles.ts` | CSSProperties helpers (page chrome, generating, tracks) |
| `drawerStyles.ts` | CSSProperties helpers for detail / benchmark / sources drawers |
| `drawerShared.tsx` | Shared drawer portal shell + Escape/HoverBtn |
| `CategoryDetailWidgets.tsx` | Track detail dashboard widgets |
| `scorecardCss.ts` | Overview stylesheet as TypeScript (replaces deleted `.css`) |
| `OverviewStyleSheet.tsx` | Memoized inject of tokenized stylesheet |

### Lib (`apps/web/src/lib/overview/`)

| File | Why |
|------|-----|
| `access.ts` | AuthZ for overview APIs |
| `client.ts` | Browser fetch helpers + score-breakdown cache |
| `cohort.ts` | Shared cohort/benchmark resolution |
| `post-generation.ts` | Shared generate/regenerate POST handler |
| `constants.ts` | Categories, metrics, weights, labels |
| `types.ts` | Zod + API types |
| `detail-question-catalog.ts` | Question catalog |
| `question-catalog.ts` | Deprecated re-export shim |
| `onboarding-field-map.ts` | Onboarding ↔ overview field map |
| `answer-scores.ts` | Detail answer scoring |
| `score.ts` / `score.test.ts` | Composite track scoring |
| `focus-narrative.ts` / `.test.ts` | Glance short descriptions |
| `build-recommended-actions.ts` | Deterministic advisor actions |
| `recommended-actions.ts` / `.test.ts` | Context loader + builder export |
| `benchmark-drawer-fields.ts` | Benchmark field definitions |
| `map-input.ts` | Input assembly for AI + scoring |
| `prompt.ts` | Prompt template load / hydrate |
| `generate.ts` | Bedrock generation |
| `normalize-ai-response.ts` / `.test.ts` | AI output coercion (incl. initiative titles) |
| `persist.ts` | Snapshot persistence |
| `run-overview-job.ts` | Job enqueue / dispatch / run |
| `sync-answers.ts` | Answer upsert + score refresh |
| `queries.ts` | Read models for APIs |
| `playbook-catalog.ts` | Playbook suggestion resolution |

### API routes

| Path | Why |
|------|-----|
| `.../overview/route.ts` | GET overview |
| `.../overview/generate/route.ts` | POST generate |
| `.../overview/regenerate/route.ts` | POST regenerate |
| `.../overview/category/[categoryId]/route.ts` | GET category detail |
| `.../overview/score-breakdown/[categoryId]/route.ts` | GET contributors |
| `.../overview/detail-answers/route.ts` | GET/PATCH answers |
| `.../overview/benchmark/route.ts` | GET/PATCH benchmarks |
| `.../overview/approve-initiative/route.ts` | POST approve draft |
| `.../internal/overview/generate/route.ts` | Worker endpoint |

### Schema / migrations / seed / entry points

| File | Why |
|------|-----|
| `db/schema.ts` | Overview tables + initiative/playbook columns |
| `db/migrations/0051_overview_page.sql` | Initial overview schema |
| `db/migrations/0052_company_initiatives_overview_cols.sql` | Initiative overview cols |
| `db/migrations/0053_overview_schema_align.sql` | Schema drift repair |
| `db/migrations/0054_overview_playbook_suggestions_cols.sql` | Suggestion `category_id` / `rank` |
| `db/seed-playbooks.ts` | `overview-generation` system playbook content |
| `CompanyPublicView.tsx` / `CompanyPageBody.tsx` | Mount Overview tab |
| `profile-actions.ts` / `onboard/claim/route.ts` | Trigger generation after profile/claim |
| `company-initiatives.ts` | Overview-sourced draft initiatives |

---

## 6. Design Decisions

### Following Design/

Primary reference: **`Design/src/app/ScorecardV2.tsx`** + styles from **`PatriotPayJourney.css`**.

| Design behavior | App implementation |
|-----------------|--------------------|
| Glance cards with ring + strengths/weaknesses | `CategoryGlanceRow` + CSS port |
| Deterministic focus narrative | `focus-narrative.ts` |
| Deterministic recommended actions | `build-recommended-actions.ts` |
| Composite scoring (benchmark/profile/detail weights) | `score.ts` (45 / 15 / 40) |
| Detail drawers / benchmark edit / sources | Matching drawers under `overview/` |
| Dark Design scorecard surfaces | `useOverviewTheme()` → `OVERVIEW_THEME` (PatriotPayJourney tokens) |
| Score-tier colors (non-York greens/ambers/reds) | `overviewScoreTierColor` (explicit design evidence) |

### Intentional deviations

1. **AI generates narrative content; numbers and CTAs stay deterministic** — avoids score drift and empty “Initiative” / blank focus lines when the model omits fields.
2. **Client-side glance ↔ detail navigation** — no dedicated `/overview/[category]` route; keeps company tab shell simple.
3. **`FounderOverview.tsx` exists but is unused** — live mount path is `CompanyPublicView` → `CompanyOverviewPage`.
4. **`generate` and `regenerate` are near-duplicates** — both re-run generation; kept for API clarity / callers.
5. **Initiative titles** — normalizer + prompt rules guarantee meaningful titles even if the model returns `"Initiative"`.
6. **Playbook run from Overview** — uses the same agent drawer pattern as other playbook runners (company uuid in prompt; no vague “which company?”).

---

## 7. Known Issues / Future Improvements

### Remaining work

- Consolidate `generate` vs `regenerate` if product only needs one verb
- Remove or wire `FounderOverview.tsx` if still unused
- Delete deprecated `question-catalog.ts` after import cleanup
- Optional: drop unused AI schema fields (`advisor.recommended_actions`, unused `focus_narrative`) once prompts stabilize
- Backfill / UX for companies stuck in `failed` generation with clearer recovery

### Technical debt

- Migrations `0052`–`0054` exist to repair early prototype drift — document when squash becomes possible
- Large scorecard stylesheet (`scorecardCss.ts`) still carries Design hard-coded mint/surface values for some accents; shared values live in `overviewTokens.ts`.
- `CategoryDetailView` is large; further widget splits only if reuse appears
- **Milestones:** Bedrock sometimes returned `"milestones": []` because the tool schema typed milestones as a bare array and the prompt did not require min items. Fixed via structured tool items + prompt rules + normalizer fallback (string milestones accepted; empty arrays get 2 derived steps). Re-seed `overview-generation` playbook (or regenerate Overview) so DB-stored prompts pick up the richer milestone instructions. AI fields map to `initiative_milestones` as `title→label`, `due_date→due_date`, `checked→status` (`todo`/`done`) via `createCompanyInitiative({ milestones })`.

### Potential optimizations

- Prefetch category detail on glance hover
- Cache score-breakdown per category for the session
- Prefer background-only generation in all environments (today falls back to inline when no cron token)
- Reduce Bedrock payload size (trim catalog / answers) if latency is high

---

## 8. Developer Notes

### Important implementation details

- **Always recompute scores** with `computeCategoryScore` on persist and after answer/benchmark changes — do not persist AI `score` as authoritative.
- **Focus narratives** must come from `buildCategoryFocusNarrative`; do not rely on empty AI `focus_narrative` for the glance UI.
- **Recommended actions** are rebuilt on GET — stale snapshot rows are OK for history, not for the advisor list.
- **Account scope:** all overview reads/writes go through `access.ts` and filter by `accountId` + `companyUuid`.
- **Overview initiatives** use `source: "overview"`, `status: "draft"` until approve; regenerating replaces prior overview drafts for that snapshot lifecycle (see `persist.ts`).

### Reusable patterns

- Deterministic helpers next to AI generation (score, focus, recommended actions, playbook resolve)
- `normalizeOverviewAiResponse` as a buffer for model shape drift before Zod
- Skeleton layouts that mirror real DOM structure (`OverviewSkeletons`)
- Design scorecard tokens (`overviewTokens` / `OVERVIEW_THEME`) + ported `sc-*` CSS for Overview-only surfaces

### Common pitfalls

- Showing skeletons on every refetch → flickers; only skeleton when `!data`
- Mapping Overview to York SIGNAL (`#00B48A`, washed `inkSoft`) — use `OVERVIEW_THEME` / Design CSS vars instead
- Inventing playbook slugs in prompts — always pass `playbook_catalog` and resolve server-side
- Forgetting to re-seed or hydrate initiative/title rules when changing the generation prompt
- Assuming `focusNarrative` in DB is enough — GET recomputes; tests should cover the builder

### Guidance for future contributors

1. Read Design `ScorecardV2.tsx` for UX intent before inventing new glance widgets.
2. Put business logic in `lib/overview/`, not in React components.
3. Add unit tests beside pure helpers (`*.test.ts` with `node:test`).
4. After API or async changes, run a **Sentry impact review** (capture unexpected 5xx; skip expected 4xx).
5. Update **this document** when you add drawers, endpoints, tables, or change the deterministic/AI split.
6. Run `npm run typecheck` / `npm run lint` from the repo root for `apps/web`.

### Quick test commands

```bash
# Focus narrative / score / normalize unit tests
cd apps/web && npx tsx --test src/lib/overview/*.test.ts

# Typecheck
npm run typecheck --workspace=apps/web
```

### Mount path (reminder)

```
apps/web/src/app/(app)/company/[uuid]/page.tsx
  → CompanyPageBody
    → CompanyPublicView (isFounderHome && tab === "overview")
      → CompanyOverviewPage
```

---

## Document history

| Date | Notes |
|------|--------|
| 2026-07-13 | Initial knowledge base covering Overview implementation (glance, detail, drawers, generation, skeletons, focus narratives). |
| 2026-07-13 | Removed `overview-scorecard.css`; styles live in `scorecardCss.ts` + `styles.ts` / `styleMaps.ts`. |
| 2026-07-14 | Production refactor: deleted dead `styleMaps.ts` + orphaned drawer CSS; shared `drawerShared` + `lib/overview/client.ts` + `cohort.ts`; split `CategoryDetailWidgets`; memoized stylesheet. |
| 2026-07-14 | Fast post-save refresh: enqueue AI regen in background, return updated overview from PATCH, soft regenerating banner (no full-page flicker). |

*When you change Overview behavior, append a short row here and update the relevant sections above.*