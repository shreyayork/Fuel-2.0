# Design system (from CLAUDE.md)

## Tokens

`src/lib/theme.ts` — two modes:

| Mode | Use |
|------|-----|
| `editorial` | Light |
| `signal` | Dark |

**Palette (do not change without design evidence):**

- York navy `#284256`
- Teal accent `#00B48A`
- Gold warn `#ECD67F`
- Fonts: Inter + JetBrains Mono

## Atoms

`src/components/atoms.tsx` — `Chip`, `KPI`, `Sparkline`, `PercentileBar`, `Tabs`, `SectionHead`, etc.

- Every atom takes **`t: Theme`** and uses **inline styles**
- Deliberate 1:1 port of `ds.jsx` from the design bundle
- **Do not** mix Tailwind into ported atoms without a strong reason
- Token-driven inline styles keep both themes consistent

## Newer surfaces

- Tailwind is installed for **new** code
- Onboarding / agent: `components/ai/*`, `AI_TOKENS`, `components/onboard/tokens.ts`, `components/onboard/styles.ts`
- Many `(app)` views use local `button(t)` / `input(t)` helpers with `Theme`
- Migrating off inline styles is a **separate deliberate pass** — don't do it opportunistically

## Design source (not in repo)

Prototype lived in Claude Design export (`Fuel 2.0 Redesign.html`, `ds.jsx`, `shell.jsx`, `views.jsx`, `data.js`).

On this machine, reference path noted in CLAUDE.md: `/tmp/fuel-design/fuel-2-0/project/`

When design changes: re-read prototype, update TSX ports — resist changing visual tokens without source evidence.
