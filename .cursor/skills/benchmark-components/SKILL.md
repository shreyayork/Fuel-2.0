# Benchmark Visualization Components — Fuel 2.0

## When to use this skill

Read and follow this skill whenever you need to:
- Display benchmark bars (cohort track with P25–P90 band and a value marker dot)
- Display percentile scale labels (P25 / P50 / P75 / P90 row)
- Render any metric vs. cohort visualization inside a card, drilldown, panel, or chat bubble
- Add new benchmark-related UI anywhere in the codebase

**NEVER create a custom benchmark bar from scratch.** Always use the shared components documented here.

---

## Source of truth

All benchmark visualization primitives live in one file:

```
src/app/FuelOnboardingChat.tsx
```

These are exported and must be used everywhere benchmarks are displayed — including onboarding chat, scorecard drilldowns, intelligence panels, and any future screens.

---

## Exported API

### Types

```ts
import type { BenchmarkWizardField } from "./FuelOnboardingChat";
```

`BenchmarkWizardField` — defines one metric for benchmarking:
```ts
{
  key: keyof BenchmarkValues;   // "arr" | "arrGrowth" | "nrr" | etc.
  label: string;                // Human-readable label: "ARR", "Gross margin"
  unit: "usd" | "percent" | "count";
  p25: number; p50: number; p75: number; p90: number;
  bandStart: number;            // % position on track where cohort band starts (P25)
  bandEnd: number;              // % position on track where cohort band ends (P90)
  lowerIsBetter?: boolean;      // true for e.g. monthlyBurn
}
```

---

### Data

```ts
import { BENCHMARK_WIZARD_FIELDS } from "./FuelOnboardingChat";
```

`BENCHMARK_WIZARD_FIELDS: BenchmarkWizardField[]` — the canonical array of all 9 benchmark metrics with their cohort data. **Do not hardcode p25/p50/p75/p90 values anywhere else — read them from here.**

Covered metrics: `arr`, `arrGrowth`, `nrr`, `logoRetention`, `grossMargin`, `monthlyBurn`, `cashOnHand`, `headcount`, `payingCustomers`

Build a key → field lookup once at module level:
```ts
const WIZARD_FIELD_BY_KEY = Object.fromEntries(
  BENCHMARK_WIZARD_FIELDS.map(f => [f.key, f])
) as Record<string, BenchmarkWizardField>;
```

---

### Tier utilities

```ts
import {
  getBenchmarkTier,
  getBenchmarkTierStyle,
  BENCHMARK_TIER_PALETTE,
} from "./FuelOnboardingChat";
```

**`getBenchmarkTier(value, field)`** → `"top" | "upper" | "mid" | "lower" | "bottom"`

**`getBenchmarkTierStyle(tier)`** → color object:
```ts
{
  marker: string;       // the primary tier color (use for value text, marker dot)
  glow: string;         // rgba glow for the marker
  badgeBg: string;      // pill/badge background
  badgeBorder: string;  // pill/badge border
  calloutBg: string;    // insight callout background
  calloutBorder: string;
  value: string;        // color for the large numeric value display
}
```

Usage — tier pill badge:
```tsx
const tier = getBenchmarkTier(value, field);
const ts   = getBenchmarkTierStyle(tier);

<span style={{ color: ts.marker, background: ts.badgeBg, borderColor: ts.badgeBorder }}>
  Above median
</span>
```

**`BENCHMARK_TIER_PALETTE`** — the raw palette object indexed by tier string, if you need direct access.

---

### Position calculation

```ts
import { valueToMarkerPercent } from "./FuelOnboardingChat";
```

**`valueToMarkerPercent(value, field)`** → `number` (0–100)

Maps a raw metric value to its % position on the cohort track. Accounts for log scaling (USD/count) vs linear (percent), and handles `lowerIsBetter`. Pass the result as `marker` to `BenchmarkCohortTrack`.

---

### Components

```ts
import {
  BenchmarkCohortTrack,
  BenchmarkPercentileScale,
} from "./FuelOnboardingChat";
```

#### `BenchmarkCohortTrack`

The canonical benchmark bar. Shows:
- Dark track background
- Teal gradient band from P25 → P90 (the cohort "typical range")
- Colored marker dot + vertical line at the value position
- Smooth animation when `animate={true}`

