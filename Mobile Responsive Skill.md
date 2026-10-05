---
name: responsive-mobile-tablet
description: >
  Retrofit an EXISTING product (landing page first, then the full web application) into a
  premium, industry-standard mobile and tablet responsive experience that never breaks in
  portrait OR landscape. Use this skill for ANY task that touches layout, CSS, Tailwind classes,
  breakpoints, navigation, tables, forms, modals, dashboards, images, or typography on small or
  medium screens — including requests like "make this responsive", "fix mobile", "looks bad on
  phone", "breaks on iPad", "landscape is broken", "rotate the phone", "tablet layout",
  "overflow", "horizontal scroll", or when creating any new page/component that users will open
  on a phone or tablet. Apply it even when the user does not say "responsive" explicitly.
---

# Responsive Mobile & Tablet Retrofit

## 1. Mission

We are reworking the responsive layer of an existing product. The current mobile and tablet
experience looks bad. The goal is a mobile and tablet experience that feels **designed**, not
squeezed — and that stays **visually stable when the device rotates** between portrait and
landscape.

Rollout order:

1. **Phase 1 — Landing page** (marketing site). Establish the foundation (tokens, breakpoints,
   global CSS, shared components) here.
2. **Phase 2 — Web application** (every authenticated screen). Reuse the Phase 1 foundation.
   Never invent a second responsive system.

The single biggest goal of this skill is **reducing rework**: get it right the first time by
auditing before coding, reusing shared primitives, and verifying every change against the
device matrix in both orientations before calling it done.

## 2. Non-negotiables (every change must satisfy all of these)

1. **Zero horizontal page scroll** at every width from 320px to 1366px, in portrait and
   landscape. `document.documentElement.scrollWidth` must equal `clientWidth`.
2. **Rotation stability.** Rotating the device must never cause: overlapping elements, clipped
   content, text that suddenly changes size, a hero that fills the whole screen and hides the
   CTA, a modal whose buttons go off-screen, lost form input, or lost scroll position within the
   current section.
3. **Preserve the product's design language.** Same brand colors, fonts, iconography, component
   style, and content. We are adapting layout, not redesigning the brand. Do not remove features
   or content on mobile — reorganize them (collapse, tab, sheet, accordion) instead.
4. **Desktop must not regress.** Every change is mobile-first but must be checked at 1440px too.
5. **Touch-first.** Tap targets ≥ 44×44px (Apple HIG) / 48×48dp (Material), ≥ 8px apart. No
   interaction depends on hover.
6. **Readable without zoom.** Body text ≥ 16px; secondary text ≥ 14px; nothing below 12px.
   Form inputs ≥ 16px font-size (prevents iOS auto-zoom on focus).
7. **Accessible.** Pinch-zoom is never disabled. Visible focus states. WCAG 2.2 AA contrast.
   `prefers-reduced-motion` respected.
8. **Never lock orientation** and never show a "please rotate your device" screen.

## 3. Workflow — follow in order, do not skip steps

### Step 0 — Discover (read before writing anything)
- Identify the stack: framework (React/Next/Vue/Angular/etc.), styling (Tailwind version, CSS
  Modules, SCSS, styled-components, MUI/Chakra/shadcn), and where global styles live.
- Find existing design tokens (colors, spacing, radii, font sizes, breakpoints). If Tailwind,
  read `tailwind.config.*` or the `@theme` block. **Use existing tokens; extend, don't replace.**
- List shared layout components (Header, Nav, Sidebar, Footer, Container, Card, Modal, Table,
  Form fields). Fixing a shared component fixes every screen that uses it — always prefer that.

### Step 1 — Audit (produce a written list before coding)
For each page in scope, check it at these widths in both orientations (see §5 matrix) and record
issues in this format:

```
[Page] [Component] [Viewport + orientation] — Problem — Root cause — Planned fix — Shared? (Y/N)
```

Group issues by root cause. Fix root causes (global CSS, shared components, tokens) before
page-specific issues. Present the audit to the user when the scope is large.

### Step 2 — Foundation (once, in Phase 1; reused in Phase 2)
Apply everything in §4. This alone usually fixes 40–60% of issues.

### Step 3 — Components, then pages
Fix shared components first, then page sections from top to bottom. For each component, write a
one-line **behavior note** before coding, e.g.:

> "Pricing cards: 1 column < 640px, 2 columns 640–1023px, 3 columns ≥ 1024px; in phone landscape
> use 2 columns with reduced vertical padding."

When a component has several valid mobile translations (sidebar → drawer vs. tabs vs. accordion;
table → cards vs. scroll vs. priority columns), **pick the default from §7 / references**, and if
the choice materially changes UX, state the choice and the alternative in your summary.

### Step 4 — Verify (mandatory, see §10)
Run the device matrix in both orientations. Use `scripts/viewport-audit.mjs` if Playwright is
available. Fix, re-verify, then report.

