---
name: fuel-founder-copy
description: >-
  Write founder-facing Fuel copy in plain language — full words, no unexplained
  acronyms. Use when editing ScorecardV2 glance focus, advisor summaries,
  track insights, onboarding helper text, or any prose shown to SaaS founders
  who may not know operator jargon (DRI, ICP, NRR, etc.).
---

# Fuel founder copy (plain language)

## When to use

Load this skill before writing or editing **prose** (sentences and paragraphs) in:

- `ScorecardV2.tsx` — `glanceFocus`, `glanceStrength`, `glanceNeedsWork`, advisor summaries, recommended-action subcopy
- `CategoryGlanceRow` and track drilldown insight paragraphs
- Onboarding or dashboard **narrative** text (not compact UI labels)

Pair with [fuel-onboarding-voice](../fuel-onboarding-voice/SKILL.md) for tone; this skill governs **clarity and spelling out terms**.

## Rule in one line

**If a founder wouldn't say it out loud to their co-founder without explaining it, spell it out or rewrite it.**

## Abbreviations in prose

| Don't write (in sentences) | Write instead |
|----------------------------|---------------|
| DRI | a clear owner · someone in charge · point person |
| demand gen | demand generation |
| top-of-funnel | top of the funnel |
| ICP | ideal customer profile |
| NRR | net revenue retention |
| CAC / LTV | customer acquisition cost · customer lifetime value |
| GTM (in a sentence) | go-to-market |
| G&A (in a sentence) | finance and operations |
| RevOps / FinOps (in a sentence) | revenue operations · finance operations |
| YoY | year over year |
| FTE | full-time employee · team member |

## Where abbreviations are OK

- **Track badges and nav labels** when they match the product: `R&D`, `GTM`, `G&A` on chips, tabs, or column headers
- **Metric field labels** in forms and tables: `ARR`, `NRR` (with context nearby)
- **CRM**, **SaaS**, **API** when the audience clearly expects them

Never use internal-only terms in founder prose: `mock`, `demo mode`, `pretend`, `intel` (use **intelligence**).

## Track names in sentences

Use readable names with normal capitalization:

| Category id | In prose |
|-------------|----------|
| `dev` | Product & engineering |
| `mkt` | Go-to-market |
| `rev` | Ops & finance |

Not: `go-to-market is at 60` (lowercase) · not `GTM is at 60` in a summary sentence.

## Sentence patterns (glance focus)

Good:

- *Go-to-market is at 60/100 — fixable gaps if you focus now. Marketing isn't owned yet — put someone clearly in charge so demand generation doesn't stall.*
- *Product & engineering is solid (79/100). Your top product bet right now: quality and reliability.*

Bad:

- *GTM is at 60. Assign a DRI for demand gen.*
- *R&D is in good shape at 79. Engineering is solo / founder-built, and you flagged quality. Gross margin (blended).*

Guidelines:

1. **Two sentences max** for `glanceFocus` — opener (score + vs peers) + one actionable focus.
2. **No raw metric labels** dumped without context (`Gross margin (blended)` alone).
3. **Actionable second sentence** — what to do, not jargon.

## Implementation

- Prefer writing plain copy at the source (`humanizeFounderFocus`, `buildCategoryFocusNarrative`).
- Run generated prose through `founderPlainCopy()` in `ScorecardV2.tsx` as a safety net before display.
- When adding new focus lines, read them aloud; expand any acronym you had to mentally translate.

## Checklist before shipping founder prose

- [ ] No DRI, ICP, NRR, CAC, LTV, YoY, FTE in sentences unless expanded
- [ ] Track names capitalized and spelled out in summaries
- [ ] "intelligence" not "intel" in user-visible strings
- [ ] Second sentence tells the founder what matters or what to do next
- [ ] Readable by a first-time SaaS founder who isn't deep in operator Twitter