```tsx
<BenchmarkCohortTrack
  field={field}       // BenchmarkWizardField — required
  marker={marker}     // number | null — from valueToMarkerPercent(); null hides marker
  value={value}       // number | null — used for tier-colored marker; null = no value
  compact={true}      // boolean — use true inside cards; false for full-size chat bars
  animate={false}     // boolean — true only in onboarding chat reveal animation
/>
```

`compact={true}` → 8px bar height, 12px dot  
`compact={false}` → 12px bar height, 16px dot

#### `BenchmarkPercentileScale`

Renders a 4-column grid of P25 / P50 / P75 / P90 labels with values. Highlights the bucket matching the provided value.

```tsx
<BenchmarkPercentileScale
  field={field}            // BenchmarkWizardField — required
  value={value}            // number | null — highlights matching bucket; null = no highlight
  compact={true}           // boolean — smaller text, tight spacing; default false
  highlightMedian={true}   // boolean — emphasise P50 column; default true
/>
```

---

### Formatting

```ts
import { formatBenchmarkDisplay } from "./FuelOnboardingChat";
```

**`formatBenchmarkDisplay(value, unit)`** → string

Consistent formatter for all metric values. Uses: `$1.2M`, `$500K`, `$353`, `88%`, `12`. **Use this everywhere instead of custom number formatters.**

---

## Canonical usage pattern (metric card)

This is what `MetricCard` in `ScorecardV2.tsx` does — follow the same pattern anywhere:

```tsx
import {
  BenchmarkCohortTrack, BenchmarkPercentileScale,
  BENCHMARK_WIZARD_FIELDS, valueToMarkerPercent,
  getBenchmarkTier, getBenchmarkTierStyle,
  formatBenchmarkDisplay,
  type BenchmarkWizardField,
} from "./FuelOnboardingChat";

const WIZARD_FIELD_BY_KEY = Object.fromEntries(
  BENCHMARK_WIZARD_FIELDS.map(f => [f.key, f])
) as Record<string, BenchmarkWizardField>;

function MyMetricDisplay({ metricKey, rawValue }: { metricKey: string; rawValue: number | null }) {
  const field     = WIZARD_FIELD_BY_KEY[metricKey];
  const marker    = rawValue != null && field ? valueToMarkerPercent(rawValue, field) : null;
  const tier      = rawValue != null && field ? getBenchmarkTier(rawValue, field) : null;
  const tierStyle = tier ? getBenchmarkTierStyle(tier) : null;

  return (
    <div>
      {/* Big value */}
      <span style={{ color: tierStyle?.value ?? "inherit" }}>
        {rawValue != null && field ? formatBenchmarkDisplay(rawValue, field.unit) : "—"}
      </span>

      {/* Tier pill */}
      {tierStyle && (
        <span style={{ background: tierStyle.badgeBg, borderColor: tierStyle.badgeBorder, color: tierStyle.marker }}>
          Above median
        </span>
      )}

      {/* Bar — identical to onboarding chat */}
      {field && (
        <>
          <BenchmarkCohortTrack compact field={field} marker={marker} value={rawValue} />
          <BenchmarkPercentileScale compact field={field} value={rawValue} />
        </>
      )}
    </div>
  );
}
```

---

## Where the shared components are currently used

| Location | Component | Notes |
|---|---|---|
| `FuelOnboardingChat.tsx` – `LiveBenchmarkBar` | `BenchmarkCohortTrack`, `BenchmarkPercentileScale` | Full-size, animated during onboarding |
| `FuelOnboardingChat.tsx` – `LockedBenchmarkRow` | `BenchmarkCohortTrack`, `BenchmarkPercentileScale` | Compact, locked summary view |
| `FuelOnboardingChat.tsx` – `BenchmarkPeerComparisonPanel` | `BenchmarkCohortTrack` | Compact, all metrics, playbook pickers |
| `ScorecardV2.tsx` – `MetricCard` | `BenchmarkCohortTrack`, `BenchmarkPercentileScale` | Compact, inside 2-col drilldown cards |

---

## Rules

1. **Never hardcode P25/P50/P75/P90 values.** Read them from `BENCHMARK_WIZARD_FIELDS`.
2. **Never build a custom bar element** (div with left-fill, custom dot, etc.). Use `BenchmarkCohortTrack`.
3. **Never write a custom formatter** for metric values. Use `formatBenchmarkDisplay`.
4. **Never define tier colors inline.** Use `getBenchmarkTierStyle(tier)`.
5. If you need a new metric added to the benchmark system, add it to `BENCHMARK_WIZARD_FIELDS` in `FuelOnboardingChat.tsx` first — then all consumers get it automatically.
