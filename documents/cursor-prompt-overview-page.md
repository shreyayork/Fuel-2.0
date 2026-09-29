# Cursor Prompt: Overview Page — Full Frontend + Backend Implementation

## Context

You are implementing the **Overview page** (the default tab after onboarding) for a SaaS startup intelligence platform called **Fuel 2.0**. This page is the company home base — it combines onboarding answers (profile, R&D, GTM, G&A forms, and benchmark numbers) with AI-generated analysis to produce a comprehensive operating dashboard for startup founders.

**CRITICAL**: This is a different codebase from the design reference (shreyayork/Fuel-2.0). You must create everything from scratch — frontend components, backend APIs, and DB schema. But the **design must look exactly like the reference**. Scan the existing project's DB tables (Drizzle ORM) before creating new ones — reuse existing columns and foreign keys. Do NOT duplicate tables that already exist for intelligence, initiatives, playbooks, or category forms.

---

## Part 1: Overview Page Architecture

### 1.1 Page Structure

The Overview page has TWO main views:

**A) Overview (default)** — Shows all 3 categories at a glance:
```
┌─────────────────────────────────────────────────────────────────┐
│ ✦ Fuel AI · Advisor                               [Company]    │
│ ┌───────────────────────────────┬──────────────────────────────┐│
│ │ Summary (AI-generated)        │ Recommended Actions          ││
│ │ - Company context paragraph   │ 1. Complete Benchmark  → CTA ││
│ │ - Profile/benchmark/intel %   │ 2. Add Sources         → CTA ││
│ │ [R&D ● Stable] [GTM ● 2 new] │ 3. Complete Details    → CTA ││
│ │ [G&A ● Watch]                 │                              ││
│ └───────────────────────────────┴──────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [2 initiatives →] [5 intelligence →] [3 playbooks →]       │ │
│ │ ┌──────────┐                                               │ │
│ │ │  Score    │ R&D · Research and Development →              │ │
│ │ │  Ring     │ Focus narrative (AI-generated)                │ │
│ │ │  72/100   │                                              │ │
│ │ └──────────┘ ┌─Primary strengths──┐ ┌─Needs improvement──┐│ │
│ │              │ • Strength 1       │ │ • Weakness 1        ││ │
│ │              │ • Strength 2       │ │ • Weakness 2        ││ │
│ │              └────────────────────┘ └─────────────────────┘│ │
│ │                                     [Update R&D details →] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ (Same pattern for GTM and G&A rows)                             │
└─────────────────────────────────────────────────────────────────┘
```

**B) Category Detail (drill-in)** — When user clicks a category row:
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Overview                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [2 initiatives →] [5 intelligence →] [3 playbooks →]       │ │
│ │ Score Ring 72/100  │  R&D · Research and Development       │ │
│ │ Leading Cohort     │  Focus narrative (AI summary)         │ │
│ │                    │  Context chips                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─Track insights──────────┐ ┌─Initiatives────────────────────┐ │
│ │ What's working           │ │ [Active | Suggested · 2]       │ │
│ │ • Strength chip 1        │ │ Initiative 1 [Add →]           │ │
│ │ • Strength chip 2        │ │ Why: gap reason                │ │
│ │ • Strength chip 3        │ │ Initiative 2 [Add →]           │ │
│ └──────────────────────────┘ └────────────────────────────────┘ │
│                                                                 │
│ ┌─Intelligence─────────────┐ ┌─Playbooks────────────────────┐ │
│ │ Growth · ARR $500K       │ │ ┌─Launch Signal Review──────┐ │ │
│ │ Retention · NRR 108%     │ │ │ Evaluates ship cadence... │ │ │
│ │ ...                      │ │ │ [Run playbook →]          │ │ │
│ │ [Open in Intelligence →] │ │ └──────────────────────────┘ │ │
│ └──────────────────────────┘ └────────────────────────────────┘ │
│                                                                 │
│ ┌─Your inputs──────────────────────────────────────────────────┐│
│ │ R&D details (8 of 13 answered)    │ Benchmark gaps           ││
│ │ ┌─Needs review──────────────┐     │ ┌─Monthly burn─────────┐││
│ │ │ Ship cadence: Ad hoc      │     │ │ $80K · Below median  │││
│ │ │ [Missing] Delivery const. │     │ └──────────────────────┘││
│ │ └───────────────────────────┘     │ [Edit benchmark →]      ││
│ │ ┌─On track──────────────────┐     │                          ││
│ │ │ Product stage: Launched   │     │                          ││
│ │ │ AI role: Core             │     │                          ││
│ │ └───────────────────────────┘     │                          ││
│ │ [Edit answers →]                  │                          ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
Onboarding (profile + R&D/GTM/G&A forms + benchmark numbers)
    ↓
