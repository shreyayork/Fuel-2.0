---
name: Fuel
description: York IE control-tower admin and portfolio UI — navy command, teal mast, Inter + JetBrains Mono
colors:
  york-navy: "#284256"
  york-navy-soft: "#3E5668"
  accent-teal: "#00B48A"
  accent-soft-light: "#D6F3EB"
  accent-tint: "rgba(0,180,138,0.08)"
  accent-soft-dark: "rgba(0,180,138,0.18)"
  warn-gold: "#ECD67F"
  warn-ink: "#B78A1D"
  negative-light: "#C94A3B"
  negative-dark: "#FF6B5B"
  editorial-bg: "#F7F8FA"
  editorial-panel: "#FFFFFF"
  editorial-panel-alt: "#F1F3F6"
  editorial-panel-inner: "#EFF2F5"
  editorial-shell: "#E4E8EC"
  editorial-muted: "#667987"
  editorial-muted-soft: "#B4BFC8"
  editorial-rule: "#E4E8EC"
  signal-bg: "#0F1A24"
  signal-panel: "#172632"
  signal-panel-alt: "#1F3140"
  signal-panel-inner: "#0B141C"
  signal-shell: "#132130"
  signal-ink: "#F4F6F8"
  signal-ink-soft: "#D5DCE2"
  signal-muted: "#A8B6C2"
  signal-muted-soft: "#7D8E9C"
  signal-rule: "#263947"
  on-accent-light: "#FFFFFF"
typography:
  display:
    fontFamily: "Inter, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 450
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  touch: "44px"
  rail: "232px"
  mast: "3px"
components:
  button-primary:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.signal-bg}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "{spacing.touch}"
    typography: "{typography.body}"
  button-primary-editorial:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.on-accent-light}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "{spacing.touch}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.signal-ink-soft}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "{spacing.touch}"
  button-danger:
    backgroundColor: "rgba(255,107,91,0.08)"
    textColor: "{colors.negative-dark}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "{spacing.touch}"
  input-field:
    backgroundColor: "{colors.signal-panel-alt}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "{spacing.touch}"
  panel-framed:
    backgroundColor: "{colors.signal-panel}"
    rounded: "{rounded.lg}"
    padding: "0"
  frequent-destination:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  nav-link-active:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.signal-ink}"
    rounded: "9px"
    padding: "11px 12px"
    height: "{spacing.touch}"
  command-header:
    backgroundColor: "{colors.signal-panel-inner}"
    textColor: "{colors.signal-ink}"
    height: "56px"
    padding: "0 16px"
---

# Design System: Fuel

## Overview

**Creative North Star: "Signal Tower"**

Fuel’s Super Admin is a control tower inside the established York IE world: a deep navy command band, a continuous teal mast on the rail, and accent-led destinations — not a gray equal-card settings dump. Operators orient from the sticky command header, jump frequent work through teal-framed destinations, then drill into mono-stamped area groups and tabular framed tables.

The system is dual-mode (`editorial` light / `signal` dark) from `apps/web/src/lib/theme.ts`. Super Admin defaults to Signal; editorial flips the command band to York navy ink with light panel text on that band. Density stays operational and scan-friendly. Gold appears only for warn. Teal marks structure (mast, header underline, selection, Frequent) — not decoration.

Confirmed visual rejection: flat equal-weight admin tile grids as the Overview primary path.

**Key Characteristics:**
- York navy + teal accent + gold-for-warn only
- Inter sans + JetBrains Mono group stamps
- 3px teal mast on `panelAlt` nav rail
- Sticky command header with 2px teal bottom rule
- Frequent accent destinations above All areas rows
- Framed tabular tables (`tabular-nums`, sticky th, accent-tint row hover)

## Colors

York IE palette with Signal as the Super Admin default ground; editorial shares the same accent and ink roles inverted for light surfaces.

### Primary
- **Accent Teal** (`accent-teal`): Mast, header bottom rule, page-title underline, active nav tint/ring, Frequent borders and signal dots, primary buttons, focus outlines. The structural accent — rarity on content chrome, density on navigation chrome.
- **York Navy** (`york-navy`): Editorial ink and editorial command-header band; brand deep for the Fuel mark on light command ink.

