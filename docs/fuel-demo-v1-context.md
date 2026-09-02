# Fuel 2.0 — Demo v1 Product Context

Personal reference for the **demo/v1** prototype: end-to-end workflow, screens, intelligence logic, credits/pricing, and positioning discussed in product work.  
Branch: `demo/v1` · Primary demo company: **Patriot Pay** (`patriotpay.com`).

---

## 1. What Fuel is

Fuel 2.0 is York IE’s operating platform for founders and operators. It answers:

- What progress are we making across product, GTM, revenue, and finance?
- What changed recently, and what needs attention?
- How do we compare to real peers — not generic industry averages?
- What should we do next?

**Visual feel:** Dark navy dashboard, compact cards, thin borders, calm data, green accent (`#00B48A`), premium enterprise SaaS — not a marketing site.

**Positioning (pricing & onboarding):** Fuel is framed as **an AI advisor that doesn’t take percentage points of your company** — a **$25–30/mo** alternative to equity-diluting advisors and expensive retainers.

---

## 2. End-to-end flow (high level)

```
Login
  → Onboarding chat (FuelOnboardingChat)
       → Profile review + benchmark wizard
       → "Start my journey →"
  → Intelligence loading screen
  → Workspace (PatriotPayJourney) on Intelligence tab
       → Optional guided tour
       → Overview · Intelligence · Initiatives · Data Room · Scorecard
```

**Alternate entry paths**

| Path | Trigger | Lands on |
|------|---------|----------|
| Happy path (demo) | Complete onboarding chat | `signals-loading` → Intelligence tab + tour |
| Set up later | "Set up later →" in onboarding top bar | Guided tour on Overview |
| Direct journey | `App` view `journey` | Scorecard / default workspace |
| Connectors only | `IntegrationSetupPage` | Returns to journey after setup |

**Benchmark handoff:** Onboarding passes `OnboardingBenchmarkValues` into `PatriotPayJourney` via `initialBenchmark`. That seeds the **first intelligence row** (benchmark block) on the Intelligence timeline — no hardcoded demo intelligence rows.

---

## 3. Onboarding chat (`FuelOnboardingChat.tsx`)

Full-screen chat with a **right sidebar**: "What's getting set up" progress + York IE Value Creation Engine stages.

### 3.1 First message (company detected)

Tone: direct, confident, operator-to-operator — not salesy.

```
👋 Found you.

I'm Fuel — your smart advisor. The kind that doesn't take a percentage of your company.

You're signed in as **{email}** — so I pulled **{company}** from your domain.

Before I can show you anything useful, I need 60 seconds of your time. Confirm what I found,
fill in what I missed, and I'll build you a benchmark profile against real peers — not generic
industry averages.

Does this look right?
```

Chip: **Yes, review my profile →**

If no company from email (personal domain): shorter intro with same advisor line, then ask for company name.

### 3.2 Sidebar progress items

| Step | Label | Completed when |
|------|--------|----------------|
| profile | Your company profile | Profile claimed / benchmarks kickoff |
| benchmarks | Your growth benchmarks | Benchmark wizard finished |
| tracks | Your Fuel journey tracks | After "See how Fuel helps →" |
| integrations | Intelligence generation | Launch / start journey |
| config | Your workspace config | Launch / start journey |

### 3.3 Chat steps (in order)

1. **Company detection** — infer from business email domain; overrides e.g. `patriotpay.com` → Patriot Pay.
2. **Profile intro** — "Review your profile →" opens inline **Profile form card**.
3. **Profile form** — One compact form (not step-by-step): company, what they do, business model, industry, location, website, LinkedIn, funding rounds, optional notes. CTA: **Create my profile**.
4. **Benchmark wizard** — One metric at a time (~9 fields): ARR, ARR growth, NRR, logo retention, gross margin, burn, cash, headcount, paying customers. Live peer bar per field. CTAs: **Lock in & next →** / **See my full benchmark →**.
5. **Benchmark results** — Startup journey stages (7 stages), KPI snapshot (P25–P90), suggested playbooks, **What's next** insight bubble.
6. **See how Fuel helps →** — Workspace preview card (Data room, Intelligence, Research, Fuel AI, Playbooks).
7. **Launch message** — "That's your foundation. Launch when you're ready…" + **Start my journey →**.
8. **Handoff** — User must click CTA (no auto-redirect). Brief typing state, then route to workspace.

