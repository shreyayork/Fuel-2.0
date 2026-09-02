---
name: fuel-scorecard-ui
description: >-
  Apply Fuel scorecard status colors and typography on overview glance, R&D/GTM/G&A
  detail, benchmark pills, insight chips, and form flags. Use when editing ScorecardV2,
  track detail panels, progress rings, status badges, or light/dark scorecard styles.
---

# Fuel scorecard UI

Load **before** changing scorecard / track-detail visuals. Pair with [fuel-design-system](../fuel-design-system/SKILL.md) for panels and spacing.

## Status colors (exactly 3 — both themes)

| Role | Token | Hex | Use |
|------|--------|-----|-----|
| Good | `--status-good` | `#12b886` | Strength chips, left accents, “View more →”, strong/above rings |
| Watch | `--status-watch` | `#F5A623` | Mid / around median rings + watch/concern **flags** |
| Bad | `--status-bad` | `#E05C5C` | Weak/bottom rings + missing **flags** |

Tints: `--status-*-dim` / `--status-*-line` — for **pills and flags only**. Do **not** tint form/bench row backgrounds.

Left rail accents (timeline, KPI, intel) → always `--status-good`.

Glance ring + score number follow status (`cat.barColour` / `colourFromScore`) — green / amber / red. “View more →” stays `--status-good`.

In TS: `toneColour()` and `getBenchmarkTierStyle()` — green / amber / red only (top=upper=good, mid=lower=watch, bottom=bad).

## Typography (strict casing + size)

| Element | Case | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Section eyebrow | UPPERCASE via CSS | `10px` | 700 | Only place for ALL CAPS |
| Status badge / pill / flag | Sentence case | `11px` | 600 | No CSS `text-transform` |
| Insight chip label | Sentence case | `12px` | 600 | No CSS capitalize |
| Chip tooltip title | Sentence case | `11px` | 650 | No uppercase |
| Chip tooltip body | Sentence case | `12px` | 500 | |
| Form label / value | As written | `12` / `12.5px` | 600 / 500 | |
| Metric value in gap row | As written | `14px` | 700 | |

Examples: `Bottom of cohort` · `Needs attention` · `Delivery constraint`

## Banned

- Uppercase / capitalize CSS on pills, flags, or chips
- Status hex outside the 3 tokens
- Tinted backgrounds on form/bench rows (`is-concern`, `is-watch`, `is-missing`, `is-gap`)

Selected option chips (details drawer): light green fill (`--status-good-dim`) + green border (`--status-good`) — same pattern as preferred selected controls.

## Checklist

- [ ] Status uses only good / watch / bad tokens
- [ ] Left accents + View more = `--status-good`
- [ ] Glance ring follows status (green / amber / red)
- [ ] Form/bench rows: neutral surface; status color only on pill/flag
- [ ] Badges/pills/flags: sentence case, `11px`
- [ ] Insight chips: sentence case, `12px`, no CSS capitalize/uppercase
- [ ] Only section eyebrows use uppercase micro-labels