### Secondary
- **Warn Gold** (`warn-gold` / `warn-ink`): Warning and Fuel mark warm only — never as a second accent for navigation or Frequent.

### Neutral
- **Signal Ground / Panel / Panel Alt / Panel Inner** (`signal-bg`, `signal-panel`, `signal-panel-alt`, `signal-panel-inner`): Page ground, framed panels/tables, nav rail, and deeper command band (darker than ground so the header reads as tower chrome).
- **Signal Ink / Ink Soft / Muted** (`signal-ink`, `signal-ink-soft`, `signal-muted`, `signal-muted-soft`): Primary text, secondary text, stamps and descriptions.
- **Signal Rule** (`signal-rule` / soft twin via `ruleSoft` = panel-alt): Dividers, panel borders, table lines.
- **Editorial Ground / Panel / Panel Alt** (`editorial-bg`, `editorial-panel`, `editorial-panel-alt`, `editorial-muted`, `editorial-rule`): Light-mode counterparts when the sun/moon toggle is editorial.
- **Negative** (`negative-light` / `negative-dark`): Danger buttons and destructive emphasis only.

### Named Rules
**The Teal Mast Rule.** Teal structures the tower (3px rail mast, 2px header rule, 48×2px title underline, selection tint). Do not redistribute teal into decorative fills or equal card chrome.

**The Gold Is Warn Rule.** Gold (`warn-gold` / `warn-ink`) is reserved for warning and mark warmth — never for nav, Frequent, or positive status (positive reuses teal).

## Typography

**Display Font:** Inter (with -apple-system / Helvetica Neue / Arial)
**Body Font:** Inter (same stack)
**Label/Mono Font:** JetBrains Mono (with ui-monospace)

**Character:** Operational sans for task titles and rows; mono uppercase stamps for group identity. Tight negative tracking on titles; wide tracking on stamps.

### Hierarchy
- **Display** (750, 29px, 1.12, −0.03em): Super Admin page task titles (`AdminPageHeader`).
- **Headline** (700, 17px, −0.02em): Frequent destination titles; modal titles at 17/700.
- **Title** (700, 14–15px, −0.02em): Command-header page name; nav links 13.5/550–650.
- **Body** (450–550, 12.5–13.5px, ~1.45): Descriptions (max ~42ch on page header), table cells (13px), inputs (14px).
- **Label** (650, 10.5px mono, 0.12–0.14em, uppercase): Nav group stamps, section labels (Frequent / All areas), table headers (10px sans / 0.07em uppercase / weight 700).

### Named Rules
**The Mono Stamp Rule.** Group and section labels are JetBrains Mono, uppercase, wide tracking — not Inter eyebrows or decorative kickers.

## Layout

Full-viewport shell (`100dvh`): sticky command header (min-height 56px + safe-top) → body row with fixed rail (232px desktop; drawer `min(280px, 100vw − 48px)` below `--fuel-bp-nav` 1024px) + scrolling main. Main padding ~20px / max(12px, safe) / max(24px, safe). Page stack gap 20px (`adminPageStyle`).

Overview story order: task title → Frequent (column, gap 10) → All areas (grouped framed panels, gap 14). Area rows are 3-column grids (`160px | 1fr | auto`) collapsing to title+chevron under 640px. Form rows: `160px | 1fr` collapsing to single column under 640px. Touch targets minimum 44px. Breakpoints from `:root`: 360 / 480 / 768 / 1024 (nav) / 1200 / 1366.

### Named Rules
**The Frequent-First Rule.** Highest-traffic paths lead as accent destinations; exhaustive areas follow as stamped grouped rows — never as a primary equal-tile grid.

## Elevation & Depth

Mostly tonal layering: panel vs panelAlt vs panelInner vs bg. Shadows are sparse and structural — command header ambient (`0 8px 24px` border-subtle/faint), modal lift (`0 16px 48px` border-subtle), Frequent hover (`0 8px 24px` border-subtle), mobile drawer (`12px 0 40px` nav-shadow). Active nav uses inset 1px accent ring, not drop shadow. Tables convey depth via sticky `panelAlt` headers and accent-tint row hover.