## 4. Foundation — global setup

### 4.1 Viewport meta (in the document head, exactly once)
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
Never add `maximum-scale=1` or `user-scalable=no`.

### 4.2 Global CSS baseline
```css
*, *::before, *::after { box-sizing: border-box; }

html {
  -webkit-text-size-adjust: 100%;   /* CRITICAL: stops iOS from inflating text on rotation */
  text-size-adjust: 100%;
  scroll-padding-top: var(--header-h, 64px);  /* anchor links don't hide under sticky header */
}

body {
  margin: 0;
  min-height: 100dvh;
  overflow-x: clip;          /* safety net only — still fix the real overflow source */
  -webkit-font-smoothing: antialiased;
}

img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }

input, select, textarea, button { font: inherit; }
input, select, textarea { font-size: max(16px, 1rem); }  /* no iOS zoom on focus */

/* Long words/URLs/emails never push the layout wider */
p, h1, h2, h3, h4, li, td, dd, a { overflow-wrap: anywhere; }

/* Flex/grid children may shrink below content size */
.flex > *, .grid > * { min-width: 0; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```
Use `overflow-x: clip` rather than `hidden` on body — `hidden` breaks `position: sticky`.

### 4.3 Safe areas (notches, Dynamic Island, home indicator, landscape side notch)
```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}
.site-header   { padding-top: var(--safe-top); }
.container     { padding-inline: max(var(--gutter), var(--safe-left)) max(var(--gutter), var(--safe-right)); }
.bottom-bar    { padding-bottom: max(12px, var(--safe-bottom)); }
```
In **landscape**, the notch moves to the left or right edge — that is why the container uses
left/right insets. Test this explicitly.

### 4.4 Breakpoints (single source of truth)
Use the project's existing scale. If none exists, use the Tailwind default scale:

| Token | Min width | Typical devices |
|------|-----------|-----------------|
| base | 0         | Phones portrait (320–479) |
| `sm` | 640px     | Large phones landscape, small tablets |
| `md` | 768px     | Tablets portrait (iPad Mini/Air/Pro portrait) |
| `lg` | 1024px    | Tablets landscape, small laptops |
| `xl` | 1280px    | Laptops / desktop |
| `2xl`| 1536px    | Large desktop |

Add **one height-based query** for short landscape screens (phones rotated). Width alone cannot
detect this case — an iPhone in landscape is ~844–932px wide but only ~390–430px tall:

```css
/* Phone in landscape (or any very short viewport) */
@media (orientation: landscape) and (max-height: 500px) { /* compact mode */ }
```
Tailwind v4: `@custom-variant landscape-short (@media (orientation: landscape) and (max-height: 500px));`
Tailwind v3: add `screens: { 'landscape-short': { raw: '(orientation: landscape) and (max-height: 500px)' } }`.

Also distinguish input type, not just size:
```css
@media (hover: hover) and (pointer: fine) { /* hover effects only here */ }
@media (pointer: coarse) { /* larger hit areas */ }
```

### 4.5 Fluid tokens (smooth scaling between breakpoints)
Use `clamp()` so type and spacing scale continuously; use breakpoints only for **structural**
changes (column count, nav pattern).

```css
:root {
  --gutter: clamp(16px, 4vw, 32px);
  --section-y: clamp(48px, 8vw, 120px);
  --radius: 12px;

  --fs-body: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --fs-h3:   clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --fs-h2:   clamp(1.625rem, 1.3rem + 1.4vw, 2.5rem);
  --fs-h1:   clamp(2rem, 1.4rem + 3vw, 4rem);
}
/* Phone landscape: cap display sizes so headings don't eat the short screen */
@media (orientation: landscape) and (max-height: 500px) {
  :root { --fs-h1: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem); --section-y: 40px; }
}
```
Always include a `rem` component in fluid formulas so browser zoom still works. Never set font
sizes in pure `vw`.

### 4.6 Viewport height units
- Never use `100vh` for full-height sections on mobile (browser toolbars make it overflow).
- Use `100svh` for heroes (stable, no jump while scrolling), `100dvh` for app shells, modals,
  and drawers that must track the visible area. Provide a fallback: `min-height: 100vh; min-height: 100svh;`.
- Heroes use `min-height`, never fixed `height`, and must cap in landscape (see §6).

## 5. Device matrix (test every page, both orientations)

