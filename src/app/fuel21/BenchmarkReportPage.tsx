import { useMemo, useState } from "react";
import {
  BENCHMARK_COHORT_OPTIONS,
  getCohortMetricKeys,
  getCohortMetricPeer,
  type BenchmarkCohortId,
  type BenchmarkMetricKey,
  type CohortMetricPeer,
} from "../benchmarkCohortData.ts";
import "./benchmark-report.css";

/**
 * Standalone peer benchmark report. Research data only: it is not tied to
 * the founder's company numbers, initiatives, or any other page.
 */

type Unit = "usd" | "count" | "pct" | "months" | "x";

type MetricDef = {
  key: BenchmarkMetricKey;
  label: string;
  hint: string;
  unit: Unit;
  lowerIsBetter?: boolean;
};

const METRIC_DEFS: MetricDef[] = [
  { key: "arr", label: "ARR", hint: "Annual recurring revenue (USD).", unit: "usd" },
  { key: "headcount", label: "Headcount (FTE)", hint: "Total full-time employees.", unit: "count" },
  { key: "payingCustomers", label: "Paid customers", hint: "Number of paying customer accounts.", unit: "count" },
  { key: "arrGrowth", label: "ARR growth (YoY)", hint: "Year-over-year ARR growth.", unit: "pct" },
  { key: "grossMargin", label: "Gross margin", hint: "Revenue – cost of goods sold, as a percent of revenue.", unit: "pct" },
  {
    key: "cacPayback",
    label: "CAC payback",
    hint: "Months to recoup customer acquisition cost. Lower is better.",
    unit: "months",
    lowerIsBetter: true,
  },
  {
    key: "burnMultiple",
    label: "Burn multiple",
    hint: "Net burn ÷ net new ARR. Under 1x is world-class.",
    unit: "x",
    lowerIsBetter: true,
  },
  { key: "ruleOf40", label: "Rule of 40", hint: "ARR growth % + FCF margin %. 40%+ is healthy at scale.", unit: "pct" },
  {
    key: "nrr",
    label: "Net revenue retention",
    hint: "ARR from existing cohort 12 months later ÷ prior ARR.",
    unit: "pct",
  },
  {
    key: "logoRetention",
    label: "Logo retention",
    hint: "Share of customer logos retained over the trailing 12 months.",
    unit: "pct",
  },
  { key: "cashOnHand", label: "Cash on hand", hint: "Cash + cash equivalents as of period end.", unit: "usd" },
  {
    key: "monthlyBurn",
    label: "Monthly burn",
    hint: "Net cash burn per month. Compare within stage.",
    unit: "usd",
    lowerIsBetter: true,
  },
];

