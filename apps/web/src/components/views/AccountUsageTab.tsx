"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "../ThemeContext";
import { useCredits } from "../credits/CreditProvider";
import { shimmerBarStyle } from "@/components/ai/MagicShimmer";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { totalRemaining } from "@/lib/credits/logic";
import { fetchCreditUsage } from "@/lib/credits/client";
import type {
  CreditSnapshot,
  CreditUsageActivityRow,
  CreditUsageReport,
  UsagePeriod,
} from "@/lib/credits/types";
import { isoToYmdLocal, type DayRange } from "@/lib/date-range";
import type { Theme } from "@/lib/theme";

const USAGE_PERIOD_OPTIONS: { id: UsagePeriod; label: string }[] = [
  { id: "1d", label: "1d" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "mtd", label: "MTD" },
  { id: "last-month", label: "Last month" },
];

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  if (value <= 0) return "$0";
  if (value < 10) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString()}`;
}

function useIsNarrow(breakpoint = 900): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpoint]);
  return narrow;
}

function panelStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
  };
}

function progressFill(t: Theme, pct: number): CSSProperties {
  return {
    background: `linear-gradient(90deg, ${t.accent}6B, ${t.accent})`,
    borderRadius: 999,
    height: "100%",
    minWidth: pct > 0 ? 2 : 0,
    width: `${Math.min(100, Math.max(0, pct))}%`,
  };
}

function SkelBar({
  t,
  width,
  height,
  rounded = 6,
}: {
  t: Theme;
  width: string | number;
  height: number;
  rounded?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width,
        height,
        borderRadius: rounded,
        ...shimmerBarStyle(t),
        border: "none",
      }}
    />
  );
}

function ShimmerKeyframes() {
  return (
    <style>{`@keyframes fuel-shimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }`}</style>
  );
}

export function AccountUsageTab({
  memberEmails = [],
}: {
  memberEmails?: string[];
}) {
  const t = useTheme();
  const narrow = useIsNarrow();
  const { snapshot, loading: snapshotLoading, openUpgrade } = useCredits();
  const [period, setPeriod] = useState<UsagePeriod>("30d");
  const [customRange, setCustomRange] = useState<DayRange | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [report, setReport] = useState<CreditUsageReport | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    setActivityError(null);
    fetchCreditUsage(period, userFilter, customRange)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null);
          setActivityError("Unable to load usage activity. Try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, userFilter, customRange, reloadKey]);

  // Live-refresh when credit-consuming actions sync (F20A-168).
  useEffect(() => {
    const bump = () => setReloadKey((n) => n + 1);
    window.addEventListener("fuel:credits-refresh", bump);
    window.addEventListener("fuel:credits-snapshot", bump);
    return () => {
      window.removeEventListener("fuel:credits-refresh", bump);
      window.removeEventListener("fuel:credits-snapshot", bump);
    };
  }, []);

  const users = report?.users?.length ? report.users : memberEmails;
  const rangeLabel = report?.range.label ?? "—";
  // Preset periods have no custom range — show the active report window as the
  // calendar's selected range so opening the picker reflects current filtering.
  const reportStart = isoToYmdLocal(report?.range.start);
  const reportEnd = isoToYmdLocal(report?.range.end);
  const selectedRange: DayRange | null =
    customRange ?? (reportStart && reportEnd ? { start: reportStart, end: reportEnd } : null);
  const activity = report?.activity ?? [];
  const totalCredits = report?.summary.totalCredits ?? 0;
  const totalRuns = report?.summary.totalRuns ?? 0;
  const planSpend = report?.summary.planSpend ?? 0;
  const topUpSpend = report?.summary.topUpSpend ?? 0;
  const amountSpent = report?.summary.amountSpent ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        width: "100%",
        fontFamily: t.sans,
      }}
      aria-busy={snapshotLoading || activityLoading}
    >
      <ShimmerKeyframes />
      <PlanCards snapshot={snapshot} loading={snapshotLoading} narrow={narrow} t={t} />
      <TopUpFooter
        snapshot={snapshot}
        loading={snapshotLoading}
        onTopUp={() => openUpgrade("topup")}
        t={t}
      />
      <FiltersBar
        t={t}
        narrow={narrow}
        period={period}
        onPeriodChange={(next) => {
          setCustomRange(null);
          setPeriod(next);
        }}
        customRange={customRange}
        selectedRange={selectedRange}
        onCustomRangeChange={setCustomRange}
        rangeLabel={rangeLabel}
        userFilter={userFilter}
        onUserFilterChange={setUserFilter}
        users={users}
      />
      <SummaryCard
        t={t}
        narrow={narrow}
        snapshot={snapshot}
        totalCredits={totalCredits}
        totalRuns={totalRuns}
        amountSpent={amountSpent}
        planSpend={planSpend}
        topUpSpend={topUpSpend}
        rangeLabel={rangeLabel}
        userFilter={userFilter}
        loading={activityLoading && !report}
      />
      <UsageActivitySection
        t={t}
        narrow={narrow}
        userFilter={userFilter}
        activity={activity}
        loading={activityLoading}
        error={activityError}
        onRetry={() => setReloadKey((n) => n + 1)}
      />
      <p
        style={{
          color: t.muted,
          fontFamily: t.mono,
          fontSize: 10,
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        Usage · {rangeLabel}
      </p>
    </div>
  );
}

function PlanCards({
  snapshot,
  loading,
  narrow,
  t,
}: {
  snapshot: CreditSnapshot | null;
  loading: boolean;
  narrow: boolean;
  t: Theme;
}) {
  const used = snapshot?.monthlyUsed ?? 0;
  const limit = snapshot?.monthlyLimit ?? 0;
  const includedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const topUp = snapshot?.topUpBalance ?? 0;

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns: narrow ? "1fr" : "repeat(2, minmax(0, 1fr))",
      }}
    >
      <div
        style={{
          ...panelStyle(t),
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 132,
          padding: "18px 20px",
        }}
      >
        <span style={{ color: t.muted, fontSize: 12, fontWeight: 600 }}>Your included usage</span>
        {loading || !snapshot ? (
          <>
            <SkelBar t={t} width="72%" height={28} />
            <SkelBar t={t} width="100%" height={7} rounded={999} />
            <SkelBar t={t} width="40%" height={12} />
          </>
        ) : (
          <>
            <strong
              style={{
                color: t.ink,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {`${formatCompact(used)} / ${formatCompact(limit)} credits`}
            </strong>
            <div
              style={{
                background: t.borderSubtle,
                borderRadius: 999,
                height: 7,
                overflow: "hidden",
                width: "100%",
              }}
              aria-hidden
            >
              <div style={progressFill(t, includedPct)} />
            </div>
            <span style={{ color: t.muted, fontSize: 11.5 }}>
              Resets {snapshot.monthlyResetLabel}
            </span>
          </>
        )}
      </div>

      <div
        style={{
          ...panelStyle(t),
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 132,
          padding: "18px 20px",
        }}
      >
        <span style={{ color: t.muted, fontSize: 12, fontWeight: 600 }}>On-demand usage</span>
        {loading || !snapshot ? (
          <>
            <SkelBar t={t} width="28%" height={28} />
            <div style={{ borderTop: `1px solid ${t.rule}`, marginTop: 2, paddingTop: 10 }}>
              <SkelBar t={t} width="88%" height={12} />
            </div>
            <SkelBar t={t} width="55%" height={12} />
          </>
        ) : (
          <>
            <strong
              style={{
                color: t.ink,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {topUp > 0 ? "On" : "Off"}
            </strong>
            <p
              style={{
                borderTop: `1px solid ${t.rule}`,
                color: t.muted,
                fontSize: 12,
                lineHeight: 1.45,
                margin: "2px 0 0",
                paddingTop: 10,
              }}
            >
              Pay for extra usage beyond your plan limits.
            </p>
            <span style={{ color: t.muted, fontSize: 11.5 }}>
              {topUp > 0
                ? `${topUp.toLocaleString()} top-up credits available`
                : "No active top-up balance"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function TopUpFooter({
  snapshot,
  loading,
  onTopUp,
  t,
}: {
  snapshot: CreditSnapshot | null;
  loading: boolean;
  onTopUp: () => void;
  t: Theme;
}) {
  const topUp = snapshot?.topUpBalance ?? 0;

  return (
    <div
      style={{
        ...panelStyle(t),
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        justifyContent: "space-between",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
        <span
          style={{
            color: t.muted,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Top-up balance
        </span>
        {loading || !snapshot ? (
          <SkelBar t={t} width={140} height={18} />
        ) : (
          <strong style={{ color: t.ink, fontSize: 16, fontWeight: 700 }}>
            {`${topUp.toLocaleString()} credits`}
          </strong>
        )}
      </div>
      <button
        type="button"
        onClick={onTopUp}
        style={{
          background: t.borderFaint,
          border: `1px solid ${t.rule}`,
          borderRadius: 6,
          color: t.ink,
          cursor: "pointer",
          font: "inherit",
          fontSize: 12,
          fontWeight: 700,
          padding: "8px 12px",
          whiteSpace: "nowrap",
        }}
      >
        Top up credits <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function FiltersBar({
  t,
  narrow,
  period,
  onPeriodChange,
  customRange,
  selectedRange,
  onCustomRangeChange,
  rangeLabel,
  userFilter,
  onUserFilterChange,
  users,
}: {
  t: Theme;
  narrow: boolean;
  period: UsagePeriod;
  onPeriodChange: (period: UsagePeriod) => void;
  customRange: DayRange | null;
  selectedRange: DayRange | null;
  onCustomRangeChange: (range: DayRange | null) => void;
  rangeLabel: string;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  users: string[];
}) {
  return (
    <div
      style={{
        ...panelStyle(t),
        alignItems: narrow ? "stretch" : "center",
        display: "flex",
        flexDirection: narrow ? "column" : "row",
        flexWrap: "wrap",
        gap: "12px 16px",
        justifyContent: "space-between",
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          minWidth: 0,
        }}
      >
        <DateRangePicker
          t={t}
          value={selectedRange}
          onChange={onCustomRangeChange}
          onClear={() => onCustomRangeChange(null)}
          label={rangeLabel}
          numberOfMonths={narrow ? 1 : 2}
          aria-label="Date range"
        />
        <span
          style={{ color: t.muted, fontSize: 12, lineHeight: 1 }}
          title="Usage is filtered to the selected date range"
        >
          ⓘ
        </span>
        <div
          role="tablist"
          aria-label="Usage period"
          style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
        >
          {USAGE_PERIOD_OPTIONS.map((option) => {
            const active = !customRange && period === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onPeriodChange(option.id)}
                style={{
                  background: active ? t.borderSubtle : "transparent",
                  border: 0,
                  borderRadius: 6,
                  color: active ? t.ink : t.muted,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 10px",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <label
        style={{
          alignItems: "center",
          display: "inline-flex",
          gap: 8,
          width: narrow ? "100%" : undefined,
        }}
      >
        <span
          style={{
            color: t.muted,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          User
        </span>
        <select
          value={userFilter}
          onChange={(event) => onUserFilterChange(event.target.value)}
          aria-label="Filter usage by user"
          style={{
            background: t.borderFaint,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            color: t.ink,
            flex: narrow ? 1 : undefined,
            font: "inherit",
            fontSize: 12.5,
            fontWeight: 600,
            minWidth: narrow ? 0 : 180,
            padding: "7px 10px",
            width: narrow ? "100%" : undefined,
          }}
        >
          <option value="all">All users</option>
          {users.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SummaryCard({
  t,
  narrow,
  snapshot,
  totalCredits,
  totalRuns,
  amountSpent,
  planSpend,
  topUpSpend,
  rangeLabel,
  userFilter,
  loading,
}: {
  t: Theme;
  narrow: boolean;
  snapshot: CreditSnapshot | null;
  totalCredits: number;
  totalRuns: number;
  amountSpent: number;
  planSpend: number;
  topUpSpend: number;
  rangeLabel: string;
  userFilter: string;
  loading: boolean;
}) {
  const remaining = snapshot ? totalRemaining(snapshot) : 0;
  const cap = snapshot ? snapshot.monthlyLimit + snapshot.topUpBalance : 0;
  const limitNote =
    snapshot && snapshot.plan === "free" && snapshot.topUpBalance <= 0
      ? `${remaining.toLocaleString()} of ${snapshot.monthlyLimit.toLocaleString()} trial credits remaining`
      : snapshot
        ? `${remaining.toLocaleString()} of ${cap.toLocaleString()} remaining · resets ${snapshot.monthlyResetLabel}`
        : "—";

  const spendMeta =
    planSpend > 0
      ? `${formatCurrency(planSpend)} plan${topUpSpend > 0 ? ` · ${formatCurrency(topUpSpend)} top-ups` : ""}`
      : topUpSpend > 0
        ? `Free plan · ${formatCurrency(topUpSpend)} top-ups`
        : "Free plan";

  return (
    <div style={{ ...panelStyle(t), overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gap: 0,
          gridTemplateColumns: narrow ? "1fr" : "repeat(3, minmax(0, 1fr))",
        }}
      >
        <StatCell
          t={t}
          narrow={narrow}
          label="Total this period"
          value={
            loading ? (
              <SkelBar t={t} width="70%" height={28} />
            ) : (
              `${formatCompact(totalCredits)} credits`
            )
          }
          meta={
            loading || !snapshot ? <SkelBar t={t} width="85%" height={12} /> : limitNote
          }
          last={false}
        />
        <StatCell
          t={t}
          narrow={narrow}
          label="Agent runs"
          value={loading ? <SkelBar t={t} width="36%" height={28} /> : String(totalRuns)}
          meta={
            loading ? (
              <SkelBar t={t} width="55%" height={12} />
            ) : (
              `${rangeLabel}${userFilter !== "all" ? ` · ${userFilter}` : ""}`
            )
          }
          last={false}
        />
        <StatCell
          t={t}
          narrow={narrow}
          label="Amount spent"
          value={loading ? <SkelBar t={t} width="42%" height={28} /> : formatCurrency(amountSpent)}
          meta={loading ? <SkelBar t={t} width="60%" height={12} /> : spendMeta}
          last
        />
      </div>
    </div>
  );
}

function StatCell({
  t,
  narrow,
  label,
  value,
  meta,
  last,
}: {
  t: Theme;
  narrow: boolean;
  label: string;
  value: ReactNode;
  meta: ReactNode;
  last: boolean;
}) {
  return (
    <div
      style={{
        borderBottom: narrow && !last ? `1px solid ${t.rule}` : undefined,
        borderRight: !narrow && !last ? `1px solid ${t.rule}` : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "20px 22px",
      }}
    >
      <span
        style={{
          color: t.accent,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {typeof value === "string" || typeof value === "number" ? (
        <strong
          style={{
            color: t.ink,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {value}
        </strong>
      ) : (
        value
      )}
      {typeof meta === "string" ? (
        <span style={{ color: t.muted, fontSize: 12, lineHeight: 1.45 }}>{meta}</span>
      ) : (
        meta
      )}
    </div>
  );
}

function UsageActivitySection({
  t,
  narrow,
  userFilter,
  activity,
  loading,
  error,
  onRetry,
}: {
  t: Theme;
  narrow: boolean;
  userFilter: string;
  activity: CreditUsageActivityRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const title =
    userFilter === "all" ? "Usage activity" : `Usage activity · ${userFilter}`;
  const subtitle =
    userFilter === "all"
      ? "Credit-consuming actions across your team for the selected period."
      : "Credit-consuming actions for this teammate in the selected period.";

  let body: ReactNode;
  if (error) {
    body = (
      <div style={{ ...panelStyle(t), padding: "22px 20px" }}>
        <strong style={{ color: t.ink, display: "block", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          Could not load activity
        </strong>
        <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.5, margin: "0 0 12px", maxWidth: 520 }}>
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: t.borderFaint,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            color: t.ink,
            cursor: "pointer",
            font: "inherit",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          Retry
        </button>
      </div>
    );
  } else if (loading && activity.length === 0) {
    body = (
      <div
        style={{ ...panelStyle(t), overflow: "hidden" }}
        role="status"
        aria-label="Loading activity"
      >
        {!narrow ? (
          <div
            style={{
              ...rowGrid(narrow),
              background: t.panelAlt,
              borderTop: "none",
              color: t.muted,
              fontFamily: t.mono,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Date</span>
            <span>User</span>
            <span>Action</span>
            <span style={{ textAlign: "right" }}>Credits</span>
          </div>
        ) : null}
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              ...rowGrid(narrow),
              borderTop: `1px solid ${t.rule}`,
            }}
          >
            <div style={{ gridColumn: narrow ? "1 / -1" : undefined }}>
              <SkelBar t={t} width={narrow ? "48%" : "78%"} height={14} />
            </div>
            <div style={{ gridColumn: narrow ? "1 / -1" : undefined }}>
              <SkelBar t={t} width={narrow ? "72%" : "90%"} height={12} />
            </div>
            <div style={{ gridColumn: narrow ? "1 / -1" : undefined }}>
              <SkelBar t={t} width={narrow ? "60%" : "85%"} height={12} />
            </div>
            <div style={{ justifySelf: "end", width: "70%" }}>
              <SkelBar t={t} width="100%" height={12} />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (activity.length === 0) {
    body = (
      <div style={{ ...panelStyle(t), padding: "22px 20px" }}>
        <strong style={{ color: t.ink, display: "block", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          No activity in this period
        </strong>
        <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.5, margin: 0, maxWidth: 520 }}>
          Credit-consuming actions will show up here once your team starts using Fuel.
        </p>
      </div>
    );
  } else {
    body = (
      <div style={{ ...panelStyle(t), overflow: "hidden", opacity: loading ? 0.7 : 1 }}>
        {!narrow ? (
          <div
            style={{
              ...rowGrid(narrow),
              background: t.panelAlt,
              borderTop: "none",
              color: t.muted,
              fontFamily: t.mono,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Date</span>
            <span>User</span>
            <span>Action</span>
            <span style={{ textAlign: "right" }}>Credits</span>
          </div>
        ) : null}
        {activity.map((row) => (
          <div
            key={row.id}
            style={{
              ...rowGrid(narrow),
              borderTop: `1px solid ${t.rule}`,
            }}
          >
            <strong
              style={{
                color: t.ink,
                fontSize: 13,
                fontWeight: 600,
                gridColumn: narrow ? "1 / -1" : undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.date}
            </strong>
            <span
              style={{
                color: t.ink,
                fontSize: 12.5,
                fontWeight: 500,
                gridColumn: narrow ? "1 / -1" : undefined,
                marginTop: narrow ? -4 : undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.email}
            </span>
            <span
              style={{
                color: t.inkSoft,
                fontSize: 12.5,
                fontWeight: 500,
                gridColumn: narrow ? "1 / -1" : undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {narrow ? (
                <>
                  <span
                    style={{
                      color: t.muted,
                      fontFamily: t.mono,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      marginRight: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Action
                  </span>
                  {row.action}
                </>
              ) : (
                row.action
              )}
            </span>
            <span
              style={{
                color: t.inkSoft,
                fontFamily: t.mono,
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
              }}
            >
              {narrow ? (
                <>
                  <span
                    style={{
                      color: t.muted,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      marginRight: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Credits
                  </span>
                  {formatCompact(row.credits)}
                </>
              ) : (
                formatCompact(row.credits)
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            color: t.accent,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Activity
        </span>
        <h3 style={{ color: t.ink, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h3>
        <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.5, margin: 0, maxWidth: 640 }}>
          {subtitle}
        </p>
      </div>
      {body}
    </section>
  );
}

function rowGrid(narrow: boolean): CSSProperties {
  return {
    alignItems: "center",
    display: "grid",
    gap: narrow ? 8 : 12,
    gridTemplateColumns: narrow
      ? "1fr 1fr"
      : "minmax(160px, 1.1fr) minmax(160px, 1.3fr) minmax(140px, 1.2fr) 88px",
    padding: "12px 16px",
  };
}
