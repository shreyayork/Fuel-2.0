"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cohortDotColor,
  cohortDotGlow,
  countFilledBenchmarkDrawerValues,
  emptyBenchmarkDrawerValues,
  formatBenchmarkTick,
  parseBenchmarkDrawerValue,
  type BenchmarkDrawerFieldKey,
  type BenchmarkDrawerUnit,
  type BenchmarkDrawerValues,
} from "@/lib/overview/benchmark-drawer-fields";
import {
  BENCHMARK_NUMERIC_INPUT_MAX_LENGTH,
  sanitizeBenchmarkNumericInput,
} from "@/lib/onboard/benchmark-fields";
import { formatCohortOptionLabel } from "@/lib/benchmarks-format";
import type { CohortFilter } from "@/lib/benchmarks-shared";
import {
  fetchBenchmarkDrawer,
  getCachedBenchmarkDrawer,
  OverviewClientError,
  patchBenchmarkDrawer,
  type BenchmarkDrawerFieldMeta,
  type OverviewMutationResult,
} from "@/lib/overview/client";
import type { OverviewBenchmarkDrawerPayload } from "@/lib/overview/types";
import { useOverviewTheme } from "./overview-theme";
import {
  benchActionBtnStyle,
  benchActionsStyle,
  benchBarBandStyle,
  benchBarDotStyle,
  benchBarTickLabelStyle,
  benchBarTickLineStyle,
  benchBarTrackStyle,
  benchBodyStyle,
  benchCloseBtnStyle,
  benchErrorStyle,
  benchFieldBarStyle,
  benchFieldInputStyle,
  benchFieldLabelStyle,
  benchFieldStyle,
  benchFootNoteStyle,
  benchHeadCopyStyle,
  benchHeadStyle,
  benchIntroPStyle,
  benchIntroStrongStyle,
  benchIntroStyle,
  benchLoadingStyle,
  benchPanelStyle,
  benchSubStyle,
  benchTitleStyle,
} from "./drawerStyles";
import { HoverBtn, OverviewDrawerShell, useDrawerEscape } from "./drawerShared";
import { BenchmarkTrackHover } from "./BenchmarkTrackHover";

type FieldMeta = BenchmarkDrawerFieldMeta & {
  unit: BenchmarkDrawerUnit;
};

type CohortOption = OverviewBenchmarkDrawerPayload["allCohorts"][number];

function hasBenchmarkLocal(
  payload?: OverviewBenchmarkDrawerPayload | null,
): payload is OverviewBenchmarkDrawerPayload {
  if (!payload) return false;
  if (payload.fields?.length) return true;
  return Object.values(payload.values ?? {}).some((value) => Boolean(value?.trim()));
}

