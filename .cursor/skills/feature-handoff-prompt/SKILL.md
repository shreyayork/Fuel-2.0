---
name: feature-handoff-prompt
description: >-
  Generates cross-repo feature replication prompts from the current codebase.
  Use when the user asks to create a prompt, handoff spec, or replication guide
  for implementing a feature in a different repository — including layout, user
  flows, business logic, storage concepts, and AI prompt contracts when summaries
  or analysis are AI-generated.
---

# Generate Feature Handoff Prompt

Produce a **copy-paste prompt** the user can give to an agent in another repo. The prompt must describe **what to build**, not how this repo built it.

## When to use

Trigger when the user asks to:
- Create a prompt for a feature in another repo / different codebase
- Replicate, port, or hand off a feature
- Document layout + logic without implementation details from this project

## Workflow

1. **Identify the feature** in the current codebase (read relevant components, state, and flows).
2. **Ask only if blocked** — e.g. feature name unclear, multiple variants, or scope ambiguous.
3. **Output one complete prompt** using the template below. Do not implement code unless asked.

## Hard rules (never include in output)

| Exclude | Why |
|---------|-----|
| API routes, REST paths, GraphQL operation names | Target repo has different backend |
| DB table/column names, SQL, ORM model names | Target repo has different schema |
| File paths, component names, CSS classes from source repo | Implementation-specific |
| Design tokens, hex colors, font families, font sizes, spacing tokens | Target repo has its own design system |
| Placeholder syntax like `{monthlyUsed}` or `{count}` | Use plain-language calculations instead |

## Allowed (use sparingly)

- **Semantic hierarchy hints** — e.g. "section title, roughly h3/h4 scale — not page-level h1"
- **Relative placement** — "below main tabs", "right sidebar", "header next to Ask AI button"
- **Conceptual storage** — "persist completion timestamp client-side with a 24-hour cooldown" (no key names required unless behavior depends on exact semantics; prefer describing behavior over literal keys)
- **Field inventories** — what data a form or record holds, in plain language
- **User-visible copy** — exact button labels and step titles/bodies when they define product behavior
- **AI system + user prompt text** — full prompt strings when the feature depends on model-generated summaries, analysis, or recommendations (required — see below)

## Mandatory: AI prompt sections

Whenever the feature includes **AI-generated prose** — summaries, analysis paragraphs, advisor copy, cohort reads, focus areas, briefs, signal narratives, or similar — the handoff **must** include a dedicated section (Part 5 or nested under it):

### Part 5 — AI generation (required when analysis is model-generated)

For **each** AI-backed surface, document:

1. **When to call** — triggers, skip conditions, empty-state fallback (no model call)
2. **Input assembly** — conceptual JSON payload: every field, omit-if-empty rules, how snapshot/answers/intel are mapped
3. **Output contract** — strict JSON shape the UI renders (paragraphs, rows, titles)
4. **System prompt** — full text: role, tone, constraints, forbidden behaviors (no invented metrics)
5. **User prompt template** — full text with plain-language placeholders describing where serialized input is inserted (not `{var}` syntax — describe "insert the assembled company context JSON here")
6. **Frontend behavior** — loading skeleton, error retry, stale cache, where rendered
7. **Backend behavior** — validate input, call model, parse JSON, cache key concept (company + period), TTL or invalidation on benchmark update
8. **Fallback** — what to show if model fails or returns invalid JSON

**Do not** document template-string or if/else copy generation as the primary approach when the product intent is AI analysis. If the source repo still uses templates as a prototype, label them **legacy fallback only** and specify the AI path as the target.

**Combine related analysis blocks** into one model call when they share the same input context (e.g. cohort position + areas to watch in one response).

## Output structure

Use this template. Adapt section titles to the feature; omit sections that do not apply.

```markdown
# [Feature name] — replication prompt for [target context if known]

## Goal
One paragraph: what the user should have when done, and what changed vs any prior version (if updating).

## What is NOT in scope
Bullets: parent shell, unrelated tabs, design system, APIs, etc.

---

## Part 1 — Background / how it works
Explain data and behavior **before** UI. Credits, tour state, initiative lifecycle, etc.
Use plain sentences, not code.

## Part 2 — What to persist (conceptual)
What flags, timestamps, or records matter; retention/cooldown rules; client vs server if relevant.
No table names.

## Part 3 — Surfaces and layout
For each UI block:
- **Placement** in the page/shell
- **Structure** (sections, columns, drawers — not pixel values)
- **Controls** (buttons, toggles, filters) with labels
- **Empty/loading/building states**
- **Hierarchy hint** only where misuse would break UX (title vs body)

## Part 4 — User flows and logic
Step-by-step: triggers, conditions, branching, what happens on success/cancel/skip.
Use "when / then" prose.

## Part 5 — [Feature-specific sections]
e.g. tour steps table, form fields, calculation rules.

## Part 5b — AI generation (include when any analysis/summary is model-generated)
When to call, input JSON, output JSON, system prompt, user prompt template, frontend + backend flow, cache, fallback.

## Part 6 — End-to-end flow
Single narrative from entry → action → storage → display.

## QA checklist
- [ ] Testable bullets the implementer can verify
```

## Writing quality bar

1. **Context before UI** — Part 1 explains why the feature exists and how state moves.
2. **Plain-language math** — "remaining credits = monthly allowance minus usage this month, floored at zero" not template variables.
3. **Complete steps** — For tours/wizards, list every step: target area, page/view to show, title, body copy.
4. **Visibility rules** — Explicit conditions for show/hide (profile incomplete, cooldown, building phase, etc.).
5. **Migration notes** — If replacing an older feature, include a short "was → now" mapping.
6. **No filler** — Every paragraph should help someone build in an unfamiliar codebase.
7. **AI completeness** — If the UI says "Fuel analysis" or similar, include full prompts; never leave AI as "call the model" without prompt text.

## Example triggers → actions

| User says | Agent does |
|-----------|------------|
| "Prompt for the Usage tab in the other repo" | Read account usage UI + credit logic → full prompt |
| "Prompt to update the workspace tour" | Read tour steps, header button, skip logic → prompt with old vs new mapping |
| "Handoff for Initiatives drawer" | Read initiatives UI + fields + advisor linking → prompt |
| "Handoff for company full summary / cohort position" | Read brief page + snapshot + analysis sections → prompt with AI input/output + full system/user prompts |

## Reference examples (patterns, not content to copy)

- **Initiatives**: layout of list + drawers, suggested inbox, milestone notes, advisor link behavior, AI suggestion fields — no SQL.
- **Usage tab**: credit deduction order, daily cap, six UI blocks with plain-language stats — no API paths.
- **Workspace tour**: eight steps, header Tour button visibility, 24h cooldown, overview-ready entry, coachmark — no CSS tokens.
- **Company brief analysis**: one AI call for cohort position + areas to watch; input JSON from snapshot + profile; output paragraphs + table rows; cache per company per benchmark period.

For long features, keep SKILL.md guidance and put an optional `examples.md` in this skill folder with abbreviated samples.

## After generating

Deliver the prompt in a single fenced markdown block or as the main response body so the user can copy it. Offer to narrow scope or add a section if they name a sub-feature.
