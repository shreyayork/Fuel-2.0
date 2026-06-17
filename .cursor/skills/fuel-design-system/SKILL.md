---
name: fuel-design-system
description: >-
  Apply the Fuel 2.0 standard color scheme and typography when editing chat,
  onboarding, dashboard, or credits UI. Use when adding or changing styles,
  colors, fonts, labels, cards, or bubbles in this project.
---

# Fuel Design System

## When to use

Load this skill before styling any Fuel chat, onboarding, PatriotPayJourney, or credits surface.

## Color rules (strict)

Use **only** these text and surface roles. Do not introduce new grays or greens.

| Role | Token | Hex | Use for |
|------|-------|-----|---------|
| Primary text | `fuel.text` / `--fuel-text` | `#F2F5F2` | Headings, body, values, emphasis, percentile explanations |
| Muted text | `fuel.textMuted` / `--fuel-text-muted` | `#8FA99A` | Labels, hints, metadata, section eyebrows, secondary copy |
| Accent | `fuel.accent` / `--fuel-accent` | `#00B48A` | Buttons, links, chart bars, dots, active borders — **not** body text |
| Surface | `fuel.surface` | `#1F3140` | Cards, bubbles, panels |
| Inset | `fuel.surfaceInset` | `#0B1720` | Inputs, nested wells |

### Banned for text

Do **not** use as font colors: `#3DD68C`, `#8FE8D2`, `#6F8798`, `#556878`, `#D0DDD8`, `#B8C9C0`.

Track/category colors (RevOps orange, FinOps purple) are allowed **only** for track badges and charts — not for general copy.

## Typography

- **Section label** (e.g. "Your peer cohort", "How Fuel helps"): `textMuted`, 10px, uppercase, letter-spacing `0.12em`, weight 800
- **Headline**: `text`, 14–17px, weight 700–800
- **Body**: `text` or `textMuted` — never mix more than these two on one card
- **Bold in markdown**: same as surrounding line color, weight 700 only

## Cards and bubbles

Fuel help bubbles and KPI cards use the **same** surface as other cards:

```tsx
background: fuel.surface,
border: `1px solid ${fuel.border}`,
```

No green-tinted gradients on chat bubbles unless the whole card is a primary CTA.

## Percentile copy

Keep to two short lines above the bar:

1. `{value} · {ordinal} percentile` — muted or primary
2. **White (`fuel.text`)**: `{n}% of peers are at or below you` plus one short cohort context clause

Explain percentiles plainly:

- **1st percentile** = almost no peers are below you; you're at the bottom of the cohort
- **50th percentile** = half of peers are at or below you (median)
- **99th percentile** = almost everyone is below you; you're at the top

## Implementation

```tsx
import { fuel } from "./fuelTokens";
// or CSS: color: var(--fuel-text-muted);
```

Tokens live in `src/app/fuelTokens.ts` and `src/styles/fuel-tokens.css`.

## Checklist before shipping UI

- [ ] At most two text colors on a single card
- [ ] Section labels are muted, not accent green
- [ ] No new hex grays or mint greens for text
- [ ] Accent reserved for interactive/chart elements
- [ ] Percentile helper line uses `fuel.text` (white)
