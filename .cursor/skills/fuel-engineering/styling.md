# Styling & design system

See [design-system.md](design-system.md) for Fuel-specific rules from `CLAUDE.md`.

## Rules

- **Ported atoms:** `t: Theme` + inline styles only — no Tailwind in `atoms.tsx` without explicit reason
- **New surfaces:** Tailwind allowed; reuse tokens from `theme.ts` / `AI_TOKENS` before arbitrary values
- Search `components/views/*` for `button(t)` / `input(t)` patterns before new primitives
- Auth / onboarding style helpers: `components/auth/styles.ts`, `components/onboard/styles.ts` — see skill `fuel-theme-tokens`
- York palette: `#284256`, `#00B48A`, `#ECD67F` — don't drift without design source
- Mobile-first; match existing breakpoints (e.g. onboarding sidebar `@media (min-width: 900px)`)

## Primitives map

| Need | Look in |
|------|---------|
| Theme tokens | `lib/theme.ts` |
| Shared atoms | `components/atoms.tsx` |
| Agent/onboarding chrome | `components/ai/*` |
| Onboarding cards | `components/onboard/layout.tsx`, `components/onboard/chat/tokens.ts` |
| Auth sign-in/up | `components/auth/styles.ts` |

Maintain visual consistency; migrating off inline styles is a dedicated pass, not drive-by refactors.
