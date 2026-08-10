# Fuel 2.0 Design System — README

## Purpose

This directory documents the **existing visual language** of the Fuel 2.0 application. It was created by auditing the live codebase — not by redesigning the product.

**The running application is the source of truth.** These files describe what already exists so future development can stay consistent.

## What is in this directory

| File | Purpose |
|------|---------|
| `DESIGN_SYSTEM.md` | Human-readable reference: colors, typography, spacing, components, patterns |
| `design-tokens.json` | Machine-readable token export for tooling, docs, and future codegen |
| `README.md` | This file — how to use and extend the design system |

Related existing assets (not modified by this audit):

- `src/styles/fuel-tokens.css` — canonical Fuel CSS variables
- `src/app/PatriotPayJourney.css` — app shell + workspace UI tokens
- `src/app/fuelTokens.ts` / `src/app/statusSystem.ts` — TS references for charts & status
- `src/app/design-system/DesignSystemPage.tsx` — in-app status indicator preview (`?design-system`)
- `docs/Fuel-Color-Design-System.html` / `.pdf` — color-focused design doc

## How this was extracted

1. Scanned all CSS, TS token files, and component styles under `src/`
2. Mapped recurring CSS custom properties (`--bg`, `--text-1`, `--status-good`, etc.)
3. Recorded hard-coded values that repeat across modules (radius, spacing, z-index)
4. Inventoried component classes and Radix/shadcn primitives
5. **Did not change any product source files**

## Token structure

Tokens are grouped by category in `design-tokens.json`:

- `color` — brand, status, shell (light/dark), buttons, overlays, charts
- `typography` — families, sizes, weights, semantic text roles
- `spacing` — scale + layout-specific padding/gaps
- `radius` — border-radius scale + per-component usage
- `shadow` — elevation tokens
- `border` — widths and styles
- `layout` — shell dimensions, drawer widths, max widths
- `breakpoint` — responsive thresholds from `responsive.css`
- `zIndex` — overlay stacking order
- `motion` — durations, easing, keyframe names
- `icon` — Lucide via `FuelIcon`
- `component` — summarized variant specs

## Naming conventions

Fuel uses **two parallel token layers**:

### 1. Fuel shell tokens (primary product UI)

Prefix pattern: `--text-1`, `--panel`, `--btn-primary-bg`, `--status-good`

Defined in:

- `src/styles/fuel-tokens.css`
- `src/app/PatriotPayJourney.css`

Theme switch: `html[data-theme="light"]` / `html[data-theme="dark"]`

### 2. Shadcn/Radix tokens (shared primitives)

Prefix pattern: `--background`, `--primary`, `--muted`, `--destructive`

Defined in: `src/styles/theme.css`

Used by: `src/app/components/ui/*`

**Do not conflate** `--accent` (Fuel = green status) with shadcn `--accent` (neutral gray surface).

## Color system

- **Brand accent:** `#12b886` (`--fuel-accent`) — same as good status
- **Status (exactly three):** good `#12b886`, watch `#f5a623`, bad `#e05c5c`
- **Shell:** `--bg`, `--bg-main`, `--panel`, `--panel-border`, `--text-1` through `--text-4`
- **Buttons:** `--btn-primary-*`, `--btn-secondary-*`, `--btn-tertiary-*` (theme-specific)
- **Charts:** benchmark gradients documented in `design-tokens.json` → `color.chart`

See `DESIGN_SYSTEM.md` § Colors and `docs/Fuel-Color-Design-System.pdf` for full hex tables.

## Typography system

- **Primary family:** Inter (Google Fonts, `src/styles/fonts.css`)
- **Monospace:** JetBrains Mono (imported, used sparingly)
- **Base size:** 14px body; scales to 15–17px on very large monitors
- **Investor module** uses scoped vars: `--inv-label`, `--inv-h1`, `--inv-body`, etc.

## Spacing system

No single 4px grid is enforced globally. The app uses a **practical scale** (4, 6, 7, 8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32px) extracted from repeated padding/gap values.

Content padding adapts via `--fuel-content-padding-x/y` in `responsive.css`.

## Component system

Product UI is mostly **custom CSS classes** in `PatriotPayJourney.css` and feature CSS files. Shadcn components exist for some primitives but are not the dominant styling layer for the main workspace.

Key patterns:

- **Buttons:** shell tokens + class variants (`.journey-primary-btn`, `.investor-suggested-primary`, `.form-confirm-btn`)
- **Status:** `.fuel-status-badge--*`, `.fuel-status-dot--*` (`status-indicators.css`)
- **Drawers:** 40vw right panels (`drawer-layout.css`)
- **Tabs:** `.tabs` / `.tab` / `.tab.active` in workspace header

## Status system

Exactly **three** semantic status colors app-wide. See `src/app/statusSystem.ts` and `styles/status-indicators.css`.

| Kind | Hex | Meaning |
|------|-----|---------|
| good | `#12b886` | Stable, complete, strong, success |
| watch | `#f5a623` | Attention, building, median |
| bad | `#e05c5c` | Critical, risk, concern |

## Responsive system

| Breakpoint | Behavior |
|------------|----------|
| ≤640px | Full-width drawers, tighter content padding |
| ≤720px | Some grid collapses |
| ≤900px | Mobile nav, slide-out sidebar, fluid drawer padding |
| ≥1600px | Body font-size bump (no layout zoom) |

## How developers should use these tokens

### For new Fuel workspace UI

1. Prefer existing CSS variables from `fuel-tokens.css` / `PatriotPayJourney.css`
2. Use status utilities from `status-indicators.css` — never add a fourth status color
3. Match drawer width via `--fuel-side-panel-width` (40vw)
4. Reference `design-tokens.json` when unsure of an existing value

### For new shadcn-based UI

Use `theme.css` tokens and `components/ui/*` patterns.

### What NOT to do

- **Do not change existing components** to “match” this doc if they already differ slightly — update the doc instead
- **Do not normalize** spacing or colors to “cleaner” values
- **Do not replace** custom classes with shadcn without an explicit refactor task

## How to add future tokens

1. Implement the style in product CSS using a **new CSS custom property** when the value will repeat
2. Add the token to `src/styles/fuel-tokens.css` (if global) or the feature CSS file
3. Update `design-tokens.json` and `DESIGN_SYSTEM.md` in the same PR
4. If TS/chart code needs the value, add to `fuelTokens.ts`

## Important rule

> **Existing UI must not be changed simply to match the design-system file.**

This design system is documentation of the current app. If the app and docs diverge, **the app wins** until a deliberate UI change is approved.

## Validation performed

- Audit based on source files only — no product CSS/TS/TSX modified
- No routes, logic, or component behavior changed
- Token values traced to implementation (not invented)

## Preview

- In-app status docs: open app with `?design-system`
- Color PDF: `docs/Fuel-Color-Design-System.pdf`
