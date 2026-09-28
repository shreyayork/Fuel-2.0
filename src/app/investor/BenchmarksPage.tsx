import React, { useEffect, useMemo, useState } from "react";
import {
  BENCHMARK_WIZARD_FIELDS,
  formatBenchmarkDisplay,
  type BenchmarkWizardField,
} from "../FuelOnboardingChat.tsx";

type BenchModel = "any" | "B2B SaaS" | "Dev Tools";
type BenchStage = "any" | "Growth" | "Seed" | "Series A";
type BenchGeo = "any" | "US";

type ExplorerCohort = {
  id: string;
  model: Exclude<BenchModel, "any">;
  stage: Exclude<BenchStage, "any">;
  geo: Exclude<BenchGeo, "any">;
  n: number;
  metricCount: number;
  missingKeys?: Array<BenchmarkWizardField["key"]>;
};

const EXPLORER_COHORTS: ExplorerCohort[] = [
  { id: "b2b-growth-us", model: "B2B SaaS", stage: "Growth", geo: "US", n: 94, metricCount: 10, missingKeys: ["cacPayback", "burnMultiple"] },
  { id: "b2b-seed-us", model: "B2B SaaS", stage: "Seed", geo: "US", n: 128, metricCount: 12 },
  { id: "b2b-series-a-us", model: "B2B SaaS", stage: "Series A", geo: "US", n: 86, metricCount: 12 },
  { id: "devtools-series-a-us", model: "Dev Tools", stage: "Series A", geo: "US", n: 52, metricCount: 11, missingKeys: ["burnMultiple"] },
];

const METRIC_BLURBS: Partial<Record<BenchmarkWizardField["key"], string>> = {
  arr: "Annual recurring revenue · USD",
  headcount: "Full-time employees on payroll",
  payingCustomers: "Paying customer logos",
  arrGrowth: "Year-over-year ARR growth",
  grossMargin: "Blended gross margin",
  cacPayback: "Months to recover CAC · lower is better",
  burnMultiple: "Net burn ÷ net new ARR · lower is better",
  ruleOf40: "Growth % + profit margin %",
  nrr: "Net revenue retention",
  logoRetention: "Customer logo retention",
  monthlyBurn: "Monthly net cash burn · lower is better",
  cashOnHand: "Cash available today",
};

const DISPLAY_METRICS = BENCHMARK_WIZARD_FIELDS.filter(field =>
  ["arr", "headcount", "payingCustomers", "arrGrowth", "grossMargin", "cacPayback", "burnMultiple", "ruleOf40"].includes(field.key),
);

function stageScale(stage: ExplorerCohort["stage"]): number {
  if (stage === "Seed") return 0.55;
  if (stage === "Series A") return 1;
  return 2.4;
}

function scaledField(field: BenchmarkWizardField, cohort: ExplorerCohort): BenchmarkWizardField {
  const scale = stageScale(cohort.stage);
  const scaleValue = (value: number) => {
    let next = value;
    if (field.unit === "usd" || field.unit === "count") {
      next = value * scale;
    } else if (field.unit === "percent") {
      const delta = field.key === "arrGrowth" ? (1 - scale) * 18 : (scale - 1) * 4;
      next = Math.max(1, value + delta);
    } else if (field.unit === "months" || field.unit === "multiple") {
      next = value * (1.15 / Math.max(0.6, Math.sqrt(scale)));
    }
    if (field.unit === "count" || field.unit === "") return Math.round(next);
    if (field.unit === "usd") return Math.round(next);
    if (field.unit === "percent") return Math.round(next * 10) / 10;
    if (field.unit === "months" || field.unit === "multiple") return Math.round(next * 10) / 10;
    return next;
  };
  return {
    ...field,
    p25: scaleValue(field.p25),
    p50: scaleValue(field.p50),
    p75: scaleValue(field.p75),
    p90: scaleValue(field.p90),
  };
}

function cohortLabel(cohort: ExplorerCohort): string {
  return `${cohort.model} · ${cohort.stage} · ${cohort.geo}`;
}

function cohortMeta(cohort: ExplorerCohort): string {
  return `n=${cohort.n} · ${cohort.metricCount} metrics`;
}

