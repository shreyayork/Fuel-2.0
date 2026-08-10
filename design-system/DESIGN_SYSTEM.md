# Fuel 2.0 — Design System

**Audit date:** August 10, 2026  
**Scope:** Entire application — authentication, onboarding, founder workspace, investor dashboard, drawers, modals, forms, charts, credits, settings  
**Rule:** This document describes the **current** UI. It is not a redesign.

---

## Table of contents

1. [Source of truth](#1-source-of-truth)
2. [Colors](#2-colors)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Layout](#5-layout)
6. [Border radius](#6-border-radius)
7. [Shadows & elevation](#7-shadows--elevation)
8. [Borders](#8-borders)
9. [Buttons](#9-buttons)
10. [Inputs & form controls](#10-inputs--form-controls)
11. [Tabs & navigation](#11-tabs--navigation)
12. [Cards & containers](#12-cards--containers)
13. [Status system](#13-status-system)
14. [Data visualization](#14-data-visualization)
15. [Tables](#15-tables)
16. [Drawers, modals & overlays](#16-drawers-modals--overlays)
17. [Icons](#17-icons)
18. [Responsive behavior](#18-responsive-behavior)
19. [Motion & interaction](#19-motion--interaction)
20. [Component inventory](#20-component-inventory)
21. [Machine-readable tokens](#21-machine-readable-tokens)
22. [Duplication notes](#22-duplication-notes)
23. [Accuracy methodology](#23-accuracy-methodology)
24. [Validation checklist](#24-validation-checklist)

---

## 1. Source of truth

### Primary CSS token files

| File | Role |
|------|------|
| `src/styles/fuel-tokens.css` | Fuel brand, surfaces, status colors, drawer width |
| `src/app/PatriotPayJourney.css` | App shell, workspace UI (~30k lines), most component classes |
| `src/styles/theme.css` | Shadcn/Radix primitives (`--background`, `--primary`, etc.) |
| `src/styles/status-indicators.css` | Status badge/dot utilities |
| `src/styles/drawer-layout.css` | 40vw drawer standard |
| `src/app/responsive.css` | Breakpoints, mobile nav, fluid padding |
| `src/app/investor/investor.css` | Investor dashboard typography & components |
| `src/app/credits/credits.css` | Credit indicator, upgrade modal |
| `src/app/formConfirm.css` | Confirmation dialogs |
| `src/app/profileCompletionPrompt.css` | Profile completion modal |
| `src/app/signedOutScreen.css` | Signed-out / auth screen |
| `src/app/companyProfilePreview.css` | Company profile page |

### TypeScript token helpers

| File | Role |
|------|------|
| `src/app/fuelTokens.ts` | CSS var references for charts/SVG |
| `src/app/statusSystem.ts` | Status kinds, hex constants, badge class helpers |
| `src/app/fuelTheme.ts` | `html[data-theme]` light/dark toggle |

### Theme activation

```html
<html data-theme="dark">  <!-- default -->
<html data-theme="light">
```

---

## 2. Colors

### 2.1 Brand & accent

| Token | Value | Usage |
|-------|-------|-------|
| `--fuel-accent` | `#12b886` | Brand green, progress rings, accent emphasis, good status |
| `--fuel-border-accent` | `rgba(18, 184, 134, 0.28)` | Accent borders, focus rings |

### 2.2 Status colors (canonical — only three)

| Token | Hex | Semantic | Used in |
|-------|-----|----------|---------|
| `--status-good` | `#12b886` | Success, stable, strong, complete | Badges, charts, benchmarks, health |
| `--status-watch` | `#f5a623` | Warning, attention, building | Watch tiers, median |
| `--status-bad` | `#e05c5c` | Error, critical, concern | Risk, weak scores |

Aliases: `--status-success`, `--status-warning`, `--status-error`, `--accent`, `--amber`, `--red`

Dim backgrounds: `--status-*-dim` (14% mix dark / 10% light)  
Border lines: `--status-*-line` (32% mix dark / 28% light)

### 2.3 Shell — dark theme

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg` | `#132130` | Sidebar, outer shell |
| `--bg-main` | `#0f1b24` | Main content canvas |
| `--surface-2` | `#172632` | Raised surfaces, search box |
| `--surface-3` | `#1F3140` | Alternate surface |
| `--panel` | `rgb(23, 38, 50)` | Cards, drawers, modals |
| `--panel-border` | `rgb(38, 57, 71)` | Card borders |
| `--panel-inset` | `rgba(10, 20, 28, 0.35)` | Inset wells |
| `--text-1` | `#F2F5F2` | Primary text |
| `--text-2` | `#8FA99A` | Secondary text |
| `--text-3` | `#556878` | Tertiary / metadata |
| `--text-4` | `#3A4F5E` | Disabled / placeholder |
| `--border` | `rgba(255,255,255,0.07)` | Dividers |
| `--border-strong` | `rgba(255,255,255,0.12)` | Emphasized borders |
| `--input-bg` | `#0b1720` | Form fields |
| `--wash` | `rgba(255,255,255,0.04)` | Hover wash |
| `--purple` | `#8B76D4` | Category accent (initiatives) |

### 2.4 Shell — light theme

| Token | Value |
|-------|-------|
| `--bg` | `#ffffff` |
| `--bg-main` | `#F7F8FA` |
| `--panel` | `#ffffff` |
| `--panel-border` | `#e8eaed` |
| `--text-1` | `#1a2332` |
| `--text-2` | `#5b6b7c` |
| `--text-3` | `#7a8b9a` |
| `--text-4` | `#9aa8b5` |
| `--purple` | `#7c3aed` |

### 2.5 Buttons

**Dark**

| Token | Value |
|-------|-------|
| `--btn-primary-bg` | `#3dd68c` |
| `--btn-primary-text` | `#042018` |
| `--btn-primary-hover` | `#4ae09a` |
| `--btn-secondary-border` | `rgba(255,255,255,0.16)` |
| `--tab-active` | `#f2f5f2` |

**Light**

| Token | Value |
|-------|-------|
| `--btn-primary-bg` | `#284356` |
| `--btn-primary-text` | `#ffffff` |
| `--btn-primary-hover` | `#1f3545` |
| `--btn-secondary-border` | `#d5d9de` |
| `--tab-active` | `#284356` |

### 2.6 Overlays / backdrops

| Context | Value |
|---------|-------|
| Drawer scrim | `color-mix(in srgb, var(--bg) 35%, rgba(0,0,0,0.5))` |
| Form confirm | `color-mix(in srgb, var(--bg) 20%, rgba(0,0,0,0.62))` |
| Profile prompt | `color-mix(in srgb, var(--bg) 18%, rgba(0,0,0,0.62))` |
| Mobile nav | `color-mix(in srgb, var(--bg) 20%, rgba(0,0,0,0.55))` |

### 2.7 Chart & financial colors

| Usage | Colors |
|-------|--------|
| Benchmark axis (low→high) | `#E05C5C` → `#E8784A` → `#F5A623` → `#7BC96F` → `#12B886` |
| Credit healthy | `--fuel-accent` |
| Credit low | `#D4924A` → `#ECD67F` |
| Credit critical | `#C45C5C` → `#E07A7A` |
| Investor decorative labels | `#D4A86A`, `#E89B6B`, `#E8C547` |
| Company logo (Patriot Pay) | `#1E4D8C` |

### 2.8 Shadcn layer (`theme.css`)

Used by `src/app/components/ui/*`: `--background`, `--primary` (`#030213`), `--muted` (`#ececf0`), `--destructive` (`#d4183d`), `--chart-1` through `--chart-5` (oklch).

---

## 3. Typography

### Font families

```css
/* fonts.css */
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif

/* PatriotPayJourney body */
Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif

/* Monospace (imported) */
JetBrains Mono
```

### Base scale

| Context | Size | Weight |
|---------|------|--------|
| Body default | 14px | 400 |
| Body ≥1600px | 15px | 400 |
| Body ≥1800px | 16px | 400 |
| Body ≥2200px | 17px | 400 |

### Semantic styles (existing)

| Role | Size | Weight | Letter-spacing | Example location |
|------|------|--------|----------------|------------------|
| Display | 28px | 800 | -0.03em | Signed-out h1 |
| H1 | 24px | 800 | -0.03em | Profile prompt, investor titles |
| H2 / dialog title | 16px | 800 | — | Form confirm h3 |
| Body | 14px | 400 | — | App default |
| Body small | 13px | 400–600 | — | Drawer copy, breadcrumbs |
| Tab | 13.5px | 600 (active) | — | Workspace tabs |
| Caption | 11–12px | 600–800 | — | Investor buttons, credits |
| Label / overline | 9–10.5px | 800 | 0.04–0.08em | Section labels, badges |
| Status badge | 10px | 700 | 0.04em | Uppercase pills |
| Metric / KPI | 22px | 800 | — | Investor KPI values |

### Investor scoped scale (`investor.css`)

```css
--inv-label: 10.5px;
--inv-table-head: 11px;
--inv-row: 12.5px;
--inv-meta: 12px;
--inv-body: 13px;
--inv-h1: 24px;
--inv-btn: 11px;
--inv-kpi: 22px;
```

---

## 4. Spacing

### Recurring scale (extracted from CSS)

`4 · 6 · 7 · 8 · 10 · 11 · 12 · 14 · 16 · 18 · 20 · 24 · 28 · 32px`

### Layout-specific

| Area | Padding / gap |
|------|----------------|
| Sidebar | `20px 14px` |
| Topbar | `14px 28px` |
| Tabs row | `0 28px`, gap `4px` |
| Tab item | `11px 14px` |
| Content (fluid) | `--fuel-content-padding-x/y` via responsive.css |
| Investor dashboard | gap `24px`, section head gap `16px` |
| Drawer body X | `clamp(16px, 2vw, 20px)` |
| Drawer head X | `clamp(16px, 2.2vw, 24px)` |
| Form confirm | `20px 20px 16px` |
| Profile prompt body | `28px 28px 24px` |
| Signed-out card | `32px 28px` |

---

## 5. Layout

### App shell

```
.app { display: flex; height: 100dvh; overflow: hidden }
.sidebar { width: 232px }
.main { flex: 1; display: flex; flex-direction: column; background: var(--bg-main) }
```

### Drawer widths

| Token | Value |
|-------|-------|
| `--fuel-side-panel-width` | `40vw` |
| `--fuel-side-panel-max-width` | `92vw` |
| Mobile ≤640px | `100vw` |

### Modal max widths

| Component | Max width |
|-----------|-----------|
| Form confirm | 420px (wide: 480px) |
| Profile completion prompt | 520px |
| Signed-out card | 440px |

### Other dimensions

| Element | Value |
|---------|-------|
| Search box | 300px wide |
| Mobile nav toggle | 34×34px |
| Sidebar (mobile) | `min(288px, 88vw)` |

---

## 6. Border radius

| Token | Value | Used for |
|-------|-------|----------|
| xs | 3px | Micro elements |
| sm | 4–5px | Small chips |
| base | 6–7px | Buttons (journey), inputs, search |
| xl | 8px | Cards, investor buttons, credit indicator |
| 2xl | 10px | Panels, nav cards |
| 3xl | 12px | Loading cards |
| 4xl | 14px | Modals, signed-out card |
| 5xl | 16px | Profile prompt dialog |
| pill | 999px | Badges, progress tracks, avatars |
| circle | 50% | Dots, avatars |
| shadcn | 0.625rem (10px) | Radix components |

---

## 7. Shadows & elevation

| Token / class | Value | Usage |
|---------------|-------|-------|
| `--shadow-menu` | dark: `0 16px 40px rgba(0,0,0,0.35)` / light: `0 10px 28px rgba(26,35,50,0.08)` | Dropdowns |
| Drawer | `-12px 0 40px rgba(0,0,0,0.18)` | Right panels |
| Form confirm | `0 24px 64px rgba(0,0,0,0.45)` | Dialogs |
| Profile prompt | `0 24px 64px rgba(0,0,0,0.28)` | Modal |
| Ask Fuel | `0 28px 90px rgba(0,0,0,0.58)` | Chat modal |
| Focus ring | `0 0 0 3px rgba(18,184,134,0.28)` | Accent focus |
| Sidebar active | `inset 3px 0 0 var(--fuel-accent)` | Nav accent stripe |

---

## 8. Borders

| Type | Value |
|------|-------|
| Default | `1px solid var(--border)` or `var(--panel-border)` |
| Strong | `1px solid var(--border-strong)` |
| Tab indicator | `2px solid var(--tab-active)` (bottom) |
| Focus outline | `2px solid var(--accent)` / `--fuel-accent` |
| Focus ring | `3px` box-shadow or ring |
| Status badge | `1px solid var(--status-*-line)` |

---

## 9. Buttons

### Shell primary (`.form-confirm-btn.primary`, profile prompt, signed-out)

- Background: `var(--btn-primary-bg)`
- Color: `var(--btn-primary-text)`
- Radius: 8–10px
- Font: 12–14px, weight 600–700
- Padding: `9px 14px` to `11px 18px`
- Hover: `filter: brightness(1.05)`

### Shell secondary

- Background: transparent or `var(--surface-2)`
- Border: `var(--panel-border)` / `var(--btn-secondary-border)`
- Color: `var(--text-2)` → hover `var(--text-1)`

### Investor (`.investor-suggested-primary`)

- Radius: 8px
- Font: 11px, weight 600
- Padding: `8px 12px`
- Done state: `var(--accent-dim)` bg, `var(--accent)` text

### Journey (`.journey-primary-btn`)

- Radius: 6px
- Font: 12px, weight 950
- Padding: `9px 12px`
- Background: `var(--accent)`; color: `var(--bg)`
- Hover: `translateY(-1px)`

### Shadcn (`components/ui/button.tsx`)

| Variant | Classes |
|---------|---------|
| default | `bg-primary text-primary-foreground` |
| destructive | `bg-destructive` |
| outline | `border bg-background` |
| ghost | `hover:bg-accent` |
| Sizes | h-8 (sm), h-9 (default), h-10 (lg) |

---

## 10. Inputs & form controls

### Search box (`.search-box`)

- Background: `var(--surface-2)`
- Border: `1px solid var(--border)`
- Radius: 7px
- Padding: `7px 11px`
- Color: `var(--text-3)`

### Drawer inputs (`.sc-drawer-input`, profile fields)

- Background: `var(--input-bg)`
- Border: panel border tokens
- Focus: accent border / ring

### Shadcn inputs (`components/ui/input.tsx`, `select.tsx`, etc.)

- Use `--input-background`, `--border`, `--ring`
- Height: h-9 default

### Toggle / checkbox / radio

- Radix primitives in `components/ui/`
- Switch background: `--switch-background` (`#cbced4`)

### Validation

- Error: `aria-invalid` rings on shadcn components
- Fuel forms: inline error text with `--status-bad` or `--text-2`

---

## 11. Tabs & navigation

### Workspace tabs (`.tabs` / `.tab`)

| State | Style |
|-------|-------|
| Default | `color: var(--text-3)`, `font-size: 13.5px` |
| Active | `color: var(--tab-active)`, `font-weight: 600`, `border-bottom: 2px solid var(--tab-active)` |
| Container | `border-bottom: 1px solid var(--border)`, `padding: 0 28px`, `gap: 4px` |

### Sidebar nav

- Labels: `.nav-label` — uppercase, muted
- Items: `.sidebar-nav` with active inset stripe (`inset 3px 0 0`)
- Recent companies: `.recent-item` with logo chip

### Breadcrumbs (`.breadcrumb`)

- Font: 13px
- Color: `var(--text-3)`; current: `var(--text-2)`

---

## 12. Cards & containers

| Pattern | Background | Border | Radius | Padding |
|---------|------------|--------|--------|---------|
| Panel / card | `var(--panel)` | `var(--panel-border)` | 10–14px | 14–20px |
| Inset well | `var(--panel-inset)` | panel border | 8–10px | varies |
| Investor card | `var(--panel)` | `var(--panel-border)` | 12px | 16–20px |
| Signed-out card | `var(--panel)` | `var(--panel-border)` | 14px | 32px 28px |
| Credit indicator | `var(--wash)` | `var(--panel-border)` | 8px | 8px 10px |
| Empty states | panel + muted text | standard border | 10px | centered copy |

---

## 13. Status system

**Rule:** Exactly three status colors. Never add alternate greens/ambers/reds for the same meaning.

### CSS classes (`status-indicators.css`)

| Class | Foreground | Background | Border |
|-------|------------|------------|--------|
| `.fuel-status-badge--good` | `--status-good` | `--status-good-dim` | `--status-good-line` |
| `.fuel-status-badge--watch` | `--status-watch` | `--status-watch-dim` | `--status-watch-line` |
| `.fuel-status-badge--bad` | `--status-bad` | `--status-bad-dim` | `--status-bad-line` |

### Dots

- `.fuel-status-dot`: 8×8px circle (9px in rows, 10px `.fuel-status-dot--lg`)

### TS helpers (`statusSystem.ts`)

- `statusBadgeClass()`, `statusDotClass()`, `benchmarkScoreToStatus()`, `scorecardToneToStatus()`

### Investment / portfolio mapping

| UI label | Status kind |
|----------|---------------|
| Strong, above, healthy | good |
| Watch, around, below, building | watch |
| Weak, concern, critical | bad |

---

## 14. Data visualization

### Recharts / scorecard

- Inherits `--fuel-accent` and status tokens via `fuelTokens.ts`
- Grid/axis: muted text colors (`--text-3`, `--panel-muted`)

### Investor benchmark chart (`investor.css`)

- Distribution gradient: 5-stop red→green (see §2.7)
- Tier bars: strong/watch/concern linear gradients
- Pin stroke: `var(--panel-strong)` fallback `#1a1a2e`
- Focus outline: `2px solid var(--accent)`

### Credit indicator bar

- Track: `var(--panel-border)`, height 6px, radius 999px
- Fill transition: `width 0.45s ease`

---

## 15. Tables

### Investor portfolio tables

| Element | Style |
|---------|-------|
| Header | `--inv-table-head` (11px, weight 800, uppercase) |
| Row | `--inv-row` (12.5px, weight 600) |
| Meta | `--inv-meta` (12px) |
| Cell padding | ~10–14px (varies by table) |
| Borders | `var(--panel-border)` row dividers |
| Hover | `var(--wash)` background on interactive rows |

### Founder workspace tables

- Embedded in `PatriotPayJourney.css` / `ScorecardV2` — use panel borders, `--text-1`/`--text-2`, numeric right-align for metrics

---

## 16. Drawers, modals & overlays

### Right drawer (standard)

| Property | Value |
|----------|-------|
| Width | `40vw` (`--fuel-side-panel-width`) |
| Scrim z-index | 270 (elevated: 100003) |
| Panel bg | `var(--panel)` |
| Border | `1px solid var(--border-strong)` left |
| Shadow | `-12px 0 40px rgba(0,0,0,0.18)` |
| Animation | `bench-slide-in 0.24s cubic-bezier(0.4,0,0.2,1)` |
| Scrim fade | `bench-fade-in 0.18s ease-out` |

Classes: `.profile-complete-drawer-scrim`, `.bench-drawer-scrim`, `.investor-company-drawer-scrim`

### Centered modals

| Modal | z-index | Radius | Max-width |
|-------|---------|--------|-----------|
| Form confirm | 100001 | 14px | 420px |
| Profile prompt | 100010 | 16px | 520px |
| Credit upgrade | 2100 | — | — |
| Ask Fuel | 99999 | 16px | — |

### Z-index stack (summary)

See `design-tokens.json` → `zIndex`

---

## 17. Icons

| Property | Value |
|----------|-------|
| Library | `lucide-react` |
| Wrapper | `FuelIcon` in `src/app/icons.tsx` |
| Default size | 16px |
| Default stroke | 1.75 |
| Rule | Single icon system — no emoji in nav |

Named icons: `watchlists`, `pipeline`, `portfolios`, `initiatives`, `benchmarks`, `playbooks`, `connectors`, `advisors`, `company`, `account`, `appearanceLight/Dark`, etc.

---

## 18. Responsive behavior

| Breakpoint | Changes |
|------------|---------|
| ≤640px | Drawers full width; content padding 14×12px |
| ≤720px | Some profile grids → 1 column |
| ≤900px | Mobile nav toggle; sidebar off-canvas; drawer padding fluid |
| ≥1600/1800/2200px | Body font-size steps (no `.app` zoom) |

Mobile sidebar: `transform: translateX`, transition `0.24s`, z-index 200

---

## 19. Motion & interaction

| Animation | Duration | Easing |
|-----------|----------|--------|
| Drawer slide | 0.24s | cubic-bezier(0.4, 0, 0.2, 1) |
| Scrim fade | 0.18s | ease-out |
| Profile prompt fade | 0.22s | ease |
| Mobile nav icon | 0.18s | ease |
| Credit bar fill | 0.45s | ease |
| Journey button hover | 0.2s | ease (translateY) |

`prefers-reduced-motion`: drawer animations disabled in media query block (~line 21090 PatriotPayJourney.css)

---

## 20. Component inventory

### Authentication & entry

| Component | File | Tokens |
|-----------|------|--------|
| SignedOutScreen | `SignedOutScreen.tsx`, `signedOutScreen.css` | `--btn-primary-*`, `--panel` |
| OnboardingFlow | `OnboardingFlow.tsx` (inline styles) | Journey tokens, `--accent` |
| ProfileCompletionPrompt | `ProfileCompletionPrompt.tsx`, `profileCompletionPrompt.css` | Shell buttons, `--fuel-accent` |

### Workspace shell

| Component | File |
|-----------|------|
| PatriotPayJourney | `PatriotPayJourney.tsx`, `PatriotPayJourney.css` |
| Sidebar / topbar / tabs | CSS classes in PatriotPayJourney.css |
| ScorecardV2 (Overview) | `ScorecardV2.tsx`, `overview-ref.css` |
| UnifiedProfileDrawer | `UnifiedProfileDrawer.tsx` |
| CompleteBenchmarkDrawer | `UnifiedBenchmarkDrawer.tsx` |
| CompanyProfilePage | `CompanyProfilePreview.tsx`, `companyProfilePreview.css` |

### Investor

| Component | File |
|-----------|------|
| InvestorDashboard | `InvestorDashboard.tsx`, `investor.css` |
| InvestorCompanyProfileDrawer | `InvestorDashboard.tsx` |
| Portfolio tables / benchmark charts | `investor.css` |

### Credits & account

| Component | File |
|-----------|------|
| CreditIndicator | `credits/CreditIndicator.tsx`, `credits.css` |
| UpgradeModal | `credits/UpgradeModal.tsx` |
| AccountSettings | `account/AccountSettings.tsx`, `accountSettings.css` |

### Dialogs & confirmations

| Component | File |
|-----------|------|
| SaveExitConfirmDialog | `SaveExitConfirmDialog.tsx`, `formConfirm.css` |
| GenerateInsightsConfirmDialog | `GenerateInsightsConfirmDialog.tsx` |
| Form confirm pattern | `formConfirm.css` |

### Shadcn primitives (partial adoption)

`src/app/components/ui/` — button, input, dialog, sheet, select, tabs, table, badge, tooltip, popover, etc.

### Design system preview (non-product)

`src/app/design-system/DesignSystemPage.tsx` — status indicator documentation (`?design-system`)

---

## 21. Machine-readable tokens

Full export: **`design-system/design-tokens.json`**

Use for:

- Documentation generators
- IDE snippets
- Future token sync scripts
- Design ↔ dev handoff

---

## 22. Duplication notes (not refactored)

These patterns appear in multiple forms — documented as-is:

| Pattern | Locations |
|---------|-----------|
| Primary button | `.form-confirm-btn.primary`, `.profile-completion-prompt-btn.primary`, `.signed-out-primary`, `.investor-suggested-primary` |
| Drawer scrim | `.profile-complete-drawer-scrim`, `.bench-drawer-scrim`, `.investor-company-drawer-scrim` |
| Status colors | `--status-*` and legacy `--accent`/`--amber`/`--red` aliases |
| Two theme systems | `html[data-theme]` (Fuel) vs `.dark` class (shadcn) |
| Accent variable | Fuel `--accent` = green; shadcn `--accent` = gray surface |

---

## 23. Accuracy methodology

1. Grep + read of all `*.css` under `src/`
2. Cross-reference `fuel-tokens.css` ↔ `PatriotPayJourney.css` ↔ `fuelTokens.ts`
3. Sampled component-specific CSS (investor, credits, forms, profile)
4. Recorded z-index, breakpoints, and animation values from source
5. No values invented; hardcoded hex only listed when found in multiple places

---

## 24. Validation checklist

| Check | Status |
|-------|--------|
| No product UI files modified | ✅ |
| No layout/styling changes | ✅ |
| No business logic changes | ✅ |
| Tokens traced to implementation | ✅ |
| Light + dark themes documented | ✅ |
| Status system (3 colors) documented | ✅ |
| Drawers, modals, forms documented | ✅ |
| Investor + founder modules covered | ✅ |
| `design-tokens.json` created | ✅ |
| `README.md` created | ✅ |

---

*For color swatches and PDF export, see `docs/Fuel-Color-Design-System.pdf`.*