POST /api/overview/generate (all form answers + benchmark values)
    ↓
AI generates structured JSON response:
    ├── advisor_summary (text + signals tags + recommended actions)
    ├── category_scores[3] (R&D, GTM, G&A — each with score, narrative, strengths, weaknesses)
    ├── intelligence[] (tagged to categories)
    ├── suggested_initiatives[] (tagged to categories, draft status)
    └── suggested_playbooks[] (from the playbook catalog)
    ↓
Stored in DB → Rendered on Overview page
```

---

## Part 2: AI Generation — The Overview Playbook

### 2.1 Overview Generation is a Playbook

The AI prompt that generates the overview is stored in the `playbooks` table as a system playbook (not user-visible in the catalog). This allows updating the prompt without code changes.

```sql
-- Seed this playbook
INSERT INTO playbooks (id, slug, name, category, kind, description, prompt_template, is_system, is_visible)
VALUES (
  gen_random_uuid(),
  'overview-generation',
  'Overview Page Generation',
  'System',
  'Generation',
  'Generates the full overview page analysis from onboarding data',
  '<prompt_template — see section 2.2>',
  true,
  false
);
```

### 2.2 AI Prompt Template

The prompt template receives all onboarding data as variables. Store this in the `prompt_template` column:

```
You are Fuel AI, an advisor for startup founders. You receive a company's profile, category form answers (R&D, GTM, G&A), and benchmark numbers. Generate a comprehensive analysis.

COMPANY CONTEXT:
- Company: {{company_name}}
- Sector: {{sector}}
- Stage: {{journey_stage}}
- Employees: {{employees}}
- Headquarters: {{headquarters}}

PROFILE ANSWERS:
- Product description: {{profile_product_description}}
- Top 3 priorities: {{profile_top_priorities}}
- Public data corrections: {{profile_public_data_wrong}}
- Biggest risk: {{profile_biggest_risk}}

