"use client";

import { useTheme } from "../ThemeContext";
import type { PlatformStats } from "@/lib/platform-stats";
import type { Theme } from "@/lib/theme";

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
    <div className="fuel-platform-stats">
      <section
        className="fuel-platform-stats__panel"
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
        }}
      >
        <div
          className="fuel-platform-stats__eyebrow"
          style={{ color: t.mutedSoft, fontFamily: t.mono }}
        >
          Fuel Data · public snapshot
        </div>
        <div className="fuel-platform-stats__grid fuel-platform-stats__grid--public">
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
      </section>

      <section
        className="fuel-platform-stats__panel"
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
        }}
      >
        <div
          className="fuel-platform-stats__eyebrow"
          style={{ color: t.mutedSoft, fontFamily: t.mono }}
        >
          Fuel · private operating data
        </div>
        <div className="fuel-platform-stats__grid fuel-platform-stats__grid--private">
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

        <div className="fuel-platform-stats__split">
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
      </section>
    </div>
  );
}

function BigStat({
  t,
  label,
  value,
  sub,
}: {
  t: Theme;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="fuel-platform-stats__stat"
      style={{
        background: t.panelAlt,
        border: `1px solid ${t.ruleSoft}`,
      }}
    >
      <div
        className="fuel-platform-stats__stat-label"
        style={{ color: t.mutedSoft, fontFamily: t.mono }}
      >
        {label}
      </div>
      <div
        className="fuel-platform-stats__stat-value"
        style={{ color: t.accent, fontFamily: t.sans }}
      >
        {value}
      </div>
      {sub ? (
        <div
          className="fuel-platform-stats__stat-sub"
          style={{ color: t.muted, fontFamily: t.sans }}
        >
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
  t: Theme;
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="fuel-platform-stats__breakdown">
      <div
        className="fuel-platform-stats__breakdown-title"
        style={{ color: t.mutedSoft, fontFamily: t.mono }}
      >
        {title}
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td
                style={{
                  borderBottom: `1px solid ${t.ruleSoft}`,
                  color: t.inkSoft,
                  fontFamily: t.sans,
                  fontSize: 12.5,
                  padding: "8px 0",
                }}
              >
                {r.label}
              </td>
              <td
                style={{
                  borderBottom: `1px solid ${t.ruleSoft}`,
                  color: t.ink,
                  fontFamily: t.mono,
                  fontSize: 12.5,
                  fontFeatureSettings: '"tnum" 1',
                  padding: "8px 0",
                  textAlign: "right",
                  whiteSpace: "nowrap",
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
