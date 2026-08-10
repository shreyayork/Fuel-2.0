# Draft — Portfolio benchmark distribution redesign (10k+ companies)

**Status:** Draft  
**Scope:** `PortfolioBenchmarkSection` / `PortfolioBenchmarkChart` — visualization layer only  
**Route:** Investor → Portfolios → portfolio detail → Benchmark distribution  

---

## Problem

The current benchmark chart plots individual company markers (logos or dots) along a better→worse axis. This works for small portfolios (≤ ~80 companies) but does not scale visually or technically when the cohort contains **10,000+ companies** (and potentially **100,000+**).

At large N:

- Markers overlap and become unreadable
- Thousands of DOM/SVG nodes hurt scroll and interaction performance
- Hover/tooltip identity per marker is not useful at population scale

**Goal:** Replace per-company plotting with an **aggregated distribution** while preserving all existing benchmark metrics, calculations, APIs, and business logic.

---

## Non-goals (do not change)

- Existing APIs and data models
- Benchmark score / tier calculations
- Portfolio median and cohort band math
- Navigation, drawer open/close behavior, company profile flow
- `buildPortfolioBenchmarkSummary` cohort filtering semantics (only how dots are **rendered**)

---

## View dropdown (benchmark section)

The **view** control previews different population sizes for design/QA:

| Option | Sample size | Chart mode |
|---|---|---|
| Portfolio companies | Actual portfolio count (~30) | Logos (per company) |
| Full cohort (10k) | 10,000 synthetic | Density histogram |
| Full cohort (100k) | 100,000 synthetic | Density histogram |

Portfolio company list in the side drawer always shows **real portfolio companies**, regardless of view.

---

## Visualization requirements

### Keep

- Existing card shell per metric (label, hint, cohort P50, portfolio value, trend)
- Better ↔ worse axis with gradient track
- Cohort interquartile band (existing `bandStart` / `bandEnd`)
- Tier pills: strong · watch · concern (counts + click to filter drawer)
- Portfolio median as a **single prominent vertical marker** on the axis

### Add / replace

- **Do not** render one DOM element per company when N > threshold (~80)
- Aggregate companies into **value buckets** along the axis (0–100 position space)
- Each bucket shows:
  - Bar height ∝ company count in range
  - Optional stacked tier segments (strong / watch / concern) inside the bar
  - On hover: value range, count, **% of total**
- **Percentile markers** on the axis:
  - **P25 · P50 · P75 · P100** (vertical ticks + labels)
  - P50 aligns with existing cohort P50 label where data supports it

### Portfolio marker

```
P25          P50          P75          P100
│            │            │             │
├██████████████████
├████████████████████████
├████████████
├███████
├███
└██
                ▲
            Portfolio
```

- One highlighted marker for **portfolio median** (existing `portfolioPosition`)
- Visually distinct from percentile ticks but not overpowering the histogram
- Label: “Portfolio” + formatted value (`portfolioLabel`)

---

## Rendering modes (by population size)

| Companies | Mode | Elements rendered |
|---|---|---|
| ≤ 80 | **Logos** | Per-company logo buttons (current) |
| 81 – 500 | **Compact dots** | Tier-colored dots, no logos |
| > 500 | **Distribution** | Fixed bucket count (40–64 bins), O(bins) DOM |

Bucket count formula (draft):

```ts
binCount = clamp(40, round(sqrt(n)), 64)
```

For **100k+**, consider capping bins at 64 and computing counts in a single pass over dots in memory (no per-company DOM).

---

## Interaction

### Hover (bucket)

Tooltip must include:

- Value range (e.g. `42–44% of axis` or mapped metric units if available)
- Company count in bucket
- Percentage of total cohort (`count / sampleSize × 100`)

### Click (bucket)

- Open existing **portfolio companies drawer**
- Filter portfolio companies whose position falls in the clicked bucket range
- Show range pill in drawer header (e.g. `17–19% of axis`)
- Drawer list = portfolio companies only; search remains available

### Click (tier pill)

- Unchanged: filter drawer by strong / watch / concern

### Click (company logo) — logo mode only

- Open drawer with that company highlighted

---

## Large dataset handling

Must remain smooth for:

| N | Expectation |
|---|---|
| 100 | Logo or compact dot mode |
| 1,000 | Density mode, < 64 bars |
| 10,000 | Density mode, stable 60fps scroll |
| 100,000+ | Same bin count; aggregation only |

**Rules:**

- Bucket aggregation preserves underlying dot data; do not discard or alter source arrays
- Drawer list capped at 200 rows + search (existing)
- Memoize bin layout; avoid re-aggregating on unrelated parent re-renders

---

## UI structure (per metric card)

```
┌─────────────────────────────────────────────────────────────┐
│ Burn multiple  n=10k          Cohort P50 2.1x  Portfolio 1.6x│
├─────────────────────────────────────────────────────────────┤
│ better          10k companies [density]              worse  │
│ ┌─ P25 ─ P50 ─ P75 ─ P100 ─────────────────────────────┐  │
│ │ ▁▂▃▅▇█▇▅▃▂▁  ...histogram...              │ portfolio│  │
│ └────────────────────────────────────────────────────────┘  │
│ strong · 6.4k    watch · 2.6k    concern · 1.1k            │
└─────────────────────────────────────────────────────────────┘
```

Match existing tokens: `--status-good`, `--status-watch`, `--status-bad`, `--panel-border`, `--fuel-accent`.

---

## Performance checklist

- [ ] Max DOM nodes per chart ≈ `binCount` (≤ 64), not N
- [ ] No `page.waitForTimeout` / layout thrashing on hover
- [ ] `useMemo` for bins, percentiles, heat gradient
- [ ] Drawer virtualizes or caps rows (200 + search message)
- [ ] Responsive: bins compress on narrow widths; percentile labels may stack or abbreviate on mobile

---

## Implementation map (when approved)

| File | Change |
|---|---|
| `InvestorDashboard.tsx` | `BenchmarkDensityStrip`, percentile ticks, tooltip content, mode thresholds |
| `investor.css` | Distribution bar, P25–P100 markers, portfolio callout |
| `investorData.ts` | Optional: export percentile helpers from dot positions (visual only) |

**No changes** to API routes, `PortfolioBenchmarkMetric` shape, or portfolio list CRUD.

---

## Acceptance criteria

1. At **30 companies** (portfolio view), chart unchanged — logos + hover tips
2. At **10k** and **100k** (view dropdown), chart shows histogram only — no per-company markers
3. P25 / P50 / P75 / P100 visible on distribution mode
4. Portfolio marker visible and labeled
5. Bucket hover shows count + percentage
6. Bucket click opens drawer filtered to portfolio companies in range
7. No regression to tier pills, summary tiles, or cohort filter dropdown
8. Lighthouse / manual test: section scrolls smoothly with 100k selected

---

## Open questions

1. Should P25/P75 be computed from cohort dots or from declared `bandStart`/`bandEnd`?
2. Show metric-native units on bucket tooltips (e.g. “1.8x–2.0x burn”) or axis % only in v1?
3. Default view: portfolio vs 10k for new users?
