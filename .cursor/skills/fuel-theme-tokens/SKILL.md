---
name: fuel-theme-tokens
description: >-
  Styles Fuel UI with tokens from apps/web/src/lib/theme.ts — SIGNAL for dark
  flows, editorial for light, no hardcoded font stacks or York palette hex.
  Use when building or refactoring auth, onboarding, marketing, or any inline-styled
  surface; when the user mentions theme tokens, SIGNAL, or design-system colors.
---

# Fuel theme tokens

Read [`apps/web/src/lib/theme.ts`](../../../apps/web/src/lib/theme.ts) first.

## Rules

1. **Never hardcode font stacks** — use `t.sans`, `t.mono`, or `fontFamily: "inherit"` on children of a `t.sans` container.
2. **Never hardcode York palette hex** — map to `t.ink`, `t.muted`, `t.accent`, `t.rule`, `t.negative`, etc.
3. **Pick the theme mode** — dark full-bleed flows (auth, onboard, agent) use `SIGNAL`; in-app PM/CM chrome uses `THEMES[themeMode]` from `FuelApp`.
4. **Reuse helpers** before inventing colors:
   - `accentGradient(t)`, `onAccentText(t)`, `accentChipFg(t)`, `panelCardSurface(t)`
5. **Alpha on token colors** — append hex alpha to 6-digit tokens: `${t.negative}1A`, `${t.accent}4D`.
6. **Style modules** — colocate CSSProperties helpers in `components/<area>/styles.ts` (see auth, onboard). Import `SIGNAL` once at module scope.

## Token map (signal / dark)

| Role | Token |
|------|--------|
| Page bg | `t.bg`, `t.shell` |
| Card / panel | `t.panel`, `t.panelInner` |
| Primary text | `t.ink`, `t.inkSoft` |
| Secondary text | `t.muted`, `t.mutedSoft` |
| Borders / dividers | `t.rule`, `t.borderSubtle` |
| Accent / CTA | `t.accent`, `accentGradient(t)` |
| Success / info tint | `t.accentSoft`, `accentChipFg(t)` |
| Error | `t.negative` + alpha suffix |
| Warning | `t.warn`, `t.warnSoft` |

## Reference implementations

| Surface | Styles module |
|---------|----------------|
| Auth (sign-in / sign-up) | `components/auth/styles.ts` |
| Onboarding | `components/onboard/styles.ts` |
| Ported app atoms | `components/atoms.tsx` (`t: Theme` prop) |

## Checklist before finishing

- [ ] No `"Inter"` / `"JetBrains Mono"` literals in new code
- [ ] No `#284256`, `#00B48A`, `#F4F6F8`, etc. unless third-party brand (e.g. Google button)
- [ ] Container sets `fontFamily: t.sans`; mono fields use `t.mono`
- [ ] `npm run typecheck` passes
