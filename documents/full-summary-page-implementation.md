# Full Summary Page (F20A-134) — Implementation Knowledge Base

> **Audience:** Engineers maintaining or extending the Wikipedia-style company brief on Overview.  
> **Ticket:** [F20A-134](https://yorkdocs.atlassian.net/browse/F20A-134) — *Detailed wikipedia like summary on overview tab*  
> **Epic:** [F20A-106](https://yorkdocs.atlassian.net/browse/F20A-106) — Overview Page  
> **Keep this doc current** when full-summary UI, APIs, AI prompts, or cache keys change.  
> **Related:** `documents/overview-page-implementation.md`, Design `Design/src/app/ScorecardV2.tsx` + `PatriotPayJourney.css`

---

## 1. Purpose

On the company **Overview** tab, the advisor panel shows a compact deterministic/AI summary plus:

- **Full summary** (pill button)
- **View full summary with references** (text link)

Either control opens a **full-page investor-style brief** that **replaces** the Overview grid (advisor + glance tracks). It is **not** a modal.

The page synthesizes:

| Section | Data source |
|--------|-------------|
| Masthead | Company name + today’s date (US short) — **no page-level h1** |
| About | Profile answers + catalog meta |
| Snapshot | Benchmark drawer metrics vs cohort percentiles |
| Cohort position | **AI** (2–3 paragraphs) |
| Areas to watch | **AI** (≤2 rows) |
| Capital & runway | Cash, burn, runway from benchmark |
| Operating profile | Answered R&D / GTM / G&A detail questions |
| Initiatives roadmap | Active initiatives by pillar (excludes draft/suggested) |
| Sources | Data-room docs + numbered wiki references |

**Out of scope (ticket):** Notes section, executive lede, rendering wiki `sections` body on the full page, scorecard grid CRUD, benchmark wizard UI.

---

## 2. Entry points & navigation

### UI entry

| Control | Location | Handler |
|--------|----------|---------|
| `Full summary` | Advisor summary title row | `onOpenFullSummary()` |
| `View full summary with references` | Under compact summary | `onOpenFullSummary()` |

Files:

- `apps/web/src/components/company/overview/OverviewPanels.tsx` — advisor buttons
- `apps/web/src/components/company/overview/CompanyOverviewPage.tsx` — owns `fullSummaryOpen` / `fullSummaryHighlightRefId`

### Open / close rules

| When | Behavior |
|------|----------|
| Open | `fullSummaryOpen = true`; page renders `OverviewFullSummaryPage` instead of advisor + tracks |
| Escape | Closes full page |
| Breadcrumb **Overview** | Closes full page |
| Leave Overview (category drill-in) | Auto-closes full page |
| Print / Save as PDF | `window.print()` |
| Optional `highlightRefId` | Scrolls/highlights `#wiki-ref-{id}` in Sources |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ CompanyOverviewPage                                              │
│   fullSummaryOpen ? OverviewFullSummaryPage : Advisor + Tracks   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ fetchFullSummary(uuid, name)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ GET /api/company/[uuid]/overview/full-summary?name=…             │
│   requireOverviewAccess → loadFullSummaryPayload                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
  Deterministic assemble   Catalog / intel /   Bedrock brief
  (snapshot, ops, roadmap, initiatives, docs   analysis + cache
   references)             data-room
```

### Key files

| Path | Role |
|------|------|
| `components/company/overview/OverviewFullSummaryPage.tsx` | Full-page UI (Design port) |
| `components/company/overview/OverviewPanels.tsx` | Entry buttons |
| `components/company/overview/CompanyOverviewPage.tsx` | Open state + view switch |
| `components/company/overview/scorecardCss.ts` | `sc-investor-brief-*`, breadcrumb, print |
| `lib/overview/full-summary-types.ts` | Payload / section types |
| `lib/overview/full-summary-assemble.ts` | Snapshot rows, runway, ops groups, refs, initiative helpers |
| `lib/overview/load-full-summary.ts` | Server assemble + call AI |
| `lib/overview/brief-analysis.ts` | Bedrock Converse + enrichment cache |
| `lib/overview/client.ts` | `fetchFullSummary()` |
| `app/api/company/[uuid]/overview/full-summary/route.ts` | GET handler |

### Design source (visual / UX)

| Design path | What to copy |
|-------------|--------------|
| `Design/src/app/ScorecardV2.tsx` ~3292 | `OverviewFullSummaryPage` (`sc-wiki-full-page`) |
| Same file ~4350 | Entry buttons in advisor |
| Same file ~5680 | `wikiSummaryOpen` replaces grid |
| `Design/src/app/PatriotPayJourney.css` ~14108, ~18067, ~19159 | Breadcrumb, brief, print |

---

## 4. API contract

### `GET /api/company/[uuid]/overview/full-summary`

- **Auth:** `requireOverviewAccess(uuid)` (session + account; catalog scoped)
- **Query:** optional `name` — fallback display name if catalog missing
- **Runtime:** `nodejs`, `force-dynamic`
- **Errors:** expected 401/403/404 not captured; unexpected → `Sentry.captureException` → 500

### Response shape (`FullSummaryPayload`)

See `lib/overview/full-summary-types.ts`:

- Identity: `companyName`, `reportDate`, `period`, `cohortLabel`
- About: `profileMeta`, `productDescription`, `topPriorities`, `biggestRisk`, `publicDataCorrections`
- Snapshot: `snapshotRows[]` (`id`, `label`, `you`, percentiles, `band`, `tier`, `isStrong`, `colour`)
- Capital: `cashOnHand`, `monthlyBurn`, `runwayMonths`
- Ops: `operatingGroups[]`
- Roadmap: `initiatives[]`, `categories[]` (pillar defs)
- Sources: `documents[]`, `references[]`
- AI: `analysis` (`cohortPosition.paragraphs`, `areasToWatch`), `analysisStatus` (`ready` \| `skipped` \| `error` \| `loading`), `analysisError`

---

## 5. Deterministic assembly

### Snapshot

Built from `loadBenchmarkDrawerPayload` + `BENCHMARK_DRAWER_FIELDS`:

- Parse typed values via `parseBenchmarkDrawerValue`
- Tier via `tierFromPercentile` (respects `lowerIsBetter`)
- Band labels: Top decile · Above median · Around median · Below median · Below cohort
- Includes efficiency extras already on the drawer (CAC payback, burn multiple, Rule of 40, etc.)

### Runway

`cash_on_hand ÷ monthly_net_burn` when both parse and burn &gt; 0 (`estimateRunwayMonths`).

### About

| Field | Source |
|-------|--------|
| Product description | `profile_product_description` → catalog `shortDescription` |
| Top priorities / risk / corrections | detail answers |
| Sector / HQ / team / domain | `catalog_companies` |

### Operating profile

`TRACK_DETAIL_SECTIONS` + `getVisibleQuestions` — **answered rows only**, stacked R&D → GTM → G&A.

Pillar definitions (roadmap cards):

- **R&D:** product/tech foundation  
- **GTM:** sell and grow  
- **G&A:** run the business (cash, runway, finance)

### Initiatives

Load `company_initiatives` for company; map pillar from `overviewCategoryId` or `area` (`product`→dev, `gtm`→mkt, `finance|ops|people`→rev). Exclude `draft` / `suggested`. Sort by due then title.

### Sources / references

Order roughly: profile → ARR → NRR (or first metric) → up to 4 intelligence → up to 3 documents → up to 2 detail snippets → optional challenges.

---

## 6. AI — Cohort position & Areas to watch

### When to call

- Snapshot has **≥1** logged metric
- Otherwise: `analysisStatus: "skipped"`, hide analysis sections (or empty-state only)

### Implementation

`lib/overview/brief-analysis.ts`:

- Model: `BEDROCK_EXTRACTOR_MODEL_ID` (default Haiku)
- Tool: `record_brief_analysis` (structured JSON via Converse tool use)
- System / user prompts match Jira F20A-134 Part 5b (third person, no invented numbers, ≤2 areas to watch)
- One retry on failure; then error to client
- Sentry: `captureIntegrationException` with `integration: "bedrock"`, `operation: "overview_brief_analysis"`

### Cache

`enrichment_cache` via `cachedFetch`:

| Field | Value |
|-------|--------|
| `source` | `overview:brief_analysis` |
| `subjectKey` | `{companyUuid}:{period}:{fingerprint}` |
| Success TTL | 30 days |
| Error TTL | 5 minutes |

**Fingerprint:** hash of sorted `id:you:tier` from snapshot rows (`snapshotFingerprint`). Changing benchmark values changes the key → natural invalidation (no explicit delete required).

### Client loading UX

- While request in flight: “Loading full summary…” / “Generating analysis…”
- On AI error with metrics present: *Analysis unavailable — refresh or try again later.*
- Do **not** use Design’s local template copy (`buildInvestorStandCopy`) in production path

### Input JSON (conceptual)

Assembled in `load-full-summary.ts`:

```json
{
  "company": { "name", "sector", "headquarters", "teamSize", "domain", "productDescription", "topPriorities", "biggestRisk", "publicDataCorrections" },
  "period": "2026-q2",
  "cohort": { "label", "description" },
  "snapshot": {
    "metrics": [{ "key", "label", "value", "band", "tier", "percentiles": { "p25", "p50", "p75", "p90" } }],
    "runwayMonths", "cashOnHand", "monthlyBurn"
  },
  "founderNarrative": { "notableCustomers", "notableHires", "biggestChallenges", "otherUpdates" },
  "trackContext": {
    "rdCompletionPct", "gtmCompletionPct", "gaCompletionPct",
    "sampleDetailAnswers": [{ "track", "label", "value" }]
  }
}
```

### Output JSON

```json
{
  "cohortPosition": { "paragraphs": ["…", "…"] },
  "areasToWatch": [{ "title": "Metric (value)", "detail": "…" }]
}
```

---

## 7. CSS / theme

Styles live in `overviewScorecardCss()` inside `scorecardCss.ts` (injected by `OverviewStyleSheet`).

Important classes:

- `sc-investor-brief sc-wiki-full-page`
- `sc-scorecard-breadcrumb-*`
- `sc-investor-brief-masthead*`, `-block`, `-table*`, `-band--{tier}`, `-ops*`, `-roadmap*`, `-init-*`, `-sources`, `-refs`
- `@media print` rules for clean PDF

Theme rules:

- Prefer CSS vars already bound on `.fuel-overview` (`--accent`, `--text-*`, `--border`, `--surface-*`, `--status-*`)
- Do not reintroduce York hex (`#284256`, `#00B48A`, `#ECD67F`) for new rules

Obsolete (kept for now): modal overlay classes `sc-wiki-summary-overlay` / `-panel` from the pre-F20A-134 stub — safe to delete in a cleanup pass.

---

## 8. Client helper

```ts
import { fetchFullSummary } from "@/lib/overview/client";

const payload = await fetchFullSummary(companyUuid, companyName);
```

Hits `/api/company/${uuid}/overview/full-summary?name=…` with `cache: "no-store"`.

---

## 9. QA checklist

- [ ] Full summary opens in-page (replaces grid), not a modal
- [ ] No h1 company title; name only in masthead
- [ ] Escape + breadcrumb return to Overview
- [ ] Print / Save as PDF works
- [ ] Empty snapshot: no AI call; analysis sections skipped; empty snapshot copy shown
- [ ] With metrics: Cohort position shows 2–3 paragraphs; Areas to watch ≤2 rows
- [ ] AI error shows fallback line
- [ ] Cache: reopen without benchmark change does not re-call Bedrock (same fingerprint)
- [ ] After benchmark edit: new fingerprint → fresh analysis on next open
- [ ] Notes section absent; no executive lede
- [ ] Initiatives exclude draft/suggested; pillars show Blind spot / Thin / Healthy
- [ ] Sources list docs + numbered refs; highlight ref scroll works when `highlightRefId` set

---

## 10. Sentry impact

| Path | Behavior |
|------|----------|
| Full-summary route unexpected throw | `Sentry.captureException` → 500 |
| Bedrock / parse failure | `captureIntegrationException` (`bedrock` / `overview_brief_analysis`) |
| Expected auth/validation 4xx | Do **not** capture |

No Sentry config (`options.ts`, instrumentation, CDK DSN) changes required for this feature.

---

## 11. Branch / delivery notes (dev-loop)

- Branch used: `feat/F20A-134-detailed-wikipedia-like-summary`
- Design checked under repo `Design/` (not `/tmp/fuel-design`)
- Gerrit push skipped when developer pushes manually
- Conventional commit should reference `Refs: F20A-134`

---

## 12. Follow-ups / known gaps

1. **Manual browser QA** still required against real company data + Bedrock env.
2. Optional: stream AI separately so deterministic sections paint before analysis finishes (today the GET waits for Bedrock).
3. Optional: drop unused modal CSS after confirming no other consumers.
4. Optional: extend main Overview GET with brief extras to avoid a second round-trip (current design uses dedicated full-summary endpoint — clearer boundary).

---

## 13. Quick mental model

> Compact advisor blurb ≠ full brief.  
> Full brief = **read-only aggregation** + **one cached Bedrock call** for cohort narrative.  
> Open replaces Overview; Escape/breadcrumb restores it.
