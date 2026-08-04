# Design System — Fuel by York IE

## Visual Theme

Dark charcoal onboarding split with mint accent; light cool-gray app shell with emerald primary actions. Operator density, soft 8–12px radii, restrained accent use.

## Colors

| Token | Value | Role |
|---|---|---|
| Onboarding bg | `#0C1A25` | Left form panel |
| Accent | `#12b886` | Primary CTA, progress, focus (same as status-good) |
| Accent gradient | `rgb(0,180,138)` → `rgb(236,214,127)` | Primary buttons |
| Text | `#F2F5F2` / `#1A2332` | Onboarding / app body |
| Muted | `#8FA99A` / `#6B7C8C` | Secondary copy, neutral metadata |
| Surface | `#1F3140` / `#FFFFFF` | Inputs / panels |

---

## Status indicators (canonical — three colors only)

Every status across the product uses **exactly three colors**. No alternate greens, ambers, or reds for the same meaning.

| Status | Token | Hex | When to use |
|---|---|---|---|
| **Good** | `--status-good` | `#12b886` | Stable, complete, healthy, confirmed, ready, above benchmark, top quartile |
| **Watch** | `--status-watch` | `#f5a623` | Needs attention, in progress, waiting, around median, building, caution |
| **Critical** | `--status-bad` | `#e05c5c` | Blocked, urgent risks, errors, weak, bottom quartile |

### Derived tokens (same hue — no new colors)

| Token | Role |
|---|---|
| `--status-*-dim` | Tinted pill/card backgrounds |
| `--status-*-line` | Borders and ring accents |
| `--status-success` | Alias → `--status-good` |
| `--status-warning` | Alias → `--status-watch` |
| `--status-error` | Alias → `--status-bad` |

**Neutral** states (optional, idle, no data) use `--fuel-text-muted` — not a fourth status color.

### Source files

| File | Purpose |
|---|---|
| `src/styles/fuel-tokens.css` | CSS custom properties |
| `src/styles/status-indicators.css` | Badge, dot, surface utilities |
| `src/app/statusSystem.ts` | TS helpers, mappings, class names |
| `src/app/fuelTokens.ts` | JS token strings |
| `src/app/design-system/DesignSystemPage.tsx` | Live documentation + examples |

**Preview:** open the app with `?design-system` in the URL.

### CSS utilities

```html
<span class="fuel-status-badge fuel-status-badge--good">Stable</span>
<span class="fuel-status-dot fuel-status-dot--watch"></span>
<span class="fuel-status-tone fuel-status-tone--bad">Critical</span>
```

Legacy aliases: `.sc-status-tone-*`, `.sc-status-surface-*` in `overview-ref.css`.

### TypeScript

```ts
import { benchmarkScoreToColor, briefFlagToColor, statusBadgeClass } from "./statusSystem";
```

### Accessibility

- Always pair color with text labels; never status-by-color alone.
- Use `aria-label` on icon-only indicators.
- Critical red meets 4.5:1 on white for normal text; good/watch at 12px+ bold with labels.

---

## Typography

Inter / system sans. Product scale: 11–13px labels, 14–15px body, 28–36px onboarding titles (weight 800).

## Components

- Pill step badges (`Step N of 2`)
- Search select with company rows
- Identity form: full name + role select
- Incomplete-profile banner + section unlock cards
- Sidebar footer: credits + York nudge (gated on profile complete)
- Status badges / dots / surfaces (see above)

## Layout

Split onboarding (50/50). App: left sidebar + main Overview. Incomplete state replaces analytics tracks with unlock cards until profile completion.