const STAGE_OPTIONS = [
  { value: "growth", label: "Growth" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
] as const;

const GEO_OPTIONS = [{ value: "us", label: "US" }] as const;

const MODEL_OPTIONS = [{ value: "b2b_saas", label: "B2B SaaS" }] as const;

/** Every cohort in the data set is a B2B SaaS cohort (dev tools is a vertical under it). */
const COHORT_ROWS = BENCHMARK_COHORT_OPTIONS.map(option => {
  const [, stage, geo] = option.value.split(":");
  return {
    ...option,
    model: "b2b_saas",
    stage,
    geo,
    metricCount: getCohortMetricKeys(option.value).length,
  };
});

function fmtValue(value: number, unit: Unit): string {
  switch (unit) {
    case "usd":
      if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `$${Math.round(value / 1e3)}k`;
      return `$${value}`;
    case "pct":
      return `${value}%`;
    case "months":
      return `${value}mo`;
    case "x":
      return `${value.toFixed(1)}x`;
    default:
      return value.toLocaleString("en-US");
  }
}

function MetricCard({ def, peer }: { def: MetricDef; peer: CohortMetricPeer | undefined }) {
  const lowerIsBetter = peer?.lowerIsBetter ?? def.lowerIsBetter ?? false;
  // Track runs from zero to just above P90 so every band sits on the same scale.
  const scaleMax = peer ? peer.p90 * 1.1 : 1;
  const pos = (value: number) => (value / scaleMax) * 100;

  return (
    <div className="f21-bench-card">
      <div className="f21-bench-card-head">
        <strong>{def.label}</strong>
        {lowerIsBetter ? <span className="f21-bench-tag">lower is better</span> : null}
      </div>
      <p className="f21-bench-hint">{def.hint}</p>
      {peer ? (
        <>
          <div className="f21-bench-pcts">
            {(["p25", "p50", "p75", "p90"] as const).map(p => (
              <div key={p} className="f21-bench-pct">
                <span>{p.toUpperCase()}</span>
                <strong className={p === "p50" ? "is-median" : undefined}>
                  {fmtValue(peer[p], def.unit)}
                </strong>
              </div>
            ))}
          </div>
          <div className="f21-bench-track" aria-hidden="true">
            <div
              className="f21-bench-band"
              style={{ left: `${pos(peer.p25)}%`, width: `${pos(peer.p90) - pos(peer.p25)}%` }}
            />
            <div className="f21-bench-median" style={{ left: `${pos(peer.p50)}%` }} />
          </div>
        </>
      ) : (
        <div className="f21-bench-missing">Not in this cohort</div>
      )}
    </div>
  );
}

export function BenchmarkReportPage() {
  const [model, setModel] = useState<string>("any");
  const [stage, setStage] = useState<string>("any");
  const [geo, setGeo] = useState<string>("any");
  const [selectedId, setSelectedId] = useState<BenchmarkCohortId>("b2b_saas:growth:us");

  const filtered = useMemo(
    () =>
      COHORT_ROWS.filter(
        row =>
          (model === "any" || row.model === model) &&
          (stage === "any" || row.stage === stage) &&
          (geo === "any" || row.geo === geo),
      ),
    [model, stage, geo],
  );

  const active = filtered.find(row => row.value === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="f21-page f21-bench-report">
      <div className="f21-page-head">
        <div>
          <h1>Benchmarks</h1>
          <p className="f21-lede">
            Percentile distributions for key metrics across peer cohorts. Pick a cohort to see where your
            portfolio stands.
          </p>
        </div>
      </div>

      <div className="f21-bench-layout">
        <aside className="f21-panel f21-bench-filters">
          <div className="f21-bench-section-label">Filter</div>

          <FilterGroup
            label="Model"
            value={model}
            options={[{ value: "any", label: "any" }, ...MODEL_OPTIONS]}
            onChange={setModel}
          />
          <FilterGroup
            label="Stage"
            value={stage}
            options={[{ value: "any", label: "any" }, ...STAGE_OPTIONS]}
            onChange={setStage}
          />
          <FilterGroup
            label="Geo"
            value={geo}
            options={[{ value: "any", label: "any" }, ...GEO_OPTIONS]}
            onChange={setGeo}
          />

          <div className="f21-bench-divider" />

          <div className="f21-bench-section-label">Cohorts ({filtered.length})</div>
          <div className="f21-bench-cohort-list">
            {filtered.map(row => (
              <button
                key={row.value}
                type="button"
                className={`f21-bench-cohort${active?.value === row.value ? " is-active" : ""}`}
                aria-pressed={active?.value === row.value}
                onClick={() => setSelectedId(row.value)}
              >
                <strong>{row.label}</strong>
                <span>
                  n={row.n} · {row.metricCount} metrics
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="f21-panel f21-bench-main">
          {active ? (
            <>
              <div className="f21-bench-main-head">
                <h2>{active.label}</h2>
                <span className="f21-bench-chip">n={active.n}</span>
                <span className="f21-bench-chip">{active.geo.toUpperCase()}</span>
              </div>

              <div className="f21-bench-grid">
                {METRIC_DEFS.map(def => (
                  <MetricCard key={def.key} def={def} peer={getCohortMetricPeer(active.value, def.key)} />
                ))}
              </div>
            </>
          ) : (
            <p className="f21-bench-missing">No peer groups match these filters.</p>
          )}

          <p className="f21-bench-note">
            Synthetic seed data. Real cohort aggregation from our portfolio + Bright Data + paid sources lands
            next.
          </p>
        </section>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="f21-bench-filter-group">
      <span className="f21-bench-filter-label">{label}</span>
      <div className="f21-bench-pills">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className={`f21-bench-pill${value === option.value ? " is-active" : ""}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