**Not in primary demo path:** York services upsell, integration selector, and older multi-step profile questionnaire still exist in code but the demo flow compresses to profile form → benchmark → launch.

### 3.4 Voice guidelines

Documented in `.cursor/skills/fuel-onboarding-voice/SKILL.md`.

- Lead with what Fuel already knows (`Found you.`, `Now for the good part.`)
- Specific cohorts, time boxes (`60 seconds`, `~3 minutes`)
- Plain provenance (`From homepage positioning`) — avoid "looks like" / uncertain copy
- **Intelligence** (not "Signals") in user-facing new copy
- **Scorecard** for the journey tab (not Pulse / Your Journey)

---

## 4. Workspace entry

### 4.1 Intelligence loading (`SignalsLoadingPage`)

Shown when `initialPage="signals-loading-tour"`.

- Title: **Generating intelligence based on your profile**
- Steps: Reading company profile → Linking York account context → Preparing benchmark and intelligence timeline
- Then opens **Intelligence** tab and starts **guided tour** (if `signals-loading-tour`)

### 4.2 Profile complete flag

After onboarding path: `profileComplete = true` → Overview hides "Finish profile" banner; Review profile panel hidden; tour may skip the finish-profile step.

---

## 5. Workspace layout (`PatriotPayJourney.tsx`)

### 5.1 Shell

- **Left nav:** Workspace switcher, Connector Hub link, credit indicator + popover
- **Top:** Company header (name, domain, meta), Playbooks ▾, Generate brief
- **Tabs:** Overview · Intelligence · Initiatives · Data Room · Scorecard
- **Credits:** `CreditProvider` wraps workspace — indicator, popover, block banner, upgrade modal, toasts

### 5.2 Top tabs

| Tab | Internal key | Purpose |
|-----|--------------|---------|
| **Overview** | `overview` | Company home: metrics, about, details, funding rounds, placeholders for intelligence/initiatives/context |
| **Intelligence** | `signals` | Sources, benchmark strip, intelligence timeline (merged former Context Feed) |
| **Initiatives** | `initiatives` | Recommended work from gaps + intelligence (placeholder in demo) |
| **Data Room** | `data-room` | Private documents (pitch deck, models, etc.) used as evidence |
| **Scorecard** | `journey` | York IE value creation tracks: Development, Marketing, RevOps, FinOps |

`context-feed` route redirects to Intelligence — no separate Context Feed tab.

### 5.3 Overview tab

- **Metric row:** Total funding, funding rounds, last funding, founded
- **Main column:** About, Company details, Funding rounds (green column headers, white/gray cell values), Recent Intelligence, Initiatives placeholders
- **Side column:** Context, Similar companies, Data sources, Playbooks explainer
- **If profile incomplete:** Green "Finish profile" banner → profile wizard
- **Spacing:** Looser gaps and panel padding (demo polish) so the tab feels less busy

### 5.4 Intelligence tab

**When profile complete (post-onboarding demo):**

1. Credit block banner (if daily limit hit)
2. Private data compact strip (update period)
3. Document notice banner (if applicable)
4. **Sources panel** — header + **+ Add a source** + inline add form (title, description, optional document attach)
5. **Intelligence timeline** — rows sorted by `updatedAtMs` descending; benchmark group vs other intelligence
6. **Connectors upsell** — bottom of tab (moved out of Sources panel): Google Meet, Zoom, LinkedIn, Salesforce, Gmail + All connectors
7. **Provenance sidebar** — opens when selecting a timeline row (not on generate)