| Class | Portrait (W×H) | Landscape (W×H) | Examples |
|------|----------------|-----------------|----------|
| Small phone | 320×568, 360×640 | 568×320, 640×360 | iPhone SE 1st gen, small Android |
| Standard phone | 375×667, 390×844, 393×852 | 667×375, 844×390, 852×393 | iPhone SE 2/3, 13–16, Pixel |
| Large phone | 412×915, 430×932 | 915×412, 932×430 | Galaxy S Ultra, iPhone Pro Max |
| Foldable | 344×882 (folded), 673×841 (open) | 882×344 | Galaxy Z Fold |
| Small tablet | 744×1133, 768×1024 | 1133×744, 1024×768 | iPad Mini, iPad 9th gen |
| Tablet | 820×1180, 834×1194 | 1180×820, 1194×834 | iPad Air, iPad Pro 11" |
| Large tablet | 1024×1366 | 1366×1024 | iPad Pro 12.9" / 13" |
| Desktop regression | — | 1280×800, 1440×900 | Laptops |

Also drag-resize continuously from 280px to 1440px — bugs live **between** breakpoints.

## 6. Orientation rules (portrait ⇄ landscape)

The layout must be driven by CSS that responds to the current viewport — never by JS that reads
dimensions once on load.

1. **No JS layout on `orientationchange`.** If JS must react to size, use `ResizeObserver` or
   `matchMedia(...).addEventListener('change', ...)`, never cached `window.innerHeight`.
2. **Text size stays constant** on rotation → `text-size-adjust: 100%` (§4.2) is mandatory.
3. **Hero in phone landscape:** drop `min-height` to `auto`, reduce vertical padding, keep the
   headline + primary CTA visible in the first screen, move/shrink hero imagery beside the text
   (2-column) or hide decorative-only art.
4. **Sticky/fixed chrome must not eat a short screen.** In phone landscape, header height ≤ 56px
   (or hide-on-scroll-down, show-on-scroll-up); combined sticky UI ≤ 25% of viewport height.
   Bottom tab bars may stay, but at reduced height.
5. **Modals, drawers, sheets:** `max-height: 100dvh` (or `90dvh`), internal
   `overflow-y: auto`, footer actions always reachable. In landscape a bottom sheet may become a
   centered dialog.
6. **Grids adapt to width, not orientation labels.** A phone in landscape (~850px wide, ~400px
   tall) should usually get a 2-column layout with compact spacing — not the tablet layout with
   tall cards.
7. **Media:** use `aspect-ratio` on images/video/embeds so rotation doesn't cause layout shift.
   Carousels recalculate via CSS (scroll-snap), not JS-measured pixel widths.
8. **State survives rotation:** form input, open accordions, active tab, and scroll position must
   persist (no remounting components on resize — avoid conditional rendering keyed on a
   `isMobile` JS flag; prefer CSS show/hide or a single responsive component).
9. **Keyboard open (virtual keyboard) in landscape** leaves ~150px of visible height: focused
   inputs must scroll into view and sticky footers must not cover them.
10. **Landscape safe areas:** left/right insets applied to containers, fixed bars, and FABs.

## 7. Component patterns (defaults)

Detailed code for each pattern lives in `references/component-patterns.md`. Defaults:

| Component | Phone | Tablet portrait | Tablet landscape / desktop |
|-----------|-------|-----------------|----------------------------|
| Marketing header | Logo + hamburger → full-screen or right drawer menu | Same, or condensed inline links if ≤ 5 items | Full inline nav |
| App navigation | Bottom tab bar (3–5 primary items) + "More" sheet, or top bar + drawer | Collapsible icon rail (72px) | Full sidebar (collapsible) |
| Hero | Single column, text first, CTA full-width | Single or 2-col depending on art | 2-column |
| Feature grid | 1 col (2 col for small icon tiles) | 2 col | 3–4 col |
| Pricing | Swipeable cards (scroll-snap) or stacked, recommended plan first | 2 col | 3 col |
| Logo strip / testimonials | Horizontal scroll-snap row | Grid or carousel | Grid |
| Data table | Card list (priority fields) OR horizontal scroll with sticky first column | Scroll with sticky first column / hide low-priority columns | Full table |
| Filters | Button → bottom sheet | Sheet or collapsible panel | Inline sidebar/toolbar |
| Tabs (many) | Horizontal scrollable tab bar with fade edge, or select | Scrollable tabs | Full tabs |
| Forms | Single column, labels above, full-width inputs, sticky submit | 1–2 columns | 2 columns max |
| Modal | Bottom sheet (full-width, rounded top, drag handle) | Centered dialog, max-width 560px | Centered dialog |
| Dashboard KPIs | 2-col grid or horizontal scroll | 2–3 col | 4 col |
| Charts | Full width, fewer ticks, legend below, tap tooltips | Full width | As designed |
| Footer | Accordion link groups | 2–3 col | Full columns |

## 8. Visual quality standards (so it looks designed, not squeezed)

The current mobile UI "looks bad" mostly because desktop layouts were stacked without redesign.
Every screen must pass these:

- **Rhythm:** one spacing scale (4/8px base). Section padding via `--section-y`; component gaps
  16–24px on phone, 24–32px on tablet. No random one-off margins.
