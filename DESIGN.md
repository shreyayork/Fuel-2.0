# Design System — Fuel by York IE

## Visual Theme

Dark charcoal onboarding split with mint accent; light cool-gray app shell with emerald primary actions. Operator density, soft 8–12px radii, restrained accent use.

## Colors

| Token | Value | Role |
|---|---|---|
| Onboarding bg | `#0C1A25` | Left form panel |
| Accent | `#12b886` / `#3DD68C` | Primary CTA, progress, focus |
| Accent gradient | `rgb(0,180,138)` → `rgb(236,214,127)` | Primary buttons |
| Text | `#F2F5F2` / `#1A2B26` | Onboarding / app body |
| Muted | `#8FA99A` / `#556878` | Secondary copy |
| Warning | `#F5A623` / `#D4924A` | Incomplete profile |
| Surface | `#1F3140` / `#EEF8F5` | Inputs / motion panel |

## Typography

Inter / system sans. Product scale: 11–13px labels, 14–15px body, 28–36px onboarding titles (weight 800). No display serifs in product UI.

## Components

- Pill step badges (`Step N of 2`)
- Search select with company rows
- Identity form: full name + role select
- Incomplete-profile banner + section unlock cards
- Sidebar footer: credits + York nudge (gated on profile complete)

## Layout

Split onboarding (50/50). App: left sidebar + main Overview. Incomplete state replaces analytics tracks with unlock cards until profile completion.