**When profile incomplete:**

- Cohort benchmark panel (no overlay yet)
- Sources + timeline (timeline may be hidden until profile complete depending on state)
- Same connectors upsell at bottom

**Add source flow**

- Document attach is **staged** in the form — no intelligence on file select alone
- **Generate intelligence** creates **one** intelligence item (title + description + doc merged)
- Document saved to Data Room on generate
- New row **highlights + scrolls** into view; provenance sidebar does **not** auto-open

**Timeline content sources (demo v1)**

- Benchmark from onboarding (`initialBenchmark`) or "Log benchmark data"
- User-generated from Add a source / document upload
- **No** hardcoded `INITIAL_INTELLIGENCE_ITEMS`

### 5.5 Data Room tab

- Slots for document types (pitch deck, financial model, etc.)
- Upload triggers credit cost (`docUpload` = 15 credits) and can generate intelligence items
- Linked from tour step and sources attach dropdown

### 5.6 Scorecard tab

Four tracks with York IE + integration context:

- **Development** — Jira/Linear, Launchpad, Pulse
- **Marketing** — GA4, ads, SEO, campaigns
- **RevOps** — HubSpot/Salesforce, pipeline
- **FinOps** — QuickBooks, Stripe, runway

Sub-pages: `development-setup`, `marketing-setup`, track detail views.

### 5.7 Initiatives tab

Placeholder: initiatives recommended from benchmark gaps, York context, and generated intelligence once setup is complete.

### 5.8 Connector Hub

- Full connectors page (`ConnectorsPage`) from nav or "All connectors"
- Separate `IntegrationSetupPage` for standalone integration flow from `App`

---

## 6. Guided tour (demo v1 steps)

| # | Tab | Target | Topic |
|---|-----|--------|--------|
| 1 | Overview | overview | Company home base |
| 2 | Intelligence | signals | Sources + benchmarks + insights |
| 3 | Intelligence | add-source | Manual sources and uploads |
| 4 | Data Room | data-room | Private files as evidence |
| 5 | Initiatives | initiatives | Insights → action |
| 6 | Overview | playbooks | Playbooks header button |
| 7 | Overview | finish-profile | Complete profile (skipped if already complete from onboarding) |

Tour uses `GuidedTourOverlay` with highlight on `data-tour-target` elements; popover anchors to highlighted control (e.g. + Add a source).

---

## 7. Credits & pricing

### 7.1 Positioning copy

| Constant | Text |
|----------|------|
| `PRO_TAGLINE` | An AI advisor that doesn't take percentage points of your company. |
| `PRO_PRICE_FRAME` | From $25/mo — a fraction of advisory retainers, zero equity dilution. |

**Pro subscription UI**

- Monthly: **$30/mo**
- Annual: **$300/yr** ($25/mo · 2 months free) — recommended
- CTA: **Start your AI advisor · $25/mo billed yearly** / **$30/mo**

### 7.2 Plans & limits (current code — `constants.ts`)

| Plan | Monthly credits | Daily soft cap | Cooldown when daily cap hit |
|------|-----------------|----------------|------------------------------|
| **Free** | 250 | 50 | 24 hours |
| **Pro** | 2,000 | 200 | 6 hours |

> Note: `docs/credit-system-spec.md` lists older numbers (e.g. Pro 4,000 / daily 400). **Code in `constants.ts` is the demo v1 source of truth.**

### 7.3 Credit costs per action

| Action | Credits | User-facing label |
|--------|---------|-------------------|
| Document upload + signal | 15 | Doc upload + signal |
| AI chat message | 3 | AI chat message |
| Generate source (manual) | 8 | Generate source |
| Playbook run | 40 | Playbook run |
| Crunchbase enrichment | 5 | Crunchbase enrichment |

### 7.4 Deduction order (demo v1 code)

1. **Monthly subscription pool first** (`monthlyUsed` increases up to `monthlyLimit`)
2. **Top-up balance second** (if monthly room exhausted)
3. **Daily usage** increments by full action cost
4. If `dailyUsed >= dailyLimit` → set `blockUntil = now + blockMs`