R&D (DEVELOPMENT) ANSWERS:
{{#each dev_answers}}
- {{label}}: {{value}}
{{/each}}

GTM (GO-TO-MARKET) ANSWERS:
{{#each mkt_answers}}
- {{label}}: {{value}}
{{/each}}

G&A (GENERAL & ADMIN) ANSWERS:
{{#each rev_answers}}
- {{label}}: {{value}}
{{/each}}

BENCHMARK NUMBERS:
- ARR: {{arr}}
- ARR Growth YoY: {{arr_growth}}
- Net Revenue Retention: {{nrr}}
- Logo Retention: {{logo_retention}}
- Gross Margin: {{gross_margin}}
- Monthly Net Burn: {{monthly_burn}}
- Cash on Hand: {{cash_on_hand}}
- FTE Headcount: {{headcount}}
- Paying Customers: {{paying_customers}}

COHORT PERCENTILES (for comparison):
| Metric | P25 | P50 | P75 | P90 |
|--------|-----|-----|-----|-----|
| ARR | $150K | $500K | $1.2M | $2.5M |
| ARR Growth | 120% | 200% | 350% | 600% |
| NRR | 95% | 108% | 125% | 145% |
| Logo Retention | 80% | 88% | 93% | 97% |
| Gross Margin | 55% | 72% | 82% | 88% |
| Monthly Burn | $40K | $80K | $180K | $350K |
| Cash on Hand | $500K | $1.5M | $3M | $6M |
| Headcount | 6 | 12 | 22 | 40 |
| Paying Customers | 10 | 40 | 150 | 500 |

Note: For Monthly Burn, LOWER is better (below P25 = most capital-efficient).

INTELLIGENCE TYPES (use these exact category values):
["Growth", "Retention", "Efficiency", "Finance", "Fundraising", "Team", "GTM", "Product", "Strategic"]

INITIATIVE CATEGORIES:
["GTM", "Product", "Finance", "People", "Ops", "Other"]

INITIATIVE STATUSES: "draft" (AI-suggested), "active" (user-approved), "resolved" (all milestones checked)

PLAYBOOK CATALOG (suggest from this list only):
1. Generate Intelligence Brief — Full signal-driven brief
2. KPI Benchmark — Compare against peer cohort
3. Pitch Deck Evaluation — Evaluate uploaded pitch deck
4. Finance Assessment — Diagnose capital efficiency
5. Marketing Assessment — Diagnose top-of-funnel + brand
6. Product & Engineering Assessment — Diagnose product velocity
7. RevOps Assessment — Audit pipeline hygiene
8. Retention Deep Dive — Decompose logo and NRR
9. GTM Economics Review — Pressure-test CAC payback
10. Fundraising Readiness — Stress-test cash position
11. Competitive Landscape Scan — Map competitive set
12. Board Update Draft — Assemble metrics-led board update
13. Launch Signal Review — Evaluates ship cadence and quality
14. Scale Readiness Check — Benchmarks team structure
15. Gross Margin Deep Dive — Benchmarks margins
16. Repeatable GTM Motion — Uses customer patterns
17. ICP Validation Sprint — Tests ICP against outreach
18. Pipeline Operating Rhythm — Stage movement and conversion
19. Runway & Burn Review — Maps burn drivers
20. Board Readiness Review — Prepares runway and forecast

RESPOND IN THIS EXACT JSON FORMAT:
```json
{
  "advisor": {
    "summary": "2-4 sentence founder-focused summary. Include profile/benchmark completion %, urgent gaps count, intelligence count, initiative count. Write from an advisor perspective — e.g. 'Company X has 2 urgent focus areas versus your cohort...'",
    "signal_tags": [
      {
        "category_id": "dev|mkt|rev",
        "label": "R&D|GTM|G&A",
        "urgency": "urgent|watch|stable",
        "suffix": "Stable | 2 new risks | Watch",
        "risk_count": 0
      }
    ],
    "recommended_actions": [
      {
        "title": "Complete Benchmark",
        "sub": "Add cohort metrics to unlock comparisons.",
        "cta": "Edit Benchmark",
        "done": false,
        "action_type": "benchmark|sources|details"
      }
    ]
  },
  "categories": [
    {
      "id": "dev",
      "label": "R&D",
      "full_label": "Research and Development",
      "score": 72,
      "status_label": "Leading Cohort|Above Average|Around Median|Needs Attention|Critical",
      "status_tone": "strong|above|watch|weak",
      "confidence_level": "High|Medium|Low",
      "focus_narrative": "1-2 sentence founder-focused narrative about this track. Use plain language — no jargon. E.g. 'Product & engineering is at 72/100 — shipping cadence is slow, faster releases usually unlock the next growth step.'",
      "insight": "2-3 sentence detailed insight about this category based on all inputs.",
      "strengths": [
        {
          "id": "unique-id",
          "label": "Short label (e.g. 'Gross margin')",
          "detail": "1 sentence detail (e.g. 'Top of your cohort at 82%')",
          "source": "benchmark|profile|detail|intelligence"
        }
      ],
      "weaknesses": [
        {
          "id": "unique-id",
          "label": "Short label",
          "detail": "1 sentence detail",
          "source": "benchmark|profile|detail|intelligence"
        }
      ],
      "benchmark_chips": ["82% Gross margin", "12 FTEs", "Seed", "Healthcare"],
      "stats": [
        {"label": "FTEs", "value": "12"},
        {"label": "Gross margin", "value": "82%"}
      ],
      "score_contributors": [
        {
          "id": "field_id_or_metric_key",
          "label": "Human-readable label",
          "source": "benchmark|profile|detail",
          "display": "The value or answer text",
          "score": 72,
          "weight": 22.5,
          "contribution": 16.2,
          "impact": "Founder-focused impact sentence"
        }
      ]
    }
  ],
  "intelligence": [
    {
      "type": "Growth|Retention|Efficiency|Finance|Fundraising|Team|GTM|Product|Strategic",
      "title": "Short title (e.g. 'ARR below cohort median')",
      "text": "1-2 sentence intelligence finding",
      "highlight": "Key highlight phrase",
      "category_id": "dev|mkt|rev",
      "source": "benchmark|profile|form_answers|ai_analysis"
    }
  ],
  "suggested_initiatives": [
    {
      "title": "Initiative title",
      "description": "2-3 sentence description of what to do and why",
      "category": "GTM|Product|Finance|People|Ops|Other",
      "category_id": "dev|mkt|rev",
      "due_date": "YYYY-MM-DD (realistic, 30-90 days out)",
      "cadence": "one-time|recurring",
      "status": "draft",
      "tagged_intelligence_type": "Growth|Retention|null (null if no matching intelligence type)",
      "milestones": [
        {
          "title": "Milestone description",
          "due_date": "YYYY-MM-DD",
          "checked": false
        }
      ]
    }
  ],
  "suggested_playbooks": [
    {
      "playbook_slug": "slug from catalog above",
      "reason": "1 sentence why this playbook is relevant"
    }
  ],
  "journey_stage": {
    "current": "Pre-Product|Early Revenue|Growth|Scale",
    "label": "Stage 1|Stage 2|Stage 3|Stage 4"
  }
}
```

RULES:
1. Score calculation: Weighted from benchmark metrics (45%), company profile inputs (15%), and form answers (40%).
2. For each category, only use the relevant metrics:
   - R&D: headcount, grossMargin
   - GTM: arr, logoRetention, payingCustomers, nrr, arrGrowth
   - G&A: cashOnHand, monthlyBurn
3. Tier mapping: Compare each metric to cohort percentiles:
   - >= P90: "top" (score ~90)
   - >= P75: "upper" (score ~72)
   - >= P50: "mid" (score ~52)
   - >= P25: "lower" (score ~32)
   - < P25: "bottom" (score ~12)
   - For monthlyBurn (lower is better): reverse the tiers
4. Form answer scoring: Use the answer quality to score (e.g. "CI/CD with staged rollout" = 92, "Ad hoc" = 38). See the DETAIL_ANSWER_SCORES reference.
5. Intelligence: Generate 5-15 intelligence items covering all three categories.
6. Initiatives: Generate 2-3 per category, focusing on the MOST impactful founder-level improvements. Tag intelligence only when a matching type exists.
7. Playbooks: Suggest 3-6 from the catalog based on the company's gaps and stage.
8. All text must be founder-friendly — no jargon. Use plain language.
9. Strengths and weaknesses: 2-4 per category. Source them from benchmark position, form answers, profile inputs, and intelligence.
```

---

## Part 3: Backend API Endpoints

### 3.1 POST /api/overview/generate

Called after onboarding completion. Sends all form data to AI and stores results.

**Request:**
```json
{
  "workspace_id": "uuid",
  "company_id": "uuid",
  "profile_answers": { "profile_product_description": "...", ... },
  "dev_answers": { "dev_product_stage": "Launched — early users", ... },
  "mkt_answers": { "mkt_sales_motion": "Founder-led", ... },
  "rev_answers": { "rev_runway": "6–12 months", ... },
  "benchmark": {
    "arr": "500000",
    "arrGrowth": "200",
    "nrr": "108",
    "logoRetention": "88",
    "grossMargin": "72",
    "monthlyBurn": "80000",
    "cashOnHand": "1500000",
    "headcount": "12",
    "payingCustomers": "40"
  }
}
```

**Response:** The full AI JSON from section 2.2, plus DB IDs for all created records.

**Backend flow:**
1. Look up the `overview-generation` playbook from DB to get the prompt template
2. Hydrate the template with all form values
3. Call AI (OpenAI/Claude) with the hydrated prompt
4. Parse the structured JSON response
5. Store in DB:
   - `overview_snapshots` — the advisor summary, signal tags, recommended actions
   - `category_scores` — per-category score, narrative, strengths, weaknesses, contributors
   - `intelligence` — each intelligence item (use existing table)
   - `initiatives` — each suggested initiative with status="draft" (use existing table)
   - Link suggested playbooks via `overview_playbook_suggestions`
6. Return the full response with DB IDs

### 3.2 GET /api/overview/:companyId

Returns the latest overview snapshot for rendering.

**Response:** Same structure as the AI response, but from DB (not re-generated).

### 3.3 PATCH /api/overview/:companyId/regenerate

Re-runs the AI generation with updated form data (e.g., after user edits benchmark or form answers).

### 3.4 GET /api/overview/:companyId/category/:categoryId

Returns the detailed category view data including:
- Score breakdown with all contributors
- Form field rows with tone (missing/concern/watch/ok)
- Benchmark gaps
- Tagged intelligence
- Suggested initiatives for this category
- Suggested playbooks for this category

### 3.5 PATCH /api/overview/:companyId/detail-answers

Saves/updates the detail form answers (R&D/GTM/G&A questions answered outside onboarding).

**Request:**
```json
{
  "answers": {
    "dev_product_stage": "Launched — scaling usage or revenue",
    "dev_ship_cadence": "CI/CD with staged rollout",
    ...
  }
}
```

### 3.6 GET /api/overview/:companyId/score-breakdown/:categoryId

Returns the score health popover data — all contributors sorted by impact.

---

## Part 4: DB Schema

**CRITICAL**: Scan existing tables first. The following tables may already exist: `intelligence`, `initiatives`, `playbooks`, `category_forms` (or similar for R&D/GTM/G&A questions), `benchmark_submissions`, `companies`, `workspaces`. Link to them via foreign keys — do NOT create duplicates.

### 4.1 New Tables (create only if not found)

```sql
-- Overview snapshot (one per company, replaced on regeneration)
CREATE TABLE overview_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  advisor_summary TEXT NOT NULL,
  signal_tags JSONB NOT NULL DEFAULT '[]',
  recommended_actions JSONB NOT NULL DEFAULT '[]',
  journey_stage VARCHAR(50),
  journey_label VARCHAR(50),
  context_completion_pct INTEGER DEFAULT 0,
  playbook_id UUID REFERENCES playbooks(id),  -- the system playbook used to generate
  ai_model VARCHAR(100),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category scores (3 per snapshot — dev, mkt, rev)
CREATE TABLE category_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES overview_snapshots(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  category_id VARCHAR(10) NOT NULL CHECK (category_id IN ('dev', 'mkt', 'rev')),
  label VARCHAR(20) NOT NULL,
  full_label VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL DEFAULT 50,
  status_label VARCHAR(50) NOT NULL,
  status_tone VARCHAR(20) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL DEFAULT 'Medium',
  focus_narrative TEXT,
  insight TEXT,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  benchmark_chips JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '[]',
  score_contributors JSONB NOT NULL DEFAULT '[]',
  intelligence_count INTEGER DEFAULT 0,
  initiative_count INTEGER DEFAULT 0,
  playbook_count INTEGER DEFAULT 0,
  detail_answered_count INTEGER DEFAULT 0,
  detail_question_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_id, category_id)
);

-- Detail answers (R&D/GTM/G&A form answers outside onboarding)
-- Check if a table like `company_form_answers` or `detail_answers` already exists
CREATE TABLE IF NOT EXISTS company_detail_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  question_id VARCHAR(100) NOT NULL,
  answer TEXT,
  quarter_label VARCHAR(20),  -- e.g. "Q3 2026"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, question_id)
);

-- Overview ↔ Playbook suggestions (many-to-many)
CREATE TABLE overview_playbook_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES overview_snapshots(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES playbooks(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_overview_snapshots_company ON overview_snapshots(company_id);
CREATE INDEX idx_category_scores_snapshot ON category_scores(snapshot_id);
CREATE INDEX idx_category_scores_company ON category_scores(company_id);
CREATE INDEX idx_company_detail_answers_company ON company_detail_answers(company_id);
```

### 4.2 Existing Tables to Link

When creating intelligence from the overview generation:
- Insert into the existing `intelligence` table with `source = 'overview_generation'`
- Tag with the AI-provided `category_id` (dev/mkt/rev mapping to intelligence types)

When creating initiatives:
- Insert into the existing `initiatives` table with `status = 'draft'`
- Set `tagged_intelligence_id` only when a matching intelligence record exists
- Initiative is only `resolved` when ALL milestones are checked (enforce in backend)

When suggesting playbooks:
- Reference existing `playbooks` table rows by slug
- The overview generation playbook itself lives in `playbooks` with `is_system = true`

---

## Part 5: Frontend Components

### 5.1 Color Palette (exact values from design reference)

```css
/* Background & surface */
--bg-main: #0A1017;
--surface-1: #111A22;
--surface-2: #1A2B38;
--surface-3: rgba(255,255,255,0.06);
--border: rgba(255,255,255,0.08);

/* Text */
--text-1: #F2F5F2;    /* primary text */
--text-2: #D4DCD4;    /* secondary text */
--text-3: #8FA99A;    /* muted text */
--text-4: #6B7570;    /* faintest text */

/* Accent colors */
--colour-strong: #3DD68C;   /* top quartile / strong */
--colour-above: #9BD4BC;    /* above median */
--colour-around: #D4A86A;   /* around median / watch */
--colour-below: #C9976B;    /* below median */
--colour-weak: #CF8A8A;     /* bottom quartile / critical */

/* Category colors */
--dev-colour: #00B48A;
--dev-dim: rgba(0,180,138,0.08);
--dev-border: rgba(0,180,138,0.22);

--mkt-colour: #9BD4BC;
--mkt-dim: rgba(155,212,188,0.08);
--mkt-border: rgba(155,212,188,0.22);

--rev-colour: #D4A86A;
--rev-dim: rgba(212,168,106,0.08);
--rev-border: rgba(212,168,106,0.22);
```

### 5.2 Component Tree

```
<OverviewPage>
  ├── <OverviewAdvisorPanel>                     // Collapsible advisor section
  │   ├── <AdvisorSummary />                     // AI-generated text + signal tags
  │   └── <RecommendedActions />                 // 3 action items with CTAs
  │
  ├── <CategoryGlanceRow category="dev" />       // R&D row (clickable)
  │   ├── <GlanceScoreRing />                    // SVG donut ring with score
  │   │   └── <ScoreHealthPopover />             // Score breakdown on click
  │   ├── <GlanceCopy />                         // Name + focus narrative
  │   ├── <GlanceInsightsWrap />                 // Strengths + weaknesses columns
  │   │   ├── <TrackInsightPanel tone="strong" />
  │   │   └── <TrackInsightPanel tone="weak" />
  │   └── <CategoryGlanceHeaderBar />            // Initiative/intel/playbook counts + CTA
  │
  ├── <CategoryGlanceRow category="mkt" />       // GTM row
  ├── <CategoryGlanceRow category="rev" />       // G&A row
  │
  └── <CategoryDetailView category={active} />   // Shown when row is clicked
      ├── <GlanceScoreRing />
      ├── <DetailDashboardWidget title="Track insights" />
      ├── <DetailDashboardWidget title="Initiatives">
      │   └── <CategoryDetailInitiativesWidget />  // Suggested vs Active toggle
      ├── <DetailDashboardWidget title="Intelligence" />
      ├── <DetailDashboardWidget title="Playbooks" />
      └── <CategoryDetailContextPanel />           // Form answers + benchmark gaps
          ├── <CategoryDetailFormWidget />          // Flagged rows + on-track rows
          └── <BenchmarkCompactRow[] />             // Benchmark gap bars
```

### 5.3 Score Ring Component (GlanceScoreRing)

```
SVG donut ring:
- size: 88px × 88px
- stroke-width: 7px
- background circle: var(--surface-3)
- fill circle: category barColour (computed from score)
- rotation: -90° (starts from top)
- dasharray: circumference
- dashoffset: circumference - (score/100) * circumference

Center label:
- score number: font-size 24px, font-weight 700, color = barColour
- Below ring: status label (e.g. "Leading Cohort") with tone class
```

Score → Color mapping:
```
score >= 80 → #3DD68C (strong)
score >= 65 → #9BD4BC (above)
score >= 50 → #D4A86A (around)
score >= 35 → #C9976B (below)
score < 35  → #CF8A8A (weak)
```

### 5.4 Advisor Panel Design

```
Container:
- border: 1px solid rgba(255,255,255,0.08)
- border-radius: 12px
- background: var(--surface-1)
- padding: 20px 24px

Header row:
- "✦ Fuel AI · Advisor" — font-size: 11px, color: var(--text-3), letter-spacing: 0.04em
- Company name — font-size: 11px, color: var(--text-4)
- Collapsible chevron ▾

Split layout (two columns):
LEFT (60%):
  - "Summary" label — font-size: 11px, text-transform: uppercase, color: var(--text-3)
  - Summary text — font-size: 13px, color: var(--text-2), line-height: 1.5
  - Signal tags row — horizontal buttons with dots:
    [● R&D Stable]  [● GTM 2 new risks]  [● G&A Watch]
    - dot color matches urgency (green/amber/red)
    - urgent tags have dashed border

RIGHT (40%):
  - "Recommended Actions" label
  - 3 numbered action items:
    - Circle number (1/2/3) — done items get green check
    - Title + sub text
    - CTA button on right ("Edit Benchmark →")
```

### 5.5 Category Glance Row Design

```
Container:
- background: var(--surface-1)
- border: 1px solid var(--border)
- border-radius: 12px
- padding: 16px 20px
- cursor: pointer
- hover: border-color brightens slightly

Header bar (top):
- Left: horizontal link buttons ("2 initiatives →", "5 intelligence →", "3 playbooks →")
  - font-size: 11px, color: var(--text-3), hover: var(--text-2)
- Right: "Update R&D details →" CTA
  - font-size: 11px
  - If incomplete: color: var(--colour-around), font-weight: 600
  - If complete: color: var(--text-3)

Main layout (below header):
- Left: Score ring (88px) + text block
  - Category name: "R&D · Research and Development →"
    - font-size: 15px, font-weight: 600, color: var(--text-1)
    - Arrow appears on hover
  - Focus narrative: font-size: 12px, color: var(--text-3), max 2 lines
- Right: Two insight columns side by side
  - "Primary strengths" — green-toned label
  - "Needs improvement" — red-toned label
  - Each: bulleted list with label (bold) + detail (italic/muted)
  - "View more →" button if > 2 items
```

### 5.6 Initiatives Widget (Category Detail)

```
Toggle segmented control:
  [Active]  [Suggested · 2]
  - "Suggested" button shows count badge if > 0
  - Default view: "Active" if any active initiatives exist, else "Suggested"

Suggested initiative card:
  - Left border accent: initiative colour
  - Title: font-size: 14px, font-weight: 600
  - Description: font-size: 12px, color: var(--text-3)
  - If matched to a weakness: shows "Why: [gap label — detail]"
  - Right: "Add →" button

Statuses:
  - "active": user approved the suggestion
  - "draft": AI suggested, pending approval
  - "resolved": ALL milestones for this initiative are checked
```

### 5.7 Score Health Popover (on score ring click)

```
Fixed-position popover (portal to document.body):
- width: 380px, max-height: 480px
- background: var(--surface-2)
- border: 1px solid var(--border)
- border-radius: 10px
- box-shadow: 0 8px 32px rgba(0,0,0,0.4)

Header:
  "Track health · R&D"
  Score: "72 /100" in barColour

Explanation text:
  "Weighted from benchmark metrics (45%), company profile (15%), and your R&D answers (40%). Sorted by what pulls founders down most."

Contributor blocks (stacked, sorted by score ascending):
  Each block:
  - Source badge ("Benchmark" / "Profile" / "Answers")
  - Weight label: "22.5% · +16.2 pts"
  - Title: field/metric label
  - Value + score
  - Impact sentence
  - Border-left color based on score tone:
    - score >= 72: green
    - score >= 50: amber
    - score < 50: red
  - First block with score < 55 gets "is-top-priority" class (slightly highlighted)

Footer:
  "Weighted total: 72 / 100 (100% inputs)"
  "Confidence · High | Updated 2h ago"
```

---

## Part 6: Form Questions Reference

The R&D, GTM, G&A category forms have these question IDs and scoring rules. Use these for both the detail drawer and the score calculation.

### 6.1 Category → Question Mapping

**R&D (dev):** dev_product_stage, dev_product_type, dev_delivery_constraint, dev_primary_customer, dev_launch_timeline, dev_build_model, dev_engineering_size, dev_ship_cadence, dev_ai_role, dev_compliance, dev_prioritization, dev_feature_debt_split, dev_eng_bottleneck (multi-select)

**GTM (mkt):** mkt_sales_motion, mkt_funnel_gap, mkt_icp_clarity, mkt_revenue_tracking, mkt_deal_size, mkt_pricing_model, mkt_demand_source, mkt_sales_team, mkt_marketing_capacity, mkt_cac_payback, mkt_contract_length, mkt_competitive_pressure, mkt_deal_stall (conditional), mkt_pipeline_definitions (conditional), mkt_mql_sql_visibility (conditional), mkt_pricing_governance (conditional), mkt_cross_functional_slas (conditional)

**G&A (rev):** rev_runway, rev_finance_management, rev_capital_priority, rev_twelve_month_goal, rev_unit_economics, rev_forecast, rev_cap_table, rev_operating_mode, rev_team_size, rev_hiring_plans, rev_board_reporting, rev_segment_economics (conditional), rev_raise_needs (conditional)

### 6.2 Answer Score Examples (implement full mapping)

```typescript
// Score for each answer option (higher = better for the company)
const DETAIL_ANSWER_SCORES: Record<string, Record<string, number>> = {
  dev_product_stage: {
    "Idea — not yet in development": 42,
    "In active development": 58,
    "Built — not yet launched": 66,
    "Launched — early users or customers": 78,
    "Launched — scaling usage or revenue": 90,
  },
  dev_ship_cadence: {
    "CI/CD with staged rollout": 92,
    "Regular releases (e.g. weekly / biweekly)": 82,
    "Ad hoc — no regular cadence": 38,
    "Not shipping yet": 30,
  },
  mkt_sales_motion: {
    "Product-led": 86,
    "Sales-led": 78,
    "Founder-led": 52,
    "Not yet": 36,
  },
  rev_runway: {
    "Over 18 months": 90,
    "12–18 months": 78,
    "6–12 months": 58,
    "Under 6 months": 34,
  },
  // ... implement ALL question IDs with ALL options scored
};
```

### 6.3 Category → Benchmark Metric Mapping

```typescript
const CATEGORY_METRIC_KEYS = {
  dev: ["headcount", "grossMargin"],
  mkt: ["arr", "logoRetention", "payingCustomers", "nrr", "arrGrowth"],
  rev: ["cashOnHand", "monthlyBurn"],
};
```

### 6.4 Score Weights

```
BENCHMARK_WEIGHT = 45%   // from metric positions vs cohort
PROFILE_WEIGHT   = 15%   // from company profile completeness
DETAIL_WEIGHT    = 40%   // from form answer quality
```

Composite score = sum of (each contributor's score × weight / 100)

---

## Part 7: Detail Drawer (Form Editing)

The detail drawer is a side panel (right-aligned, 480px wide) for editing R&D/GTM/G&A form answers.

### 7.1 Structure
```
┌─ Drawer ──────────────────────────────┐
│ ✦ Fuel AI · Add details              │
│ Company Name                     [✕] │
│                                       │
│ [1 Profile] [2 R&D] [3 GTM] [4 G&A]  │ ← Step tabs with done/total counts
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░ 45% progress     │
│                                       │
│ ⚙ R&D                               │
│ Research & development                │
│                                       │
│ Where is your product today?          │
│ ┌────────────────────────────────┐    │
│ │ ○ Idea — not yet in dev       │    │
│ │ ● Launched — early users ✓    │    │
│ │ ○ Launched — scaling          │    │
│ └────────────────────────────────┘    │
│                                       │
│ (more questions...)                   │
│                                       │
│ [Save & close]        [Back] [Next →] │
└───────────────────────────────────────┘
```

### 7.2 Saving
- Each answer selection saves immediately to `company_detail_answers` table
- On "Save & close", also triggers score recalculation
- Quarter label is set on first save (e.g., "Q3 2026")
- If quarter is stale, recommended actions show "Update Company Details"

---

## Part 8: Category Detail — Your Inputs Section

### 8.1 Form Field Rows

Each question's answer gets a tone based on its score:
```
score >= 72 → "ok" (green, shown in "On track" section)
score >= 58 → "watch" (amber, shown in "Needs review" with "Watch" flag)
score < 58  → "concern" (red, shown in "Needs review" with "Needs attention" flag)
not answered → "missing" (grey, shown in "Needs review" with "Missing" flag)
```

### 8.2 Benchmark Gaps

Show only metrics that are:
- Not logged (value is null), OR
- Below median (tier = "bottom" or "lower")

Display as compact rows with:
- Metric label
- Value (or "Not logged")
- Position pill (e.g., "Below median" with red badge)
- Cohort track bar (compact version)

---

## Part 9: Cross-Tab Integration

### 9.1 Overview → Intelligence Tab
- Intelligence items generated from the overview AI response appear in the Intelligence tab timeline
- Clicking "5 intelligence →" in a category header navigates to Intelligence tab filtered by that category

### 9.2 Overview → Initiatives Tab
- Suggested initiatives (draft status) appear in Initiatives tab under the "Suggested" toggle
- User can approve (→ active) or dismiss
- Initiative is only "resolved" when ALL milestones are checked
- Clicking "2 initiatives →" navigates to Initiatives tab

### 9.3 Overview → Playbooks
- Suggested playbooks appear in category detail
- Clicking "Run playbook →" opens the Ask Fuel AI chat drawer with that playbook pre-loaded

---

## Part 10: Onboarding → Overview Flow

When onboarding completes ("Start my journey" button):

1. Collect all answers: profile, R&D, GTM, G&A forms, benchmark numbers
2. Show loading screen: "Generating intelligence based on your profile"
   - 3 animated steps: "Reading company profile", "Linking account context", "Preparing benchmark and intelligence timeline"
3. Call `POST /api/overview/generate` with all data
4. On response:
   - Store overview snapshot
   - Store category scores
   - Create intelligence records
   - Create draft initiative records
   - Link suggested playbooks
5. Navigate to Overview tab
6. Show tour prompt banner: "Want a quick walkthrough of Fuel?"

---

## Part 11: DB Table Discovery Instructions for Cursor

Before creating any tables:

1. Scan ALL existing Drizzle schema files in the project (typically `src/db/schema/` or `drizzle/schema/`)
2. Look for tables named: `intelligence`, `initiatives`, `playbooks`, `companies`, `workspaces`, `users`, `benchmark_submissions`, `category_forms`, `form_answers`, `company_profiles`
3. If `intelligence` table exists: INSERT intelligence records there with `source = 'overview_generation'`
4. If `initiatives` table exists: INSERT initiatives there with `status = 'draft'`
5. If `playbooks` table exists: Use it for the system playbook. Add `is_system` and `is_visible` columns if not present
6. If `benchmark_submissions` table exists: Link overview snapshots to it
7. Only create tables from Part 4 that don't already exist
8. Add foreign keys to existing tables
9. Generate Drizzle migration files

---

## Part 12: Frontend Implementation Notes

### 12.1 State Management
- Overview page state: `activeView` = "overview" | "dev" | "mkt" | "rev" | "benchmark"
- Detail drawer: `drawerOpen`, `drawerStep` (0-3 for Profile/R&D/GTM/G&A)
- Advisor panel: `advisorOpen` (collapsible)
- Score popover: `openGlancePopover` (only one open at a time)
- Benchmark edit drawer: `editBenchmarkOpen`

### 12.2 Data Fetching
- On mount: `GET /api/overview/:companyId` to load snapshot
- On detail answer change: debounced `PATCH /api/overview/:companyId/detail-answers`
- On benchmark save: `PATCH /api/overview/:companyId/regenerate`
- Score recalculation can happen client-side for instant feedback, then synced to backend

### 12.3 Responsive Design
- The design is primarily for desktop (1200px+ viewport)
- Category glance rows stack vertically
- Drawer overlays on right (480px width)
- Popovers use fixed positioning with smart placement (above/below based on available space)
