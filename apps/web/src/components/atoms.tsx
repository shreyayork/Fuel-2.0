import type { CSSProperties, ReactNode } from "react";
import type { Theme } from "@/lib/theme";
import type { Person } from "@/lib/types";

export { Logo } from "./Logo";

export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ display: "flex", alignItems: "center", ...style }}>{children}</div>;
}

export function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 99,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export function Rule({ t, dashed }: { t: Theme; dashed?: boolean }) {
  return (
    <div
      style={{
        height: 1,
        background: dashed ? "transparent" : t.rule,
        borderTop: dashed ? `1px dashed ${t.rule}` : "none",
        width: "100%",
      }}
    />
  );
}

export function VRule({ t }: { t: Theme }) {
  return <div style={{ width: 1, background: t.rule, alignSelf: "stretch" }} />;
}

export function Label({
  t,
  children,
  style,
}: {
  t: Theme;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: t.sans,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0",
        color: t.muted,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Num({
  t,
  children,
  size = 28,
  weight = 500,
  style,
}: {
  t: Theme;
  children: ReactNode;
  size?: number;
  weight?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: t.sans,
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
        fontSize: size,
        fontWeight: weight,
        color: t.ink,
        lineHeight: 1,
        letterSpacing: "-0.025em",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type ChipTone = "default" | "accent" | "positive" | "negative" | "warn" | "ghost";

export function Chip({
  t,
  children,
  tone = "default",
  style,
}: {
  t: Theme;
  children: ReactNode;
  tone?: ChipTone;
  style?: CSSProperties;
}) {
  const tones: Record<ChipTone, { bg: string; fg: string; bd: string }> = {
    default: { bg: t.chip, fg: t.inkSoft, bd: t.rule },
    accent: { bg: t.accentSoft, fg: t.accent, bd: "transparent" },
    positive: { bg: "transparent", fg: t.positive, bd: t.positive + "55" },
    negative: { bg: "transparent", fg: t.negative, bd: t.negative + "55" },
    warn: { bg: "transparent", fg: t.warn, bd: t.warn + "55" },
    ghost: { bg: "transparent", fg: t.muted, bd: t.rule },
  };
  const s = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: t.sans,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0",
        padding: "2px 8px",
        borderRadius: 6,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.bd}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Avatar({
  t,
  person,
  size = 26,
}: {
  t: Theme;
  person: Pick<Person, "name" | "avatar">;
  size?: number;
}) {
  return (
    <div
      title={person.name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: t.mono,
        fontSize: size * 0.36,
        fontWeight: 600,
        color: t.inkSoft,
        flexShrink: 0,
      }}
    >
      {person.avatar}
    </div>
  );
}

export function Sparkline({
  data,
  w = 80,
  h: height = 22,
  color,
  thick = 1.2,
}: {
  data: number[];
  w?: number;
  h?: number;
  color: string;
  thick?: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    height - ((v - min) / (max - min || 1)) * (height - 2) - 1,
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={height} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={thick} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={1.8} fill={color} />
    </svg>
  );
}

export function PercentileBar({
  t,
  bench,
  w = 200,
}: {
  t: Theme;
  bench: { youIdx: number };
  w?: number;
}) {
  const youX = bench.youIdx * w;
  return (
    <div style={{ position: "relative", width: w, height: 18 }}>
      <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 1, background: t.rule }} />
      {[0.25, 0.5, 0.75].map((p) => (
        <div
          key={p}
          style={{
            position: "absolute",
            top: 6,
            left: p * w - 0.5,
            width: 1,
            height: 5,
            background: t.mutedSoft,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: youX - 5,
          width: 10,
          height: 10,
          background: t.accent,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

export type TabItem = { key: string; label: string; count?: number };

export function Tabs({
  t,
  items,
  active,
  onChange,
  tourHighlightKey,
  onTourAnchorElChange,
}: {
  t: Theme;
  items: TabItem[];
  active: string;
  onChange: (k: string) => void;
  /** When set, the matching tab button receives the tour spotlight class. */
  tourHighlightKey?: string | null;
  /** Called with the highlighted tab button element (or null when highlight clears). */
  onTourAnchorElChange?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${t.rule}` }}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          data-tour-target={it.key}
          onClick={() => onChange(it.key)}
          ref={tourHighlightKey === it.key ? onTourAnchorElChange : undefined}
          className={tourHighlightKey === it.key ? "fuel-tour-highlight" : undefined}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "10px 12px",
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: active === it.key ? 600 : 500,
            letterSpacing: "-0.005em",
            color: active === it.key ? t.ink : t.muted,
            borderBottom: `2px solid ${active === it.key ? t.ink : "transparent"}`,
            marginBottom: -1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {it.label}
          {it.count != null ? (
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.mutedSoft, fontWeight: 400 }}>
              {it.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function SectionHead({
  t,
  eyebrow,
  title,
  subtitle,
  right,
}: {
  t: Theme;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 20,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: t.sans,
            fontSize: 22,
            fontWeight: 600,
            color: t.ink,
            letterSpacing: "-0.01em",
          }}
        >
          {title ?? eyebrow}
        </h1>
        {subtitle ? (
          <div
            style={{
              marginTop: 4,
              fontFamily: t.sans,
              fontSize: 13,
              color: t.muted,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

export function KPI({
  t,
  label,
  value,
  delta,
  spark,
  sparkColor,
  footnote,
  idx,
}: {
  t: Theme;
  label: ReactNode;
  value: ReactNode;
  delta?: number;
  spark?: number[];
  sparkColor?: string;
  footnote?: ReactNode;
  idx: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        padding: "16px 20px 18px",
        borderLeft: idx === 0 ? "none" : `1px solid ${t.rule}`,
      }}
    >
      <Label t={t}>{label}</Label>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Num t={t} size={26} weight={500}>
          {value}
        </Num>
        {spark ? <Sparkline data={spark} color={sparkColor ?? t.accent} w={60} h={20} /> : null}
      </div>
      {delta != null ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 500,
            color: delta >= 0 ? t.positive : t.negative,
          }}
        >
          {(delta >= 0 ? "↑ " : "↓ ") + Math.abs(delta) + "%"}
        </div>
      ) : null}
      {footnote ? (
        <div style={{ marginTop: 4, fontFamily: t.sans, fontSize: 12, color: t.mutedSoft }}>
          {footnote}
        </div>
      ) : null}
    </div>
  );
}