function BenchmarkCohortPicker({
  cohortKey,
  allCohorts,
  disabled,
  onChange,
}: {
  cohortKey: string | null;
  allCohorts: CohortOption[];
  disabled?: boolean;
  onChange: (cohortKey: string) => void;
}) {
  const t = useOverviewTheme();
  const [focused, setFocused] = useState(false);
  if (allCohorts.length === 0) return null;

  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginBottom: 18,
        color: t.muted,
        fontFamily: t.sans,
        fontSize: 12,
      }}
    >
      <span
        style={{
          ...benchFieldLabelStyle(t),
          marginBottom: 0,
        }}
      >
        Cohort
      </span>
      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        <select
          value={cohortKey ?? ""}
          disabled={disabled}
          aria-label="Benchmark cohort"
          onChange={(e) => {
            const val = e.target.value;
            if (val) onChange(val);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...benchFieldInputStyle(t, { focused }),
            width: "100%",
            height: 40,
            paddingRight: 34,
            cursor: disabled ? "wait" : "pointer",
          }}
        >
          {allCohorts.map((c) => (
            <option key={c.cohortKey} value={c.cohortKey}>
              {formatCohortOptionLabel(
                c.dimensions as CohortFilter,
                c.cohortKey,
                c.sampleSize,
              )}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1,
            pointerEvents: "none",
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          ▾
        </span>
      </div>
    </label>
  );
}

function BenchmarkFieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldMeta;
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useOverviewTheme();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const parsed = parseBenchmarkDrawerValue(value);
  const hasVal = parsed !== null;
  const displayMax = field.p90 * 1.3 || 1;
  const p25pct = (field.p25 / displayMax) * 100;
  const p75pct = (field.p75 / displayMax) * 100;
  const p90pct = (field.p90 / displayMax) * 100;
  const dotPct = hasVal
    ? Math.min(Math.max((parsed! / displayMax) * 100, 1), 99)
    : null;
  const dc = hasVal
    ? cohortDotColor(parsed!, field.p25, field.p50, field.p75, field.lowerIsBetter)
    : t.mutedSoft;
  const glow = hasVal
    ? cohortDotGlow(parsed!, field.p25, field.p50, field.p75, field.lowerIsBetter)
    : undefined;

  return (
    <div style={benchFieldStyle()}>
      <label style={benchFieldLabelStyle(t)} htmlFor={`bench-${field.key}`}>
        {field.label}
      </label>
      <input
        id={`bench-${field.key}`}
        className="ov-drawer-input"
        type="text"
        inputMode="decimal"
        maxLength={BENCHMARK_NUMERIC_INPUT_MAX_LENGTH}
        value={value}
        onChange={(e) => {
          const next = sanitizeBenchmarkNumericInput(e.target.value);
          if (next === null) return;
          onChange(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "e" || e.key === "E") {
            e.preventDefault();
          }
        }}
        placeholder={field.placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={benchFieldInputStyle(t, { focused, hovered })}
        autoComplete="off"
      />
      <div style={benchFieldBarStyle()}>
        <BenchmarkTrackHover
          cohort={{
            p25: field.p25,
            p50: field.p50,
            p75: field.p75,
            p90: field.p90,
          }}
          unit={field.unit}
          lowerIsBetter={field.lowerIsBetter}
          colors={{
            indicator: t.inkSoft,
            tooltipBg: t.panel,
            tooltipBorder: t.rule,
            title: t.ink,
            body: t.muted,
            shadow: `0 8px 24px ${t.overlay}`,
          }}
        >
          <div style={benchBarTrackStyle(t)}>
            <div
              style={{
                ...benchBarBandStyle(t),
                left: `${p25pct}%`,
                width: `${Math.max(p75pct - p25pct, 0)}%`,
              }}
            />
            <div style={{ ...benchBarTickLineStyle(t), left: `${p25pct}%` }} />
            <div style={{ ...benchBarTickLineStyle(t), left: `${p75pct}%` }} />
            <div
              style={{
                ...benchBarTickLineStyle(t, { strong: true }),
                left: `${p90pct}%`,
              }}
            />
            {dotPct != null ? (
              <div
                style={{
                  ...benchBarDotStyle(t),
                  left: `${dotPct}%`,
                  background: dc,
                  boxShadow: glow,
                }}
              />
            ) : null}
          </div>
        </BenchmarkTrackHover>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 3,
            gap: 8,
          }}
        >
          {(
            [
              ["P25", field.p25],
              ["P75", field.p75],
              ["P90", field.p90],
            ] as const
          ).map(([label, tick]) => (
            <span key={label} style={benchBarTickLabelStyle(t)}>
              {label} {formatBenchmarkTick(tick, field.unit)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BenchmarkFormPanel({
  companyName,
  values,
  fields,
  cohortKey,
  allCohorts,
  loading,
  cohortLoading,
  saving,
  error,
  onChangeValue,
  onCohortChange,
}: {
  companyName: string;
  values: BenchmarkDrawerValues;
  fields: FieldMeta[];
  cohortKey: string | null;
  allCohorts: CohortOption[];
  loading: boolean;
  cohortLoading: boolean;
  saving: boolean;
  error: string | null;
  onChangeValue: (key: BenchmarkDrawerFieldKey, value: string) => void;
  onCohortChange: (cohortKey: string) => void;
}) {
  const t = useOverviewTheme();
  return (
    <div>
      <div style={benchIntroStyle(t)}>
        <strong style={benchIntroStrongStyle(t)}>
          ✦ The more you share, the sharper your intelligence
        </strong>
        <p style={benchIntroPStyle(t)}>
          Every number narrows your cohort. Once metrics are entered, Fuel rebuilds{" "}
          {companyName}&rsquo;s intelligence, suggested initiatives, and playbooks. This
          step is optional.
        </p>
      </div>

      {loading ? (
        <div
          aria-busy="true"
          aria-live="polite"
          style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 280 }}
        >
          <p style={benchLoadingStyle(t)}>Loading metrics…</p>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  background: t.panelAlt,
                  borderRadius: 6,
                  height: 12,
                  width: i % 2 === 0 ? "40%" : "32%",
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  background: t.panelAlt,
                  borderRadius: 8,
                  height: 40,
                  opacity: 0.45,
                }}
              />
              <div
                style={{
                  background: t.panelAlt,
                  borderRadius: 4,
                  height: 8,
                  opacity: 0.35,
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <BenchmarkCohortPicker
            cohortKey={cohortKey}
            allCohorts={allCohorts}
            disabled={cohortLoading || saving}
            onChange={onCohortChange}
          />
          {fields.map((field) => (
            <BenchmarkFieldRow
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={(next) => onChangeValue(field.key, next)}
            />
          ))}
        </div>
      )}

      <p style={benchFootNoteStyle(t)}>
        Numbers stay in your workspace and are never shared externally.
      </p>
      {error ? <p style={benchErrorStyle(t)}>{error}</p> : null}
    </div>
  );
}

export function useBenchmarkForm(opts: {
  sessionOpen: boolean;
  active: boolean;
  companyUuid: string;
  initialBenchmark?: OverviewBenchmarkDrawerPayload | null;
}) {
  const { sessionOpen, active, companyUuid, initialBenchmark } = opts;
  const [values, setValues] = useState<BenchmarkDrawerValues>(emptyBenchmarkDrawerValues());
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [cohortKey, setCohortKey] = useState<string | null>(null);
  const [allCohorts, setAllCohorts] = useState<CohortOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastPersistedRef = useRef("");
  const mountedRef = useRef(true);
  const cohortFetchGen = useRef(0);
  const valuesRef = useRef(values);
  const cohortKeyRef = useRef(cohortKey);
  valuesRef.current = values;
  cohortKeyRef.current = cohortKey;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyPayload = useCallback(
    (payload: {
      values?: BenchmarkDrawerValues;
      fields: FieldMeta[];
      cohortKey?: string | null;
      allCohorts?: CohortOption[];
      replaceValues?: boolean;
    }) => {
      if (payload.replaceValues !== false && payload.values) {
        const next = { ...emptyBenchmarkDrawerValues(), ...payload.values };
        setValues(next);
        lastPersistedRef.current = JSON.stringify(next);
        dirtyRef.current = false;
      }
      setFields(payload.fields);
      if (payload.cohortKey !== undefined) setCohortKey(payload.cohortKey);
      if (payload.allCohorts) setAllCohorts(payload.allCohorts);
      setLoading(false);
      setCohortLoading(false);
    },
    [],
  );

  const load = useCallback(async (opts?: { fetchIfMissing?: boolean }) => {
    setError(null);

    const fromProp = hasBenchmarkLocal(initialBenchmark) ? initialBenchmark : null;
    const fromCache = getCachedBenchmarkDrawer(companyUuid);
    const local = fromProp ?? (hasBenchmarkLocal(fromCache) ? fromCache : null);

    if (local) {
      applyPayload({
        values: {
          ...emptyBenchmarkDrawerValues(),
          ...(local.values as Partial<BenchmarkDrawerValues>),
        },
        fields: local.fields as FieldMeta[],
        cohortKey: local.cohortKey ?? null,
        allCohorts: local.allCohorts ?? [],
      });
      loadedRef.current = true;
      if (!(local.allCohorts?.length)) {
        void fetchBenchmarkDrawer(companyUuid, {
          force: true,
          cohortKey: local.cohortKey,
        })
          .then((json) => {
            if (!mountedRef.current) return;
            applyPayload({
              fields: json.fields as FieldMeta[],
              cohortKey: json.cohortKey,
              allCohorts: json.allCohorts,
              replaceValues: false,
            });
          })
          .catch(() => {
            /* keep seeded bands */
          });
      }
      return;
    }

    if (!opts?.fetchIfMissing) return;

    setLoading(true);
    try {
      const json = await fetchBenchmarkDrawer(companyUuid, { force: true });
      if (!mountedRef.current) return;
      applyPayload({
        values: json.values,
        fields: json.fields as FieldMeta[],
        cohortKey: json.cohortKey,
        allCohorts: json.allCohorts,
      });
      loadedRef.current = true;
    } catch {
      if (!mountedRef.current) return;
      setError("Could not load benchmark metrics.");
      setLoading(false);
    }
  }, [applyPayload, companyUuid, initialBenchmark]);

  useEffect(() => {
    if (!sessionOpen) {
      loadedRef.current = false;
      dirtyRef.current = false;
      setError(null);
      return;
    }
    if (!loadedRef.current) {
      void load({ fetchIfMissing: active });
    }
  }, [sessionOpen, active, load]);

  const persist = useCallback(
    async (regenerate: boolean, includeOverview = true): Promise<OverviewMutationResult | null> => {
      if (!loadedRef.current) return null;
      const snapshot = valuesRef.current;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastPersistedRef.current && !regenerate) return null;
      setSaving(true);
      setError(null);
      try {
        const result = await patchBenchmarkDrawer(companyUuid, snapshot, regenerate, {
          includeOverview,
          cohortKey: cohortKeyRef.current,
        });
        lastPersistedRef.current = serialized;
        dirtyRef.current = false;
        return result;
      } catch (e) {
        setError(
          e instanceof OverviewClientError && e.message.startsWith("Invalid")
            ? e.message
            : "Could not save benchmark. Please try again.",
        );
        throw e;
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [companyUuid],
  );

  const update = (key: BenchmarkDrawerFieldKey, val: string) => {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleCohortChange = async (nextKey: string) => {
    if (!nextKey || nextKey === cohortKey) return;
    const gen = ++cohortFetchGen.current;
    setCohortLoading(true);
    setError(null);
    try {
      const json = await fetchBenchmarkDrawer(companyUuid, {
        force: true,
        cohortKey: nextKey,
      });
      if (!mountedRef.current || gen !== cohortFetchGen.current) return;
      applyPayload({
        fields: json.fields as FieldMeta[],
        cohortKey: json.cohortKey,
        allCohorts: json.allCohorts,
        replaceValues: false,
      });
    } catch {
      if (!mountedRef.current || gen !== cohortFetchGen.current) return;
      setError("Could not load cohort benchmarks. Please try again.");
      setCohortLoading(false);
    }
  };

  const filledCount = countFilledBenchmarkDrawerValues(values);

  return {
    values,
    fields,
    cohortKey,
    allCohorts,
    loading,
    cohortLoading,
    saving,
    error,
    loaded: loadedRef.current,
    dirty: dirtyRef.current,
    filledCount,
    update,
    handleCohortChange,
    persist,
    setError,
  };
}

export function BenchmarkEditDrawer({
  open,
  companyUuid,
  companyName,
  initialBenchmark,
  onClose,
  onSaved,
  includeOverview = true,
  onSaveStart,
  onSaveError,
}: {
  open: boolean;
  companyUuid: string;
  companyName: string;
  initialBenchmark?: OverviewBenchmarkDrawerPayload | null;
  onClose: () => void;
  onSaved: (result?: OverviewMutationResult) => void | Promise<void>;
  includeOverview?: boolean;
  onSaveStart?: () => void;
  onSaveError?: () => void;
}) {
  const t = useOverviewTheme();
  const bench = useBenchmarkForm({
    sessionOpen: open,
    active: open,
    companyUuid,
    initialBenchmark,
  });

  useDrawerEscape(open, bench.saving, onClose);

  const save = async () => {
    onSaveStart?.();
    try {
      const result = await bench.persist(true, includeOverview);
      await onSaved(result ?? undefined);
      onClose();
    } catch {
      onSaveError?.();
    }
  };

  return (
    <OverviewDrawerShell
      open={open}
      onClose={onClose}
      ariaLabel="Edit benchmark"
      variant="bench"
      panelStyle={benchPanelStyle(t)}
    >
      <header style={benchHeadStyle(t)}>
        <div style={benchHeadCopyStyle()}>
          <h2 style={benchTitleStyle(t)}>How do you stack up?</h2>
          <p style={benchSubStyle(t)}>
            Enter your numbers — the bar shows where you sit. Fuel refreshes intelligence
            and initiatives once metrics are in.
          </p>
        </div>
        <HoverBtn
          type="button"
          aria-label="Close"
          styleFor={(hovered) => benchCloseBtnStyle(t, { hovered })}
          onClick={onClose}
        >
          ✕
        </HoverBtn>
      </header>

      <div style={benchBodyStyle()}>
        <BenchmarkFormPanel
          companyName={companyName}
          values={bench.values}
          fields={bench.fields}
          cohortKey={bench.cohortKey}
          allCohorts={bench.allCohorts}
          loading={bench.loading}
          cohortLoading={bench.cohortLoading}
          saving={bench.saving}
          error={bench.error}
          onChangeValue={bench.update}
          onCohortChange={(next) => void bench.handleCohortChange(next)}
        />
      </div>

      <footer style={benchActionsStyle(t)}>
        <HoverBtn
          type="button"
          disabled={bench.saving}
          styleFor={(hovered) =>
            benchActionBtnStyle(t, "cancel", { hovered, disabled: bench.saving })
          }
          onClick={onClose}
        >
          Cancel
        </HoverBtn>
        <HoverBtn
          type="button"
          disabled={bench.saving || bench.loading || bench.cohortLoading}
          styleFor={(hovered) =>
            benchActionBtnStyle(t, "save", {
              hovered,
              disabled: bench.saving || bench.loading || bench.cohortLoading,
            })
          }
          onClick={() => void save()}
        >
          {bench.saving ? "Saving…" : "Save details"}
        </HoverBtn>
      </footer>
    </OverviewDrawerShell>
  );
}