### Shadow Vocabulary
- **Command band** (`0 8px 24px` theme border-subtle/faint): Header separation from ground.
- **Modal** (`0 16px 48px` border-subtle): Dialog lift over overlay.
- **Frequent hover** (`0 8px 24px` border-subtle): Destination emphasis on hover.
- **Drawer open** (`12px 0 40px` border-subtle): Mobile nav cast.

### Named Rules
**The Flat Frame Rule.** Panels and tables are 1px rule borders + radius, not card stacks with multi-layer shadows at rest.

## Shapes

Gently rounded operational chrome: controls 8px, icon buttons / mark well 10px, nav links 9px, panels / Frequent / tiles 12px, modals 14px. Rail mast is a hard 3px vertical bar (no radius). Page-title accent rule is 48×2px with 1px radius. Borders are 1px `rule` / `ruleSoft`; Frequent and active nav add accent at ~33% opacity (`accent55` / inset). No hard offset neobrutalist shadows.

## Components

### Buttons
- **Shape:** Soft rectangle (8px); min-height 44px; padding 0 14px; sans 12.5px; weight 650 primary / 550 ghost.
- **Primary:** Accent fill; on-accent text is Signal `bg` in dark mode, white in editorial.
- **Ghost:** Transparent, inkSoft text, 1px rule border.
- **Danger:** Negative at 8% fill, negative text, negative~35% border.
- **Hover / Focus:** Shell icon buttons transition background/border ~140ms; focus-visible 2px accent outline offset 2px.

### Cards / Containers
- **Framed panel:** `panel` fill, 1px `rule`, 12px radius, overflow hidden — wraps All areas groups and data tables.
- **Frequent destination:** `accentTint` fill, 1px `accent55` border, 12px radius, 16×18 padding, teal 10×10 signal mark, chevron — hover strengthens border + ambient shadow.
- **Area row:** No card chrome; ruleSoft bottom dividers inside a framed panel; hover uses accent-tint.

### Inputs / Fields
- **Style:** `panelAlt` fill, 1px `rule`, 8px radius, 14px sans (or mono when flagged), 44px min height (88px multiline).
- **Focus:** Prefer accent focus rings from shell patterns; do not invent glow stacks.
- **Form label:** 11px sans uppercase muted, 0.04em tracking.

### Navigation
- **Command header:** Signal `panelInner` (or editorial `ink`); 2px accent bottom border; Fuel mark in accent-tint well; title + “Super Admin · {group}”; sun/moon and hamburger at 44px.
- **Rail:** `panelAlt`, 3px teal mast, mono group stamps (0.14em), links 13.5px; active = accentTint + inset accent ring + weight 650.
- **Mobile:** Hamburger opens drawer; backdrop overlay; Escape / backdrop / route change closes.

### Tables
- **Frame:** Same as framed panel + CSS vars for hover/sticky.
- **Header:** Uppercase 10px muted, `panelAlt`, sticky, inset faint bottom edge.
- **Cells:** 13px (12 mono), tabular-nums, primary rows ink/600; hover/focus-within accent-tint.

### Page header (signature)
- Task title leads (29/750); 48×2 teal underline draws in (~560ms ease-out, reduced-motion off); short muted support ≤42ch; actions right-aligned.

## Do's and Don'ts

### Do:
- **Do** keep the 3px teal mast on the Super Admin rail and the 2px teal rule under the command header.
- **Do** lead Overview with accent Frequent destinations, then mono-stamped All areas groups.
- **Do** use JetBrains Mono uppercase stamps for nav/section groups; Inter for task titles and body.
- **Do** frame data tables (12px radius, sticky th, tabular-nums, accent-tint row hover).
- **Do** reserve gold for warn (and mark warmth); teal for positive and structural accent.
- **Do** honor 44px touch minima and the 1024px nav breakpoint for rail vs drawer.

### Don't:
- **Don't** present Super Admin Overview as an equal-weight gray tile grid.
- **Don't** use gold as a second navigation or Frequent accent.
- **Don't** replace mono group stamps with Inter eyebrows/kickers on tower surfaces.
- **Don't** drop the command header’s deeper band (`panelInner` / ink) so it collapses into page ground.
- **Don't** invent a third brand hue outside York navy / teal / gold (third-party marks excepted).
