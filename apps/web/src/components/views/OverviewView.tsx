"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Chip, KPI, Logo, SectionHead } from "@/components/atoms";
import { useTheme } from "@/components/ThemeContext";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import type { OverviewCompanyCard, OverviewPageData } from "@/lib/overview-page-data";

function fmtUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
}

function runwayMonths(c: OverviewCompanyCard): number | null {
  if (c.monthlyBurnUsd == null || c.monthlyBurnUsd <= 0 || c.cashOnHandUsd == null) {
    return null;
  }
  return c.cashOnHandUsd / c.monthlyBurnUsd;
}

export function OverviewView({ data }: { data: OverviewPageData }) {
  const t = useTheme();
  const phone = useNarrow(BREAKPOINTS.md);
  const { companies, kpis, portfolioCount } = data;

  return (
    <div className="fuel-page fuel-overview-home">
      <SectionHead
        t={t}
        title="Overview"
        subtitle={
          companies.length === 0
            ? "Your portfolio snapshot will show here once companies are added."
            : `${companies.length} ${companies.length === 1 ? "company" : "companies"} · ${portfolioCount} ${portfolioCount === 1 ? "portfolio" : "portfolios"}`
        }
        right={
          <Link
            href="/portfolio"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: TOUCH_TARGET_MIN,
              padding: "0 12px",
              borderRadius: 8,
              border: `1px solid ${t.rule}`,
              background: t.panel,
              color: t.inkSoft,
              fontFamily: t.sans,
              fontSize: phone ? 14 : 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            All portfolios
          </Link>
        }
      />

      <div
        className="fuel-scroll-x"
        style={{
          display: "flex",
          border: `1px solid ${t.rule}`,
          background: t.panel,
          marginBottom: phone ? 16 : 24,
          borderRadius: phone ? 12 : 0,
        }}
      >
        <KPI
          t={t}
          idx={0}
          label="Combined ARR"
          value={fmtUsd(kpis.combinedArrUsd)}
          footnote={
            companies.length
              ? `Across ${companies.filter((c) => c.arrUsd != null).length} with readings`
              : "No ARR readings yet"
          }
        />
        <KPI
          t={t}
          idx={1}
          label="Median growth"
          value={
            kpis.avgGrowthPct == null ? "—" : `${kpis.avgGrowthPct.toFixed(0)}%`
          }
        />
        <KPI
          t={t}
          idx={2}
          label="Median NRR"
          value={kpis.avgNrrPct == null ? "—" : `${kpis.avgNrrPct.toFixed(0)}%`}
        />
        <KPI
          t={t}
          idx={3}
          label="Monthly burn"
          value={fmtUsd(kpis.monthlyBurnUsd)}
          footnote="Sum across holdings"
        />
        <KPI
          t={t}
          idx={4}
          label="<12mo runway"
          value={kpis.lowRunwayCount}
          footnote={
            kpis.lowRunwayCount
              ? "Needs attention"
              : companies.length
                ? "All healthy or unknown"
                : "—"
          }
        />
      </div>

      {companies.length === 0 ? (
        <div
          style={{
            padding: phone ? 28 : 48,
            textAlign: "center",
            border: `1px dashed ${t.rule}`,
            borderRadius: 12,
            background: t.panel,
            fontFamily: t.sans,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: t.ink }}>
            No companies in your portfolios yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: t.muted,
              marginTop: 8,
              lineHeight: 1.5,
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            Open a portfolio and add companies, or import from Fuel 1.0. This
            overview will fill in with ARR, growth, and runway once readings
            land.
          </div>
          <Link
            href="/portfolio"
            style={{
              display: "inline-flex",
              marginTop: 18,
              minHeight: TOUCH_TARGET_MIN,
              alignItems: "center",
              padding: "0 16px",
              borderRadius: 8,
              background: t.ink,
              color: t.bg,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Go to portfolios
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: t.sans,
                fontSize: phone ? 16 : 15,
                fontWeight: 700,
                color: t.ink,
              }}
            >
              Companies
            </div>
            <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
              Tap a card to open the company profile
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: phone
                ? "minmax(0, 1fr)"
                : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: 12,
            }}
          >
            {companies.map((c) => (
              <CompanyCard key={c.uuid} company={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompanyCard({ company: c }: { company: OverviewCompanyCard }) {
  const t = useTheme();
  const months = runwayMonths(c);
  const runwayTone =
    months == null ? t.muted : months < 12 ? t.negative : months < 18 ? t.warn : t.positive;

  const cardStyle: CSSProperties = {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 12,
    color: "inherit",
    display: "block",
    fontFamily: t.sans,
    padding: 16,
    textAlign: "left",
    textDecoration: "none",
    width: "100%",
  };

  return (
    <Link href={`/company/${c.uuid}`} style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Logo
            t={t}
            co={{
              logo: c.name.slice(0, 2).toUpperCase(),
              name: c.name,
              uuid: c.uuid,
            }}
            size={36}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: t.ink,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.name}
            </div>
            <div
              style={{
                color: t.muted,
                fontSize: 12,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.portfolioNames.join(" · ")}
            </div>
          </div>
        </div>
        {months != null ? (
          <Chip t={t} tone={months < 12 ? "warn" : "positive"}>
            {`${months.toFixed(0)}mo`}
          </Chip>
        ) : (
          <Chip t={t} tone="ghost">
            —
          </Chip>
        )}
      </div>

      <div
        className="fuel-grid-kpi"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginTop: 4,
        }}
      >
        <Metric
          label="ARR"
          value={fmtUsd(c.arrUsd)}
          sub={c.arrGrowthPct != null ? fmtPct(c.arrGrowthPct) : null}
          subColor={
            c.arrGrowthPct == null
              ? undefined
              : c.arrGrowthPct >= 0
                ? t.positive
                : t.negative
          }
        />
        <Metric label="NRR" value={c.nrrPct == null ? "—" : `${c.nrrPct.toFixed(0)}%`} />
        <Metric
          label="Burn"
          value={fmtUsd(c.monthlyBurnUsd)}
          sub={months != null ? `~${months.toFixed(0)}mo cash` : null}
          subColor={runwayTone}
        />
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string | null;
  subColor?: string;
}) {
  const t = useTheme();
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 11,
          fontWeight: 500,
          color: t.muted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 18,
          fontWeight: 600,
          color: t.ink,
          marginTop: 4,
          letterSpacing: "-0.02em",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: subColor ?? t.muted,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}
