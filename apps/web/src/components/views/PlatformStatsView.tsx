"use client";

import { useTheme } from "../ThemeContext";
import type { PlatformStats } from "@/lib/platform-stats";

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

export function PlatformStatsView({ stats }: { stats: PlatformStats }) {
  const t = useTheme();
  const pub = stats.public;
  const priv = stats.private;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Public — fuel-data snapshot */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            color: t.mutedSoft,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Fuel Data · public snapshot
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <BigStat
            t={t}
            label="Total system data"
            value={`${pub.totalStorageTB.toFixed(1)} TB`}
            sub="Neptune + OpenSearch"
          />
          <BigStat
            t={t}
            label="Companies analyzed"
            value={fmtNum(pub.companiesAnalyzed)}
            sub="Crunchbase + derived"
          />
          <BigStat
            t={t}
            label="Data points / day"
            value={fmtNum(pub.dataPointsPerDay)}
            sub="New + updated"
          />
        </div>
      </div>

      {/* Private — customer-accumulated */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            color: t.mutedSoft,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Fuel · private operating data
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <BigStat
            t={t}
            label="Context items"
            value={fmtNum(priv.contextItemsTotal)}
            sub={`${fmtNum(priv.contextItemsLast7d)} in last 7d`}
          />
          <BigStat
            t={t}
            label="Signal observations"
            value={fmtNum(priv.signalObservationsTotal)}
            sub={`${fmtNum(priv.signalObservationsActive)} active`}
          />
          <BigStat
            t={t}
            label="Portfolio companies"
            value={fmtNum(priv.watchlistCompaniesDistinct)}
            sub={`${fmtNum(priv.pipelineMatchedDistinct)} in pipeline`}
          />
          <BigStat
            t={t}
            label="Agent runs"
            value={fmtNum(priv.agentRunsTotal)}
            sub={`${fmtNum(priv.agentTokensSpent)} tokens`}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          <SourceBreakdown
            t={t}
            title="Context by source"
            rows={[
              { label: "HubSpot (emails + notes)", value: priv.contextItemsHubspot },
              { label: "Granola (meeting transcripts)", value: priv.contextItemsGranola },
              { label: "Slack", value: priv.contextItemsSlack },
            ]}
          />
          <SourceBreakdown
            t={t}
            title="Catalogs"
            rows={[
              { label: "Signals in catalog", value: priv.signalsCatalog },
              { label: "Benchmark cohorts", value: priv.benchmarkCohorts },
              { label: "Playbooks", value: priv.playbooks },
              { label: "Advisors (active)", value: priv.advisorsActive },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function BigStat({
  t,
  label,
  value,
  sub,
}: {
  t: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: t.panelAlt,
        border: `1px solid ${t.ruleSoft}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontFamily: t.mono,
          fontSize: 9.5,
          color: t.mutedSoft,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 28,
          fontWeight: 600,
          color: t.accent,
          marginTop: 4,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function SourceBreakdown({
  t,
  title,
  rows,
}: {
  t: ReturnType<typeof useTheme>;
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: t.mono,
          fontSize: 10,
          color: t.mutedSoft,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td
                style={{
                  padding: "5px 0",
                  fontFamily: t.sans,
                  fontSize: 12.5,
                  color: t.inkSoft,
                  borderBottom: `1px solid ${t.ruleSoft}`,
                }}
              >
                {r.label}
              </td>
              <td
                style={{
                  padding: "5px 0",
                  fontFamily: t.mono,
                  fontSize: 12.5,
                  color: t.ink,
                  textAlign: "right",
                  borderBottom: `1px solid ${t.ruleSoft}`,
                }}
              >
                {fmtNum(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
