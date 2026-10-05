"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAdaptiveLayout } from "@/lib/responsive";
import { marketingPanel, marketingTheme as t } from "./styles";

// Keep these in lockstep with the enum in /api/public/cohort-teaser. We
// only expose verticals/stages that actually have seeded cohorts; the API
// falls back to b2b_saas at the same stage when an exact match is missing.
type Vertical = "b2b_saas" | "dev_tools";
type Stage = "seed" | "series_a" | "growth";

const VERTICALS: { value: Vertical; label: string }[] = [
  { value: "b2b_saas", label: "B2B SaaS" },
  { value: "dev_tools", label: "Developer Tools" },
];

const STAGES: { value: Stage; label: string }[] = [
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "growth", label: "Growth" },
];

interface TeaserResponse {
  metric: string;
  requestedCohortKey: string;
  cohortKey: string;
  matchedFallback: boolean;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sampleSize: number | null;
  unit: string;
  period: string;
}

/**
 * "What does the median company in your cohort look like" — a single
 * cached p50 read served from /api/public/cohort-teaser. Designed to
 * generate curiosity, not deliver the full benchmark.
 *
 * Polish: the displayed value count-up animates whenever the cohort
 * changes, with a soft accent-colored glow ring. Sample-size and period
 * land beneath via small fade.
 */
export function TeaserWidget() {
  const { phone, landscape, compact } = useAdaptiveLayout();
  /** Stack copy + chart only in portrait phone; landscape keeps side-by-side. */
  const stacked = phone && !landscape;
  const [vertical, setVertical] = useState<Vertical>("b2b_saas");
  const [stage, setStage] = useState<Stage>("seed");
  const [data, setData] = useState<TeaserResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    const params = new URLSearchParams({
      vertical,
      stage,
      metric: "arr_growth_yoy_pct",
    });
    fetch(`/api/public/cohort-teaser?${params.toString()}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setMissing(true);
          setData(null);
          return;
        }
        if (!r.ok) {
          setMissing(true);
          return;
        }
        const json = (await r.json()) as TeaserResponse;
        setData(json);
      })
      .catch(() => setMissing(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [vertical, stage]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
      style={{
        padding: "0 var(--gutter) var(--section-y)",
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="mkt-teaser-card"
        style={{
          ...marketingPanel({
            padding: compact ? 22 : 36,
            display: "grid",
            gridTemplateColumns: stacked
              ? "minmax(0, 1fr)"
              : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: compact ? 24 : 32,
            alignItems: "stretch",
            background: `linear-gradient(145deg, ${t.accent}14 0%, ${t.panel}F2 42%, ${t.panelInner} 100%)`,
          }),
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-30%",
            right: "-10%",
            width: 400,
            height: 400,
            background: `radial-gradient(closest-side, ${t.accent}2E, transparent)`,
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: t.accent,
              marginBottom: 12,
            }}
          >
            Cohort preview
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "var(--fs-h2)",
              fontWeight: 600,
              letterSpacing: -0.4,
              lineHeight: 1.15,
              color: t.ink,
            }}
          >
            See where the median company in your stage sits.
          </h2>
          <p
            style={{
              marginTop: 14,
              fontSize: 15,
              color: t.inkSoft,
              lineHeight: 1.55,
              maxWidth: 460,
            }}
          >
            Pick your vertical and stage. We&apos;ll surface the cohort&apos;s
            median ARR growth — sign in to compare your own numbers and see all
            four percentile bands.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <Select
              label="Vertical"
              value={vertical}
              onChange={(v) => setVertical(v as Vertical)}
              options={VERTICALS}
            />
            <Select
              label="Stage"
              value={stage}
              onChange={(v) => setStage(v as Stage)}
              options={STAGES}
            />
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: `linear-gradient(180deg, ${t.panelInner} 0%, ${t.bg} 100%)`,
            border: `1px solid ${t.borderSubtle}`,
            borderRadius: 14,
            padding: 32,
            minHeight: 220,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: `0 0 0 1px ${t.borderFaint} inset, 0 20px 48px rgba(0,0,0,0.25)`,
          }}
        >
          <AnimatePresence mode="wait">
            {loading && !data ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: "#8A99A6",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                }}
              >
                resolving cohort…
              </motion.div>
            ) : missing ? (
              <motion.div
                key="missing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ color: "#8A99A6", fontSize: 13 }}
              >
                We don&apos;t have a cohort for that mix yet. Try another.
              </motion.div>
            ) : data && data.p50 != null ? (
              <motion.div
                key={`${vertical}-${stage}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#8A99A6",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 10,
                    fontWeight: 600,
                  }}
                >
                  Median ARR growth · cohort p50
                </div>
                <CountUpValue value={data.p50} unit={data.unit} />
                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    gap: 12,
                    color: "#8A99A6",
                    fontSize: 12,
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    flexWrap: "wrap",
                  }}
                >
                  {data.sampleSize ? <span>n = {data.sampleSize}</span> : null}
                  <span style={{ color: "#3E5668" }}>·</span>
                  <span>period {data.period}</span>
                </div>
                {data.matchedFallback ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "#8A99A6",
                      fontStyle: "italic",
                    }}
                  >
                    Closest available cohort: {prettifyCohortKey(data.cohortKey)}.
                    Full coverage rolls out as the dataset grows.
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}

/** Number that animates from previous value to new value on prop change. */
function CountUpValue({ value, unit }: { value: number; unit: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const duration = 600;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplayed(from + (to - from) * ease(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prev.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Glow ring behind the number */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: -10,
          background:
            "radial-gradient(closest-side, rgba(0,180,138,0.35), transparent 70%)",
          filter: "blur(8px)",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "relative",
          fontSize: 64,
          fontWeight: 600,
          letterSpacing: -1.5,
          color: "#00B48A",
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatValue(displayed, unit)}
      </span>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 12,
        color: "#8A99A6",
        letterSpacing: 1,
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          background: "#0F1A24",
          border: "1px solid #263947",
          borderRadius: 8,
          color: "#F4F6F8",
          padding: "10px 12px",
          fontSize: 14,
          fontFamily: "inherit",
          letterSpacing: 0,
          textTransform: "none",
          fontWeight: 400,
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function prettifyCohortKey(key: string): string {
  const [vertical, stage] = key.split(":");
  const verticalLabel =
    VERTICALS.find((v) => v.value === vertical)?.label ?? vertical;
  const stageLabel = STAGES.find((s) => s.value === stage)?.label ?? stage;
  return `${verticalLabel} · ${stageLabel}`;
}

function formatValue(v: number, unit: string): string {
  if (unit === "pct") return `${v.toFixed(0)}%`;
  if (unit === "usd") return `$${(v / 1_000_000).toFixed(1)}M`;
  if (unit === "x") return `${v.toFixed(1)}×`;
  return String(Math.round(v));
}
