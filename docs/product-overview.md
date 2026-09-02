# Fuel 2.0 — Product Overview

> **York IE's AI operating platform for founders.**  
> An AI advisor that doesn't take equity — built to replace expensive retainers and dilutive advisory arrangements at $25–30/mo.

---

## Table of Contents

1. [What Fuel Is](#1-what-fuel-is)
2. [Core Value Proposition](#2-core-value-proposition)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Workspace Overview](#4-workspace-overview)
5. [Overview Tab (Benchmark Command View)](#5-overview-tab-benchmark-command-view)
6. [Intelligence Tab](#6-intelligence-tab)
7. [Scorecard Tab (York Tracks)](#7-scorecard-tab-york-tracks)
8. [Data Room](#8-data-room)
9. [Initiatives](#9-initiatives)
10. [Playbooks](#10-playbooks)
11. [Connector Hub](#11-connector-hub)
12. [Credits & Pricing](#12-credits--pricing)
13. [Guided Tour](#13-guided-tour)
14. [Benchmark Visualization System](#14-benchmark-visualization-system)
15. [Key Metrics Tracked](#15-key-metrics-tracked)
16. [User Journey (End-to-End)](#16-user-journey-end-to-end)
17. [Terminology](#17-terminology)

---

## 1. What Fuel Is

Fuel 2.0 is York IE's operating platform for startup founders, executives, and operators. It gives founders access to the strategic intelligence, benchmarks, playbooks, and execution support that were previously only available through expensive advisory relationships or venture firms.

**It answers five questions every founder needs answered:**

1. What progress are we making across product, GTM, revenue, and finance?
2. What changed recently, and what needs my attention?
3. How do we compare to **real peers** in our cohort — not generic industry averages?
4. What should we do next?
5. How is York IE helping us build a stronger business?

**Demo company:** Patriot Pay (`patriotpay.com`) — healthcare patient billing, Seed stage, Boston.

---

## 2. Core Value Proposition

| Without Fuel | With Fuel |
|---|---|
| Hire an advisor (equity + fees) | $30/mo, no equity taken |
| Generic industry benchmarks | Real peer cohort (e.g. B2B SaaS · Seed · US · n=147) |
| Scattered data across tools | Intelligence synthesized from all connected sources |
| Unknown what to do next | Playbooks and initiatives surfaced from your gaps |
| York IE as a black box | Transparent York tracks with milestone-level accountability |

---

## 3. Onboarding Flow

The onboarding flow is a full-screen conversational experience. It takes a founder from zero to a fully seeded workspace in one session.

### 3.1 Company Detection

- User enters a business email (e.g. `matt@patriotpay.com`)
- Fuel auto-detects the company from the domain
- Personal email domains are asked for company name separately

### 3.2 Profile Creation

An inline compact form captures:

| Field | Description |
|---|---|
| Company name | Legal or operating name |
| What they do | One-line description |
| Business model | B2B SaaS, marketplace, services, etc. |
| Industry | Healthcare, fintech, etc. |
| Location | City / region |
| Website | Public URL |
| LinkedIn | Company LinkedIn |
| Funding rounds | Stage + amounts |
| Notes | Anything else relevant |

CTA: **Create my profile →**

### 3.3 Benchmark Wizard (9 Core Metrics)

Each metric is entered one at a time with a **live peer comparison bar** showing where the user's answer lands vs their cohort in real time.

| Metric | Unit |
|---|---|
| ARR | USD |
| ARR growth (YoY) | % |
| Net revenue retention (NRR) | % |
| Logo retention | % |
| Gross margin | % |
| Monthly net burn | USD (lower = better) |
| Cash on hand | USD |
| FTE headcount | Count |
| Paying customers | Count |

The cohort band shows P25–P90 for the matched peer group (e.g. B2B SaaS · Seed · US · n=147).

### 3.4 Benchmark Results

After the wizard:
- Full KPI snapshot with strength/gap bullets per metric
- Journey stage detection (one of 7 stages from Idea → Market Leader)
- Stage-matched **playbook suggestions**
- "What's next" insight copy
- CTA: **See how Fuel helps →**

### 3.5 Workspace Preview & Launch

- A preview of the Fuel workspace is shown: Data Room, Intelligence, Research, Fuel AI, Playbooks
- CTA: **Start my journey →** (intentionally requires a click — not auto-redirected)
- On click: benchmark data is handed to the workspace → loading animation → **Overview tab**

### 3.6 Sidebar Progress Checklist

Throughout onboarding a right sidebar shows setup status for the York IE Value Creation Engine:

| Item | Completes when |
|---|---|
| Your company profile | Profile form submitted |
| Your growth benchmarks | Benchmark wizard completed |
| Your Fuel journey tracks | "See how Fuel helps" step reached |
| Intelligence generation | Launch clicked |
| Your workspace config | Launch clicked |

---

## 4. Workspace Overview

After onboarding the user lands in a dark-navy workspace with:

- **Left sidebar** — York IE platform nav (Research, Portfolio, Value creation, Integrations, Network, company switcher, credits)
- **Company header** — logo, domain badge, company details, Profile chip, Playbooks, Generate brief, Ask Fuel AI
- **Tab bar** — Overview · Intelligence · Initiatives · Research · Data Room · Scorecard

### Top-level navigation

| Tab | What it does |
|---|---|
| **Overview** | Benchmark-driven command view with category drilldowns |
| **Intelligence** | Live sources, timeline of synthesized insights |
| **Initiatives** | Operating work items derived from intelligence gaps |
| **Research** | (Coming soon — badge shows 1) |
| **Data Room** | Private document storage with AI intelligence generation |
| **Scorecard** | York IE value-creation tracks (Development, Marketing, RevOps, Financial Advisory) |

### Company header actions

| Action | Behavior |
|---|---|
| **Profile** chip | Opens Company Profile page (funding, about, similar companies) |
| **Playbooks ▾** | Catalog of AI runbooks (tour target) |
| **Generate brief** | Primary CTA (generates a founder brief) |
| **Ask Fuel AI** | Credit-gated AI chat (3 credits/message) |
| **Tour** | Launches 7-step guided workspace tour |

---

## 5. Overview Tab (Benchmark Command View)

The Overview tab (`ScorecardV2`) is the benchmark-driven operating command center. It contextualizes every metric against the founder's real peer cohort.

### 5.1 Main Overview View

Three category tiles — **Development**, **Marketing**, **RevOps** — each showing:
- Category name and icon
- Number of metrics tracked
- Strength bar (Weak → Strong) based on aggregated tier scores
- Top insight copy (e.g. "Gross margin is top quartile — strong unit economics")
- Urgent signal chips (e.g. "Cash runway < 6 months")
- Click to open category drilldown

### 5.2 Fuel AI Advisor Panel

Below the category tiles, the Fuel AI Advisor flags urgent focus areas dynamically:

- Identifies metrics with weak or bottom-quartile tiers
- Surfaces them as clickable chips (e.g. "Cash runway", "GTM motion", "R&D velocity")
- Copy: *"Patriot Pay has 2 urgent focus areas versus your cohort. Address these before your next growth push."*
- Each chip links directly into the relevant category drilldown

### 5.3 Category Drilldown View

Clicking a category opens a full drilldown with:

**Hero section:**
- Back button (← Overview)
- Category badge with color accent
- Title and insight headline
- Hero progress bar showing category strength

**Metric cards (2-column grid):**

Each metric card shows:
- Metric label + category kicker
- User's raw value (large, prominent)
- Tier pill (e.g. TOP QUARTILE, ABOVE MEDIAN, BELOW MEDIAN, BOTTOM QUARTILE) with dynamic color
- Ratio vs median (e.g. "8.3× above median")
- Full-width cohort band bar with user marker dot (`BenchmarkCohortTrack`)
- P25 / P50 / P75 / P90 percentile scale (`BenchmarkPercentileScale`)

**Intelligence timeline:** Recent intelligence rows filtered to this category

**Playbooks:** Suggested AI runbooks specific to the category's gaps

**Suggested initiatives:** Actionable next steps with **+ Create** button → Initiatives tab

### 5.4 Category → Metric Mapping

| Category | Metrics |
|---|---|
| Development | FTE headcount, Gross margin |
| Marketing | ARR, Logo retention, Paying customers, NRR, ARR growth |
| RevOps | Cash on hand, Monthly burn (+ derived runway) |

### 5.5 Full Peer Comparison View

A dedicated view (`benchmark`) showing the full `BenchmarkPeerComparisonPanel` — all 9 metrics with cohort bands, percentiles, and tier analysis — plus a link to Intelligence.

---

## 6. Intelligence Tab

The Intelligence tab is where Fuel synthesizes information from all connected sources into actionable insights for the founder.

### 6.1 When Profile is Complete (Post-Onboarding)

**Sources panel:**
- Lists all connected context connectors (GA4, Semrush, Granola, HubSpot, etc.)
- **+ Add a source** — manual entry (title, description, optional document attachment)
- **Generate intelligence** (8 credits) — creates a new timeline item; attached document is saved to the Data Room
- Documents are staged — uploading a file alone does not generate intelligence

**Intelligence timeline:**
- Sorted newest-first by `updatedAtMs`
- Benchmark group rows (from onboarding) shown first as a seeded block
- Filters: All · Efficiency · Finance · Fundraising · Growth · Retention · Team
- **+ Log intelligence** — manual entry (category, period, value, note)
- Each row shows: type pill, headline, confidence level, source count
- Click a row → **Provenance sidebar** slides in with source snippets and metadata
- Dismiss button on non-benchmark items

**Connectors upsell strip:** Google Meet, Zoom, LinkedIn, Salesforce, Gmail + All connectors

### 6.2 When Profile is Incomplete

- Cohort benchmark panel shown without user-data overlay
- "Log benchmark data →" link to complete profile
- Sources panel and optional timeline still visible

### 6.3 Intelligence Types

Automatically categorized as one of: `growth`, `retention`, `efficiency`, `finance`, `fundraising`, `team`

Manual entries can use: Fundraising, GTM, Product, Strategic, Team, Finance, Growth, Retention, Efficiency

### 6.4 Benchmark Seeding

Completing the onboarding wizard automatically seeds the Intelligence timeline with benchmark-derived intelligence rows — no hardcoded demo content. All rows come from the founder's actual benchmark answers.

---

## 7. Scorecard Tab (York Tracks)

The Scorecard tab shows the founder's York IE engagement across four value-creation tracks. It is a transparency layer showing exactly what York IE is doing and what's been accomplished.

### 7.1 Four Tracks

| Track | Name | Demo Health | Demo Fill |
|---|---|---|---|
| Development | Engineering & Product | On Track (green) | 82% |
| Marketing | Go-to-Market | Needs Attention (amber) | 52% |
| RevOps | Revenue Operations | In Progress (amber) | 38% |
| Financial Advisory | G&A & Finance | Not Started (grey) | 0% |

### 7.2 Per Track View

Each track row is expandable and shows:
- Health label + color
- Fill percentage with animated bar
- Milestones with done/open status
- Jira-style activity updates
- Manual notes section
- Suggested playbooks per milestone
- York IE team allocation (avatars)
- Integration status for connected tools

### 7.3 Journey Stage Bar

A mini progress bar beneath each track visualizes position on the broader journey:
**Foundation → Acceleration → Scale → Optimization**

### 7.4 Suggestion Card

Surfaces the weakest or not-yet-started track with a CTA (e.g. "Explore Financial Advisory packages").

### 7.5 Development Detail Page

Full detail view for the Development track:
- **Overview** — track status, milestones, Jira updates
- **Roadmap** — product roadmap items with status
- **Design Studio (Launchpad)** — York design approval workflow
- **Execution Health (Pulse)** — quality charts, release notes, engineering health

### 7.6 Marketing Detail Page

Full detail view for the Marketing (GTM) track:
- GTM snapshot
- Traffic and channel performance
- Content and campaign status
- Gated on `marketingIntegrations` being connected

---

## 8. Data Room

A private document vault where founders store company documents. Connected to intelligence generation.

### 8.1 Document Types (one latest file per slot)

| Type | Description |
|---|---|
| Pitch Deck | Investor-facing deck |
| Investor Notes | Meeting notes, LP updates |
| Investment Memo | Internal or external memos |
| Board Deck | Board meeting presentations |
| Financial Model | Projections, 3-statement models |
| Cap Table | Ownership structure |
| Product Roadmap | Engineering/product roadmap |
| Customer Contract | Sample or template contracts |
| Due Diligence Pack | Full DD data room |
| Custom | Any other document |

### 8.2 Upload Flow

1. Select a document slot and upload a file (15 credits)
2. Parsing animation runs
3. Intelligence items are generated from document content
4. File stored with version history in the slot sidebar

---

## 9. Initiatives

A work-tracking layer where intelligence gaps become executable tasks.

### 9.1 Current Features

- Empty state + **+ New initiative** form
- Fields: name, type (continuous / one-time), category (GTM / Product / Finance / Ops), owner, due date
- Items generated from benchmark gaps (suggested in Overview drilldowns via **+ Create** button)

### 9.2 Future Direction

Initiatives are intended to be auto-recommended from intelligence gaps — bridging "what Fuel found" to "what we're doing about it."

---

## 10. Playbooks

Playbooks are AI-executed runbooks that use signal context and benchmark data to produce structured artifacts: due diligence packages, pricing reviews, competitive audits, planning frameworks.

### 10.1 Sources of Playbook Suggestions

| Source | How |
|---|---|
| Journey stage (onboarding) | `STAGE_PLAYBOOKS` — 7 stages × 3 playbooks each |
| Benchmark gaps (metric-specific) | `suggestPlaybooksForStage` — metric-level maps |
| Category drilldowns (Overview) | Per-category playbook recommendations |
| Milestone insights (Scorecard) | Per-milestone York AI suggestions |

### 10.2 Examples by Stage

**Early Revenue stage:** Revenue Ops Setup, Customer Success Playbook, Series A Readiness  
**Scaling stage:** Pricing Optimization, Enterprise Sales Motion, GTM Efficiency Review

### 10.3 Cost

40 credits per playbook run.

---

## 11. Connector Hub

The Connector Hub allows founders to connect their tools so Fuel can pull intelligence from real data.

### 11.1 Supported Integrations (13)

| Category | Integrations |
|---|---|
| Development | Jira, Linear, Launchpad (York IE), Pulse (York IE) |
| Marketing | GA4, Google Ads, Semrush, LinkedIn, Meta Ads |
| RevOps | HubSpot, Salesforce |
| FinOps | QuickBooks, Stripe |

### 11.2 Connection Methods

- **OAuth** — standard SSO-style authorization
- **API key** — paste key from third-party platform
- **York** — auto-connected for York IE tools (Launchpad, Pulse)

### 11.3 Pricing

- York IE tools: included with Fuel plan
- Third-party add-ons: $29–$99/mo per connector

### 11.4 Access Points

- Full Connector Hub from left sidebar → Integrations
- Per-track setup from Scorecard (e.g. Development → Set up integrations)

---

## 12. Credits & Pricing

### 12.1 Positioning

> *An AI advisor that doesn't take percentage points of your company.*

- **Free plan** — 250 credits/mo, 50 credits/day soft cap, 24-hour cooldown when blocked
- **Pro plan** — $30/mo or $300/yr ($25/mo effective), 2,000 credits/mo, 200 credits/day, 6-hour cooldown

### 12.2 Credit Costs per Action

| Action | Credits |
|---|---|
| Ask Fuel AI (per message) | 3 |
| Generate source intelligence | 8 |
| Document upload + intelligence | 15 |
| Crunchbase enrichment | 5 |
| Playbook run | 40 |

### 12.3 Credit Balance Logic

Credits deduct from:
1. Monthly pool (Free: 250, Pro: 2,000)
2. Top-up balance (if purchased)

Daily usage is tracked separately. If the daily cap is hit, generation is blocked with a cooldown timer until reset.

### 12.4 Top-Up Packs (Pro only)

| Pack | Credits | Price |
|---|---|---|
| Sprint | 1,000 | $12 |
| Builder | 2,000 | $20 |
| Growth | 5,000 | $48 |
| Scale | 8,000 | $77 |

### 12.5 Credit UI Surfaces

- **Sidebar credit indicator** — always-visible usage bar
- **Credit popover** — healthy / low / blocked state with upgrade/top-up CTA
- **Block banner** — top of Intelligence tab when daily limit is hit
- **Action-level disabled state** — buttons grey out when generation is blocked
- **Upgrade modal** — Pro plan details + top-up pack selector
- **Profile usage breakdown** — per-action credit consumption history

---

## 13. Guided Tour

A 7-step overlay tour that walks new users through the workspace. Triggered automatically after onboarding or available via the Tour button in the header.

| Step | Tab | Target | Topic |
|---|---|---|---|
| 1 | Profile | Overview page | Company home base — your north star |
| 2 | Intelligence | Timeline | Sources, benchmarks, synthesized insights |
| 3 | Intelligence | Add source | How to add manual sources and documents |
| 4 | Data Room | Data Room | Private files used as intelligence evidence |
| 5 | Initiatives | Initiatives | Turning insights into action |
| 6 | Profile | Playbooks button | AI runbooks that execute on your behalf |
| 7 | Profile | Finish profile | Complete your profile for better intelligence *(skipped if onboarding is complete)* |

Tour uses a backdrop overlay with an anchored popover to highlighted elements (`data-tour-target`). Re-triggers after 24 hours.

---

## 14. Benchmark Visualization System

A shared visualization system used in both the Onboarding chat and the Overview drilldowns for visual consistency.

### 14.1 `BenchmarkCohortTrack`

The core bar component. Shows:
- A **cohort band** (green fill from P25 to P75)
- **Percentile markers** at P25, P50, P75, P90
- A **user marker dot** placed at the user's exact position
- Tier color coding: top quartile (green) → above median (teal) → below median (amber) → bottom (red)

Used in: onboarding benchmark wizard, Overview MetricCard drilldown.

### 14.2 `BenchmarkPercentileScale`

Horizontal scale beneath the bar showing:
- Percentile labels (P25, P50, P75, P90)
- Exact cohort values at each percentile
- User's value highlighted at their position

### 14.3 Tier System

| Tier | Meaning | Color |
|---|---|---|
| Top quartile | Above P75 | Green |
| Above median | P50–P75 | Teal |
| Below median | P25–P50 | Amber |
| Bottom quartile | Below P25 | Red |

### 14.4 Cohort Reference

The peer cohort is defined by the company's profile attributes: business model + stage + geography. Example: `B2B SaaS · Seed · US · n=147`. Every percentile shown is from this specific cohort, not generic industry data.

---

## 15. Key Metrics Tracked

### 15.1 Core Benchmark Metrics (9)

| Key | Label | Unit |
|---|---|---|
| `arr` | Annual Recurring Revenue | USD |
| `arrGrowth` | ARR growth (YoY) | % |
| `nrr` | Net Revenue Retention | % |
| `logoRetention` | Logo retention | % |
| `grossMargin` | Gross margin | % |
| `monthlyBurn` | Monthly net burn | USD |
| `cashOnHand` | Cash on hand | USD |
| `headcount` | FTE headcount | Count |
| `payingCustomers` | Paying customers | Count |

### 15.2 Extended Benchmark Fields (Quarterly Updates)

| Key | Label |
|---|---|
| `cacPayback` | CAC payback period |
| `burnMultiple` | Burn multiple |
| `ruleOf40` | Rule of 40 |
| `openToIntros` | Open to investor intros |
| `notableCustomers` | Notable customers won |
| `notableHires` | Notable hires made |
| `otherUpdates` | Other updates |
| `biggestChallenges` | Biggest challenges this quarter |

### 15.3 Derived Metrics

| Metric | Calculation |
|---|---|
| Cash runway (months) | Cash on hand ÷ Monthly burn |
| vs median ratio | User value ÷ cohort P50 value |
| Category strength score | Aggregated from individual metric tiers |

### 15.4 Journey Stages (7)

1. Idea
2. Pre-Product
3. Pre-Revenue
4. Early Revenue
5. Product-Market Fit
6. Scaling
7. Market Leader

Fuel auto-detects the stage from benchmark inputs and tailors all playbook suggestions and insight copy to that stage.

---

## 16. User Journey (End-to-End)

```
User opens Fuel
   │
   ├── Enters business email → domain detection → "Found you."
   │
   ├── Fills out company profile form
   │
   ├── Goes through 9-metric benchmark wizard
   │   └── Sees live cohort bar for each answer
   │
   ├── Views KPI snapshot + stage + playbooks + insight
   │
   ├── Clicks "Start my journey →"
   │   └── Loading screen (2.2s) → Overview tab
   │
   ├── [Optional] Guided tour (7 steps)
   │
   ├── Overview tab
   │   ├── 3 category tiles (Dev / Marketing / RevOps)
   │   ├── Fuel AI Advisor panel (urgent focus areas)
   │   └── Click category → drilldown with metric cards + playbooks + initiatives
   │
   ├── Intelligence tab
   │   ├── Benchmark rows seeded from onboarding
   │   ├── Add sources → Generate intelligence (8 credits)
   │   ├── Upload documents → intelligence from files (15 credits)
   │   └── Filter / explore timeline + provenance sidebar
   │
   ├── Data Room
   │   └── Upload pitch deck, model, board deck, etc. → AI reads and generates intelligence
   │
   ├── Scorecard tab
   │   └── Track rows (Dev, Marketing, RevOps, Financial Advisory) → milestones + York team progress
   │
   ├── Initiatives
   │   └── Create work items from benchmark gaps or intelligence suggestions
   │
   └── Ask Fuel AI
       └── Credit-gated AI chat for strategic questions
```

### Alternate Entry Paths

| Path | Trigger | Landing |
|---|---|---|
| Set up later | Skip button in onboarding | Guided tour on Profile page |
| Direct workspace | `journey` route | Scorecard tab |
| Signals path | `signals` route | Loading → Intelligence + tour |
| Incomplete profile | Skipped onboarding | Intelligence with cohort panel, no overlay; "Finish profile" banner |

---

## 17. Terminology

Use the following terms consistently across all UI copy and documentation:

| Use this | Not this |
|---|---|
| **Intelligence** (tab + timeline) | Signals, Context Feed |
| **Scorecard** (York tracks tab) | Pulse, Your Journey |
| **Overview** (benchmark command view) | Dashboard, Performance |
| **Data Room** | Document vault, Files |
| **Generate intelligence** | Auto-generate, analyze |
| **Real peers / cohort** | Generic industry averages |
| **Start my journey →** | Auto-redirect |
| **Ask Fuel AI** | Chat, Assistant |
| **Playbook run** | Execute, automation |
| **Initiatives** | Tasks, To-dos |

---

*Last updated: June 2026 — Fuel Demo v1 / Patriot Pay reference implementation.*