Top-up footnote: *Credits added instantly · never expire · monthly credits used first · unblocks your day immediately*

**Pro top-up on daily block:** Adding credits resets `dailyUsed`, clears block, shows special toast — user can continue same day.

### 7.5 When generation is blocked

- Monthly pool empty (`totalRemaining <= 0`), **or**
- Daily cooldown active (`blockUntil` in the future)

**Free user blocked:** Upgrade to Pro or wait (24h production / shortened in demo).  
**Pro user blocked:** Top up or wait (6h production / shortened in demo).

### 7.6 Top-up packs (Pro only)

| Pack | Credits | Price | Notes |
|------|---------|-------|-------|
| Sprint | 1,000 | $12 | Focused session |
| Builder | 2,000 | $20 | Save 17% |
| Growth | 5,000 | $48 | Most popular · Save 20% |
| Scale | 8,000 | $77 | Fundraising / diligence sprint · Save 20% |

Free users see gate: top-ups unlock on Pro.

### 7.7 UI surfaces

| Surface | Behavior |
|---------|----------|
| **Credit indicator** (sidebar) | Plan badge, `available / total`, progress bar |
| **Credit popover** | Click indicator; states: healthy, running low, monthly empty, daily blocked, just unblocked |
| **Block banner** | Top of Intelligence when daily blocked |
| **Upgrade modal** | Tabs: Upgrade to Pro · Top up credits |
| **Profile menu** | Usage breakdown, upgrade / top-up links |
| **Toasts** | Low balance, welcome to Pro, top-up added, unblocked |

### 7.8 Demo overlay (`demoFlow.ts`)

For live demos only — does not change production rules in spec:

- **Accelerated waits:** Free block ~2 min, Pro block ~45 sec (UI copy still says 24h / 6h)
- **Tighter daily budgets:** ~2 doc uploads on Free, ~3 on Pro before daily pause
- Demo mode flag via `isDemoCreditMode()`

---

## 8. Terminology (use consistently)

| Use | Avoid in new copy |
|-----|-------------------|
| Intelligence (tab & timeline) | Signals (as tab name), Context Feed (tab) |
| Scorecard | Pulse, Your Journey |
| Data room | — |
| Generate intelligence | Auto-generate on upload |
| Real peers / cohort | Generic industry averages |
| Start my journey → | Auto-redirect without CTA |
| York IE workspace already connected | "Link your York account" (for existing customers) |

---

## 9. Key files

| Area | Path |
|------|------|
| App routing | `src/app/App.tsx` |
| Onboarding chat | `src/app/FuelOnboardingChat.tsx` |
| Workspace | `src/app/PatriotPayJourney.tsx`, `PatriotPayJourney.css` |
| Credits | `src/app/credits/*` |
| Credit spec (partially stale) | `docs/credit-system-spec.md` |
| Onboarding voice skill | `.cursor/skills/fuel-onboarding-voice/SKILL.md` |
| Design tokens skill | `.cursor/skills/fuel-design-system/SKILL.md` |
| Product brief | `src/imports/pasted_text/fuel-2-0-product-brief.md` |
| Onboarding story review | `onboarding-story-review.md` |

---

## 10. Demo v1 checklist (what's intentionally in / out)

**In scope**

- Chat onboarding → benchmark seed → Intelligence tab
- Sources + timeline on one tab
- Data Room + document → intelligence
- Credits gating with Pro / top-up story
- Guided tour including Add a source & Data Room
- Overview spacing + funding table styling
- Equity-free advisor messaging (onboarding opener + Pro upgrade)

**Out of scope / placeholder**

- Full Initiatives CRUD
- Live connector OAuth (drawer UI only)
- Production Stripe billing
- Real backend credit ledger
- Non-demo intelligence seed data

---

*Last updated for demo/v1 branch context — Shreya product notes.*
