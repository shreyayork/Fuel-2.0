# Fuel 2.0 — York IE

Operating platform for startup founders, executives, and investors. Fuel turns company context, track details, and private benchmarks into an Overview scorecard, intelligence timeline, and partner-ready recommendations.

Design source: [Fuel 2.0 (Prince) on Figma](https://www.figma.com/design/rWZVAXW0edB4lHip6Mb5F0/Fuel-2.0--Prince-)

## Stack

- **React 18** + **TypeScript**
- **Vite 6** dev server and build
- **Tailwind CSS 4** + shadcn/ui (Radix primitives)
- **Recharts** for investor and benchmark charts
- **Motion** for onboarding animations

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Application flow

1. **Onboarding** — company search, identity, and track/benchmark questions (`OnboardingFlow`)
2. **Workspace** — main dashboard with Overview scorecard, journey tracks, intelligence, and Ask Fuel AI (`PatriotPayJourney`)
3. **Investor persona** — portfolio view and suggested founders (`InvestorDashboard`)
4. **Account settings** — integrations, profile, and preferences (`AccountSettings`)

Entry point: `src/main.tsx` → `src/app/App.tsx`

## Project structure

```
src/
├── app/
│   ├── App.tsx                 # View router: onboarding → workspace
│   ├── OnboardingFlow.tsx      # Multi-step onboarding
│   ├── PatriotPayJourney.tsx   # Main workspace shell
│   ├── ScorecardV2.tsx         # Overview scorecard & benchmarks
│   ├── account/                # Settings & integrations
│   ├── credits/                # Credit system & upgrade modal
│   ├── investor/               # Investor dashboard
│   └── components/ui/          # shadcn/ui primitives
├── assets/                     # Icons and static assets
└── styles/                     # Global CSS, tokens, Tailwind
```

## Product docs

- [PRODUCT.md](./PRODUCT.md) — users, purpose, design principles
- [DESIGN.md](./DESIGN.md) — color tokens, typography, layout
- [src/imports/pasted_text/fuel-2-0-product-brief.md](./src/imports/pasted_text/fuel-2-0-product-brief.md) — detailed track specifications