- **Gutters:** 16px min on phones, 24–32px on tablets. Content never touches screen edges (except
  intentional full-bleed media).
- **Hierarchy:** reduce heading sizes proportionally (fluid tokens) instead of letting them wrap
  to 5+ lines. H1 on phones should wrap to ≤ 4 lines.
- **Line length:** 45–75 characters for body text; cap text containers with `max-width: 65ch`.
- **Line height:** 1.5–1.6 body, 1.1–1.25 headings.
- **Tablet is its own layout.** Never show a stretched phone layout (one giant column of
  full-width cards) on a 768–1024px screen. Use 2 columns, side-by-side media, or a rail.
- **Alignment:** left-align body text on mobile (centered paragraphs > 2 lines are hard to read).
- **Buttons:** primary CTAs full-width on phones (< 480px) when standalone; paired buttons stack
  with primary on top, or sit side-by-side at equal width.
- **Density:** app screens may be denser than marketing, but tap targets still ≥ 44px.
- **Images:** art-directed crops via `<picture>`/`object-fit: cover` + `aspect-ratio`; never
  distorted, never tiny full-desktop screenshots on phones.
- **Consistency:** the same component looks and behaves the same on every page.

## 9. Implementation rules (escalation model)

Choose the simplest tool that works, in this order:

1. **Intrinsic layout** — `flex-wrap`, `grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))`, `clamp()`, `min()`, `max()`, `aspect-ratio`.
2. **Container queries** — for reusable components that appear in different-width slots
   (cards in sidebar vs. main area): `container-type: inline-size;` + `@container (min-width: …)`.
3. **Media queries** — mobile-first `min-width` only for page-level structural changes. Avoid
   `max-width` queries except for the landscape-short compact mode.
4. **JavaScript** — last resort; only for behavior (drawer open state), never for layout sizing.

Also:
- Use logical properties where practical (`padding-inline`, `margin-block`).
- Never hard-code widths in px on layout containers — use `max-width` + `width: 100%`.
- Never set fixed heights on text containers.
- Avoid `position: fixed` inside transformed parents; avoid z-index escalation — use a z-index
  token scale (e.g. dropdown 1000, sticky 1100, drawer 1200, modal 1300, toast 1400).
- In Tailwind, prefer tokens/utilities over arbitrary values; mobile styles are unprefixed, then
  layer `sm: md: lg:`.
- Don't duplicate markup for mobile vs. desktop (two navs, two tables) unless unavoidable; if
  duplicated, hide with CSS and ensure only one is in the accessibility tree.

See `references/anti-patterns.md` for the full list of common mistakes to scan for before
finishing.

## 10. Definition of done (checklist — every item, every page)

Run `references/qa-checklist.md`. Minimum gates:

- [ ] No horizontal scroll at any matrix size, portrait and landscape.
- [ ] Rotating portrait → landscape → portrait: no overlap, clipping, text-size jump, or lost state.
- [ ] Phone landscape: headline + primary CTA visible without scrolling on landing hero; sticky
      chrome ≤ 25% of viewport height; modals fully usable.
- [ ] Tablet portrait and landscape each have an intentional layout (not stretched mobile).
- [ ] Safe areas respected in both orientations.
- [ ] All tap targets ≥ 44×44px; no hover-only interactions.
- [ ] Inputs ≥ 16px; keyboard doesn't hide the focused field or submit button.
- [ ] Images/media use `aspect-ratio`; no layout shift on load or rotate.
- [ ] Desktop 1280/1440 unchanged or improved.
- [ ] Lighthouse mobile: no "content wider than screen", "tap targets too small", or CLS > 0.1.

If `scripts/viewport-audit.mjs` is available, run it and paste the summary:
```bash
node .cursor/skills/responsive-mobile-tablet/scripts/viewport-audit.mjs http://localhost:3000 /pricing /dashboard
```

## 11. Reporting format (end of every task)

```
## Responsive update — <page/component>
Scope: <files changed>
Root causes fixed: <global/shared fixes>
Behavior notes: <component → phone / tablet / landscape behavior>
Design choices made: <any fork decisions + alternative not chosen>
Verified: <viewports × orientations checked, audit script result>
Known follow-ups: <anything deferred, with reason>
```

## 12. Reference files
- `references/component-patterns.md` — copy-ready code for nav, drawer, bottom sheet, tables,
  forms, hero, pricing, carousels, dashboards (Tailwind + CSS).
- `references/anti-patterns.md` — failure patterns to scan for before finishing.
- `references/qa-checklist.md` — full per-page QA checklist and rotation test script.
- `scripts/viewport-audit.mjs` — Playwright script: checks overflow, tap targets, small text, and
  screenshots every page at every matrix size in both orientations.
