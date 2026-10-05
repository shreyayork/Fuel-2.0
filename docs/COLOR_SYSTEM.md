# Fuel color system

Source of truth for product UI color: [`apps/web/src/lib/theme.ts`](../apps/web/src/lib/theme.ts).  
This README explains **roles**, **modes**, and **how to use tokens**. Do not invent new hex for York brand colors without design evidence.

---

## Brand anchors (York IE)

These three values define Fuel’s brand identity. Modes remap surfaces and text around them; the accent stays constant.

| Role | Hex | Notes |
|------|-----|--------|
| Navy (primary ink on light) | `#284256` | Editorial `ink`; brand depth |
| Teal (accent / positive) | `#00B48A` | CTAs, success, selection tint |
| Gold (warn / highlight) | `#ECD67F` | Warnings, accent gradient end |

**Allowed exceptions:** third-party brand colors only (HubSpot, Slack, Google OAuth, Stripe marks). Never use them as Fuel chrome.

---

## Themes (modes)

Fuel has two modes. Both implement the same `Theme` token shape.

| Mode | Key | Typical use |
|------|-----|-------------|
| **Light** | `editorial` | In-app PM/CM workspace, Super Admin when user chooses light |
| **Dark** | `signal` | Default preference for many operators; auth, onboard, agent full-bleed flows via `SIGNAL` |

```ts
import { THEMES, SIGNAL, type Theme } from "@/lib/theme";

const t: Theme = THEMES[mode]; // or SIGNAL for fixed dark flows
```

User preference is usually persisted as `fuel:theme` (`editorial` | `signal`).

---

## Token roles

Use the **role name** (`t.ink`, `t.panel`) — never paste palette hex into components.

### Surfaces (backgrounds)

| Token | Role | Light (`editorial`) | Dark (`signal`) |
|-------|------|---------------------|-----------------|
| `bg` | Page / canvas | `#F7F8FA` | `#0F1A24` |
| `panel` | Cards, headers, elevated sheets | `#FFFFFF` | `#172632` |
| `panelAlt` | Recessed rails, input wells, alt strips | `#F1F3F6` | `#1F3140` |
| `panelInner` | Nested wells inside panels | `#EFF2F5` | `#0B141C` |
| `shell` | Deep full-bleed chrome (onboard depth) | `#E4E8EC` | `#132130` |
| `chip` | Neutral chip / pill fill | `#F1F3F6` | `#1F3140` |
| `overlay` | Modal / drawer scrim | `rgba(40,66,86,0.4)` | `rgba(10,20,28,0.75)` |

**Hierarchy tip:** canvas (`bg`) → panel → `panelAlt` / `panelInner` for nested depth. Prefer tokens over ad-hoc gray.

### Text

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `ink` | Primary headings / strong body | `#284256` | `#F4F6F8` |
| `inkSoft` | Secondary body / nav links | `#3E5668` | `#D5DCE2` |
| `muted` | Labels, support copy (AA on light) | `#667987` | `#A8B6C2` |
| `mutedSoft` | Placeholder, de-emphasized meta | `#B4BFC8` | `#7D8E9C` |

**Contrast:** Editorial `muted` was darkened so muted-on-white clears **WCAG AA (~4.5:1)**. Prefer `muted` for readable secondary text; reserve `mutedSoft` for non-essential chrome (group labels, placeholders).

### Borders & dividers

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `rule` | Default borders / hairlines | `#E4E8EC` | `#263947` |
| `ruleSoft` | Subtle row separators | `#EFF2F5` | `#1F3140` |
| `borderSubtle` | Soft card edge / shadow companion | `rgba(40,66,86,0.12)` | `rgba(255,255,255,0.07)` |
| `borderFaint` | Whisper separators / light shadows | `rgba(40,66,86,0.06)` | `rgba(255,255,255,0.04)` |