function FilterPills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="investor-bench-explorer-filter">
      <span className="investor-bench-explorer-filter-label">{label}</span>
      <div className="investor-bench-explorer-pills" role="group" aria-label={label}>
        {options.map(option => (
          <button
            key={option}
            type="button"
            className={`investor-bench-explorer-pill${value === option ? " is-active" : ""}`}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CohortDistributionBar({ field }: { field: BenchmarkWizardField }) {
  const min = Math.min(field.p25 * 0.7, field.p25);
  const max = Math.max(field.p90 * 1.08, field.p90);
  const span = Math.max(1, max - min);
  const toPct = (value: number) => `${((value - min) / span) * 100}%`;

  return (
    <div className="investor-bench-explorer-bar" aria-hidden="true">
      <div className="investor-bench-explorer-bar-track">
        <span
          className="investor-bench-explorer-bar-fill"
          style={{ left: toPct(field.p25), width: `calc(${toPct(field.p90)} - ${toPct(field.p25)})` }}
        />
        <i style={{ left: toPct(field.p25) }} />
        <i style={{ left: toPct(field.p50) }} />
        <i style={{ left: toPct(field.p75) }} />
        <i style={{ left: toPct(field.p90) }} />
      </div>
    </div>
  );
}

function MetricCard({
  field,
  cohort,
}: {
  field: BenchmarkWizardField;
  cohort: ExplorerCohort;
}) {
  const missing = cohort.missingKeys?.includes(field.key) ?? false;
  const scaled = scaledField(field, cohort);
  const blurb = METRIC_BLURBS[field.key] ?? field.promptHint ?? field.prompt;

  return (
    <article className={`investor-bench-explorer-card${missing ? " is-empty" : ""}`}>
      <header className="investor-bench-explorer-card-head">
        <strong>{field.label}</strong>
        <p>{blurb}</p>
      </header>
      {missing ? (
        <div className="investor-bench-explorer-empty">
          <span>Not in this cohort</span>
          {field.lowerIsBetter ? <em>lower is better</em> : null}
        </div>
      ) : (
        <>
          <div className="investor-bench-explorer-percentiles" aria-label={`${field.label} percentiles`}>
            {([
              ["P25", scaled.p25],
              ["P50", scaled.p50],
              ["P75", scaled.p75],
              ["P90", scaled.p90],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{formatBenchmarkDisplay(value, scaled.unit)}</strong>
              </div>
            ))}
          </div>
          <CohortDistributionBar field={scaled} />
        </>
      )}
    </article>
  );
}

export default function BenchmarksPage() {
  const [model, setModel] = useState<BenchModel>("B2B SaaS");
  const [stage, setStage] = useState<BenchStage>("any");
  const [geo, setGeo] = useState<BenchGeo>("US");
  const [activeId, setActiveId] = useState(EXPLORER_COHORTS[0]!.id);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredCohorts = useMemo(() => {
    return EXPLORER_COHORTS.filter(cohort => {
      if (model !== "any" && cohort.model !== model) return false;
      if (stage !== "any" && cohort.stage !== stage) return false;
      if (geo !== "any" && cohort.geo !== geo) return false;
      return true;
    });
  }, [geo, model, stage]);

  const activeCohort = filteredCohorts.find(cohort => cohort.id === activeId)
    ?? filteredCohorts[0]
    ?? EXPLORER_COHORTS[0]!;

  useEffect(() => {
    if (!filteredCohorts.some(cohort => cohort.id === activeId) && filteredCohorts[0]) {
      setActiveId(filteredCohorts[0].id);
    }
  }, [activeId, filteredCohorts]);

  return (
    <section className="investor-bench-explorer-page">
      <header className="investor-bench-explorer-head">
        <div>
          <h1>Benchmarks</h1>
          <p>
            Percentile distributions for key metrics across peer cohorts. Pick a cohort to see where your
            portfolio stands.
          </p>
        </div>
        <button
          type="button"
          className="investor-bench-explorer-filters-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(open => !open)}
        >
          {filtersOpen ? "Hide filters" : "Filters & cohorts"}
        </button>
      </header>

      <div className={`investor-bench-explorer-layout${filtersOpen ? " is-filters-open" : ""}`}>
        <aside className="investor-bench-explorer-sidebar">
          <div className="investor-bench-explorer-sidebar-panel">
            <div className="investor-bench-explorer-section-label">Filter</div>
            <div className="investor-bench-explorer-filters">
              <FilterPills
                label="Model"
                value={model}
                options={["any", "B2B SaaS", "Dev Tools"] as const}
                onChange={setModel}
              />
              <FilterPills
                label="Stage"
                value={stage}
                options={["any", "Growth", "Seed", "Series A"] as const}
                onChange={setStage}
              />
              <FilterPills
                label="Geo"
                value={geo}
                options={["any", "US"] as const}
                onChange={setGeo}
              />
            </div>
          </div>

          <div className="investor-bench-explorer-sidebar-panel">
            <div className="investor-bench-explorer-section-label">
              Cohorts <span>({filteredCohorts.length})</span>
            </div>
            <div className="investor-bench-explorer-cohorts" role="listbox" aria-label="Cohorts">
              {filteredCohorts.length === 0 ? (
                <p className="investor-bench-explorer-empty-list">No cohorts match these filters.</p>
              ) : (
                filteredCohorts.map(cohort => {
                  const selected = cohort.id === activeCohort.id;
                  return (
                    <button
                      key={cohort.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`investor-bench-explorer-cohort${selected ? " is-active" : ""}`}
                      onClick={() => {
                        setActiveId(cohort.id);
                        setFiltersOpen(false);
                      }}
                    >
                      <strong>{cohortLabel(cohort)}</strong>
                      <span>{cohortMeta(cohort)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="investor-bench-explorer-main">
          <div className="investor-bench-explorer-main-panel">
            <header className="investor-bench-explorer-cohort-head">
              <div>
                <h2>{cohortLabel(activeCohort)}</h2>
                <div className="investor-bench-explorer-cohort-badges">
                  <span>n={activeCohort.n}</span>
                  <span>{activeCohort.geo}</span>
                  <span>{activeCohort.metricCount} metrics</span>
                </div>
              </div>
            </header>

            <div className="investor-bench-explorer-grid">
              {DISPLAY_METRICS.map(field => (
                <MetricCard key={field.key} field={field} cohort={activeCohort} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
