# Fuel 2.0 — Cursor skills

Project skills live under `.cursor/skills/<skill-name>/SKILL.md`. Load the relevant skill before editing that area.

## How to tag a skill (new UI)

In chat, type **`/`** and pick or type the skill name so the agent loads it before building.

| When you want to… | Tag this skill |
|-------------------|----------------|
| **New page, widget, card, table, dashboard module** — colors, borders, spacing | **`fuel-design-system`** |
| **Scorecard / track detail** — status colors, rings, pills, chips, flags, casing | **`fuel-scorecard-ui`** |
| Onboarding chat copy, CTAs, Fuel help bubbles | `fuel-onboarding-voice` |
| Scorecard glance / advisor prose (plain language, no jargon) | `fuel-founder-copy` |
| Benchmark bars / percentile tracks | `benchmark-components` |
| Cross-repo replication prompt (layout + logic, no APIs/DB/colors) | **`feature-handoff-prompt`** |

**Default for visual work:** always tag **`/fuel-design-system`**. For scorecard detail / glance status UI, also tag **`/fuel-scorecard-ui`**.

## Skill index

| Skill | Path | Use when |
|-------|------|----------|
| **Fuel design system** | [fuel-design-system/SKILL.md](./fuel-design-system/SKILL.md) | Colors, borders, spacing, panels, cards, investor + founder dashboards |
| **Fuel scorecard UI** | [fuel-scorecard-ui/SKILL.md](./fuel-scorecard-ui/SKILL.md) | Status green/amber/red, rings, pills, chips, flags, typography casing |
| **Fuel onboarding voice** | [fuel-onboarding-voice/SKILL.md](./fuel-onboarding-voice/SKILL.md) | Onboarding chat copy, CTAs, Fuel help bubbles, empty states |
| **Fuel founder copy** | [fuel-founder-copy/SKILL.md](./fuel-founder-copy/SKILL.md) | Scorecard glance focus, advisor summaries — no unexplained acronyms |
| **Benchmark components** | [benchmark-components/SKILL.md](./benchmark-components/SKILL.md) | Cohort tracks, percentile scales, metric bars |
| **Feature handoff prompt** | [feature-handoff-prompt/SKILL.md](./feature-handoff-prompt/SKILL.md) | Generate replication prompts for another repo — layout, flows, storage; no APIs, tables, or design tokens |

## Adding a skill

1. Create `.cursor/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`).
2. Add a row to the tables above.
3. Keep `SKILL.md` under ~500 lines; put long references in sibling files (e.g. `examples.md`).