### Semantic & accent

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `accent` | Brand teal — primary actions, links, focus energy | `#00B48A` | `#00B48A` |
| `accentSoft` | Soft teal fill (chips, soft buttons) | `#D6F3EB` | `rgba(0,180,138,0.18)` |
| `accentTint` | Very light selection / row hover | `rgba(0,180,138,0.08)` | `rgba(0,180,138,0.08)` |
| `positive` | Success (aligned with accent today) | `#00B48A` | `#00B48A` |
| `negative` | Error / destructive | `#C94A3B` | `#FF6B5B` |
| `warn` | Warning text / icon | `#B78A1D` | `#ECD67F` |
| `warnSoft` | Warning surface / gold highlight | `#ECD67F` | `#ECD67F33` |

### Domain tracks (charts / pipelines)

| Token | Role | Value (both modes) |
|-------|------|--------------------|
| `trackMarketing` | Marketing track | `#2BB8A0` |
| `trackFinOps` | FinOps track | `#8B76D4` |

---

## Helpers (prefer these)

Defined next to tokens in `theme.ts`:

| Helper | Use |
|--------|-----|
| `accentGradient(t)` | Teal → gold gradient for branded CTAs |
| `onAccentText(t)` | Text on solid accent / filled primary |
| `accentChipFg` / `accentChipBg` / `accentChipBorder` | Accent pills that stay readable in both modes |
| `panelCardSurface(t)` | `{ background, border }` for standard cards |
| `dropdownScrollProps(t)` | Dark-mode scrollbar tokens for menus |

**Alpha on 6-digit tokens:** append hex alpha — e.g. `` `${t.negative}14` ``, `` `${t.accent}4D` ``. Do not invent new RGB triples.

---

## Which theme where

| Surface | Theme choice |
|---------|----------------|
| PM / CM app shell & views | `THEMES[themeMode]` from user preference |
| Super Admin | Same preference via `ThemeContext` |
| Auth, onboard, agent full-bleed | Prefer **`SIGNAL`** (fixed dark) unless the surface explicitly supports toggle |
| Marketing / motion light panels | Often `THEMES.editorial` via local helpers |

Atoms (`Chip`, `SectionHead`, …) take `t: Theme` and style from tokens — keep that contract.

---

## Do / don’t

**Do**

- Import tokens from `@/lib/theme` or receive `t: Theme`
- Use `t.sans` / `t.mono` (never hardcode Inter / JetBrains stacks in new UI)
- Map meaning → role (`destructive` → `t.negative`, not “pick a red”)
- Keep Super Admin / Operate chrome restrained: accent for selection and primary actions only

**Don’t**

- Hardcode `#284256`, `#00B48A`, `#ECD67F`, or mode-specific grays in components
- Introduce purple-on-white gradients, cream+terracotta kits, or other off-brand palettes
- Use `mutedSoft` for essential body copy on light backgrounds
- Change brand anchors without design evidence and an update to `theme.ts` + this doc

---

## Accessibility

- Target **WCAG AA** for body and UI text (editorial `muted` already tuned for this).
- Large text / icons can use slightly softer tokens when contrast still holds.
- Focus rings should use high-contrast ink/accent — never remove visible focus.
- Test both **editorial** and **signal** when shipping color changes.

---

## Changing the system

1. Edit values only in [`apps/web/src/lib/theme.ts`](../apps/web/src/lib/theme.ts).
2. Update the tables in this file so docs stay honest.
3. Spot-check: main app (light + dark), auth/onboard (`SIGNAL`), Super Admin.
4. Run `npm run typecheck --workspace=apps/web`.

Related: [`.cursor/skills/fuel-theme-tokens/SKILL.md`](../.cursor/skills/fuel-theme-tokens/SKILL.md) (agent rules), [`.cursor/skills/fuel-engineering/design-system.md`](../.cursor/skills/fuel-engineering/design-system.md) (atoms overview).

---

## Quick cheatsheet

```
Page          → t.bg
Card / header → t.panel
Sidebar / well→ t.panelAlt
Title         → t.ink
Body          → t.inkSoft
Label / meta  → t.muted
Border        → t.rule
Selected row  → t.accentTint
Primary btn   → t.ink (fill) or t.accent (brand CTA)
Danger        → t.negative
Warning       → t.warn / t.warnSoft
```
