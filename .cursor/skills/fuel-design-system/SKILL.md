---
name: fuel-design-system
description: >-
  Apply Fuel 2.0 colors, borders, spacing, and panel patterns when editing or
  creating any UI — investor dashboard, founder overview, scorecard, R&D/GTM/G&A
  detail, chat, onboarding, or credits. Use when adding pages, widgets, cards,
  tables, or styles so surfaces match overview-panel and scorecard detail widgets.
---

# Fuel Design System

## When to use

Load this skill **before** styling or building any Fuel surface:

- Investor home / portfolios / pipeline / watchlists
- Founder overview, scorecard, R&D · GTM · G&A detail
- Chat, onboarding, credits, account settings

**Do not invent new panel styles.** Reuse the patterns below.

## Canonical references (copy from these)

| Pattern | Where it lives | Use for |
|---------|----------------|---------|
| `.overview-panel` / `.overview-metric-card` | `PatriotPayJourney.css` | Page modules, KPI tiles, dashboard widgets |
| `.sc-detail-widget` / `.sc-glance-row` | `PatriotPayJourney.css` | Track detail cards, glance rows |
| `fuel` tokens | `src/app/fuelTokens.ts`, `src/styles/fuel-tokens.css` | Inline styles / CSS vars |

Prefer **adding** `overview-panel` (or `sc-detail-widget`) to new components instead of hand-rolling borders.

## Color roles (strict)

| Role | Token / CSS | Hex / value | Use for |
|------|-------------|-------------|---------|
| Primary text | `fuel.text` / `--fuel-text` | `#F2F5F2` | Headings, values, emphasis |
| Muted text | `fuel.textMuted` / `--fuel-text-muted` | `#8FA99A` | Labels, hints, eyebrows, secondary copy |
| Body on panels | overview body | `rgb(203, 211, 219)` | Longer panel paragraphs (matches `.overview-panel p`) |
| Accent | `fuel.accent` / `--fuel-accent` | `#00B48A` | Links, CTAs, charts, active borders — **not** body text |
| Panel surface | overview panel | `rgb(23, 38, 50)` / `#172632` | Cards, widgets, modules |
| Inset well | `fuel.surfaceInset` | `#0B1720` / `rgba(10, 20, 28, 0.35)` | Nested rows inside panels |
| Border | overview border | `rgb(38, 57, 71)` | Default panel / card borders |
| Soft border | scorecard `--border` | `rgba(255, 255, 255, 0.09)` | Allowed on scorecard-only surfaces |

### Banned for text

Do **not** use as font colors: `#3DD68C`, `#8FE8D2`, `#6F8798`, `#556878`, `#D0DDD8`, `#B8C9C0`.

Track colors (R&D green, GTM mint, G&A amber) are **only** for track badges/charts — not general copy.

## Borders & radius

```css
/* Default panel / widget — match founder overview */
background: rgb(23, 38, 50);
border: 1px solid rgb(38, 57, 71);
border-radius: 10px;

/* Nested row inside a panel */
background: rgba(10, 20, 28, 0.35);
border: 1px solid rgb(38, 57, 71);
border-radius: 10px;

/* Scorecard glance / detail widget (existing system) */
background: var(--surface-2);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
```

Hover on interactive panels: `border-color: rgba(255, 255, 255, 0.16)` — not a new green border unless it's a primary CTA.

## Spacing

| Context | Gap / padding |
|---------|----------------|
| Page stack (`.overview-tour-page`, investor dashboard) | `gap: 20–24px` |
| Metric / KPI grid | `gap: 16px` |
| Two-column widget grid | `gap: 16px` |
| `.overview-panel` padding | `22px 24px` |
| `.overview-metric-card` padding | `20px 22px`, `min-height: 88px` |
| `.sc-detail-widget` padding | `16px 18px` |
| `.content` page padding | `24px 28px 80px` (already on shell) |
| Section title → subtitle | `4px` |
| Label → value in KPI | `10px` (margin-bottom on label) |

Do not invent `gap: 10px` / `12px` panel grids when the sibling page uses `16px` / `24px`.

## Typography

- **Section eyebrow / label**: muted, `10–10.5px`, uppercase, `letter-spacing: 0.08–0.12em`, weight 800
- **Section / widget title**: primary, `14–15px`, weight 800
- **Page H1**: primary, `24px`, weight 800
- **KPI value**: primary, `22px` (overview metric) or `17–18px` for compact
- **Body**: primary or muted — at most **two** text colors on one card
- **View all / secondary button**: match `.overview-panel-head button` — `11px`, weight 800, `padding: 7px 10px`, border `rgb(38, 57, 71)`

## Buttons

```css
/* Ghost / View all — overview-panel-head button */
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgb(38, 57, 71);
border-radius: 7px;
color: rgb(203, 211, 219);
font-size: 11px;
font-weight: 800;
padding: 7px 10px;

/* Primary CTA only */
background: #00B48A;
border: 1px solid #00B48A;
color: #07131C;
```

## Modular page pattern

Home / dashboard pages should be **pulse + View all**, not one long dump:

1. Header (eyebrow + H1 + short lede)
2. KPI row (`.overview-metric-card`)
3. Compact widgets (`.overview-panel`) with **View all →** to a dedicated sidebar page
4. Full tables / boards / suggestion cards live on those dedicated pages

## Implementation

```tsx
import { fuel } from "./fuelTokens";
// CSS: color: var(--fuel-text-muted);
// Prefer className="overview-panel" over custom surface CSS
```

## Checklist before shipping UI

- [ ] Panels use `.overview-panel` or identical border/surface (`rgb(23, 38, 50)` + `rgb(38, 57, 71)` + `10px` radius)
- [ ] Nested rows use inset + same border color
- [ ] Page gap is ~24px; widget grids use 16px
- [ ] At most two text colors on a card; eyebrows are muted, not accent green
- [ ] Accent reserved for interactive/chart elements and primary CTAs
- [ ] No new hex grays or mint greens for text
- [ ] View-all buttons match overview secondary button style
- [ ] New long content goes on its own page, not stacked on home
