# Fuel 2.0 — Cursor skills

Project skills live under `.cursor/skills/<skill-name>/SKILL.md`. Load the relevant skill before editing that area.

## How to tag a skill (new UI)

In chat, type **`/`** and pick or type the skill name so the agent loads it before building.

| When you want to… | Tag this skill |
|-------------------|----------------|
| **New page, widget, card, table, dashboard module** — colors, borders, spacing | **`fuel-design-system`** |
| Onboarding chat copy, CTAs, Fuel help bubbles | `fuel-onboarding-voice` |
| Scorecard glance / advisor prose (plain language, no jargon) | `fuel-founder-copy` |
| Benchmark bars / percentile tracks | `benchmark-components` |

**Default for visual work:** always tag **`/fuel-design-system`** so panels match founder Overview and R&D · GTM · G&A detail (`.overview-panel` borders, spacing, type).

## Skill index

| Skill | Path | Use when |
|-------|------|----------|
| **Fuel design system** | [fuel-design-system/SKILL.md](./fuel-design-system/SKILL.md) | Colors, borders, spacing, panels, cards, investor + founder dashboards |
| **Fuel onboarding voice** | [fuel-onboarding-voice/SKILL.md](./fuel-onboarding-voice/SKILL.md) | Onboarding chat copy, CTAs, Fuel help bubbles, empty states |
| **Fuel founder copy** | [fuel-founder-copy/SKILL.md](./fuel-founder-copy/SKILL.md) | Scorecard glance focus, advisor summaries — no unexplained acronyms |
| **Benchmark components** | [benchmark-components/SKILL.md](./benchmark-components/SKILL.md) | Cohort tracks, percentile scales, metric bars |

## Adding a skill

1. Create `.cursor/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`).
2. Add a row to the tables above.
3. Keep `SKILL.md` under ~500 lines; put long references in sibling files (e.g. `examples.md`).
