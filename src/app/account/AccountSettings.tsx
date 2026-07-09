import React, { useMemo, useState } from "react";
import { useCredits } from "../credits/CreditProvider";
import { totalRemaining } from "../credits/creditLogic";
import { TOP_UP_OPTIONS } from "../credits/constants";
import type { CreditSnapshot } from "../credits/types";
import {
  ACCOUNT_SETTINGS_TABS,
  type AccountSettingsTab,
} from "./AccountSettingsNav";
import "./accountSettings.css";

type UsageUserRow = {
  email: string;
  credits: number;
  runs: number;
};

type TopUpPurchaseRow = {
  date: string;
  pack: string;
  credits: number;
  amount: number;
};

type UsagePeriod = "1d" | "7d" | "30d" | "mtd" | "last-month";

type DailyActivityRow = {
  date: string;
  dateKey: string;
  email: string;
  credits: number;
  runs: number;
};

const USAGE_PERIOD_OPTIONS: { id: UsagePeriod; label: string }[] = [
  { id: "1d", label: "1d" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "mtd", label: "MTD" },
  { id: "last-month", label: "Last month" },
];

const TEAM_USAGE_WEIGHTS = [
  { email: "shreya.g@york.ie", share: 0.28, runs: 14 },
  { email: "amy.m@york.ie", share: 0.22, runs: 11 },
  { email: "matt.m@york.ie", share: 0.16, runs: 8 },
  { email: "jordan.k@york.ie", share: 0.12, runs: 7 },
  { email: "sam.p@york.ie", share: 0.10, runs: 6 },
  { email: "taylor.r@york.ie", share: 0.07, runs: 4 },
  { email: "casey.l@york.ie", share: 0.05, runs: 3 },
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


function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getPeriodRange(period: UsagePeriod, now = new Date()): { start: Date; end: Date } {
  const end = endOfDay(now);
  const start = startOfDay(now);

  if (period === "7d") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (period === "30d") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }
  if (period === "mtd") {
    start.setDate(1);
    return { start, end };
  }
  if (period === "last-month") {
    start.setMonth(start.getMonth() - 1, 1);
    const lastEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return { start, end: lastEnd };
  }
  return { start, end };
}

function formatRangeLabel(start: Date, end: Date): string {
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function daysInRange(start: Date, end: Date): number {
  const ms = endOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

function periodScale(period: UsagePeriod, now = new Date()): number {
  const { start, end } = getPeriodRange(period, now);
  const days = daysInRange(start, end);
  if (period === "last-month") return 1;
  if (period === "mtd") {
    const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.min(1, days / monthDays);
  }
  return Math.min(1, days / 30);
}

function dayWeight(index: number, seed: number): number {
  return 0.55 + ((Math.sin(index * 1.7 + seed) + 1) / 2) * 0.9;
}

function buildDailyActivity(
  totalCredits: number,
  totalRuns: number,
  start: Date,
  end: Date,
  userFilter: string,
): DailyActivityRow[] {
  const dayCount = daysInRange(start, end);
  const dayWeights = Array.from({ length: dayCount }, (_, index) => dayWeight(index, userFilter.length));
  const dayWeightSum = dayWeights.reduce((sum, weight) => sum + weight, 0);
  const users = userFilter === "all"
    ? TEAM_USAGE_WEIGHTS
    : TEAM_USAGE_WEIGHTS.filter(user => user.email === userFilter);

  const rows: DailyActivityRow[] = [];

  Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const dateLabel = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const dateKey = day.toISOString().slice(0, 10);
    const dayCredits = dayWeightSum > 0 ? Math.round((dayWeights[index] / dayWeightSum) * totalCredits) : 0;
    const dayRuns = dayWeightSum > 0 ? Math.max(0, Math.round((dayWeights[index] / dayWeightSum) * totalRuns)) : 0;

    if (userFilter !== "all") {
      if (dayCredits > 0 || dayRuns > 0) {
        rows.push({
          date: dateLabel,
          dateKey,
          email: userFilter,
          credits: dayCredits,
          runs: dayRuns,
        });
      }
      return;
    }

    let allocatedCredits = 0;
    users.forEach((user, userIndex) => {
      const credits = userIndex === users.length - 1
        ? dayCredits - allocatedCredits
        : Math.round(dayCredits * user.share);
      allocatedCredits += credits;
      const runs = Math.max(0, Math.round(dayRuns * user.share));
      if (credits <= 0 && runs <= 0) return;
      rows.push({
        date: dateLabel,
        dateKey,
        email: user.email,
        credits,
        runs,
      });
    });
  });

  return rows.reverse();
}

function buildUsageRows(snapshot: CreditSnapshot, scale = 1, userFilter = "all"): UsageUserRow[] {
  const used = Math.round(snapshot.monthlyUsed * scale);

  if (userFilter !== "all") {
    const row = TEAM_USAGE_WEIGHTS.find(item => item.email === userFilter);
    return [{
      email: userFilter,
      credits: Math.round(used * (row?.share ?? 1)),
      runs: Math.max(0, Math.round((row?.runs ?? 0) * scale)),
    }];
  }

  if (used <= 0) {
    return [{ email: "shreya.g@york.ie", credits: 0, runs: 0 }];
  }

  let allocated = 0;
  return TEAM_USAGE_WEIGHTS.map((row, index) => {
    const credits = index === TEAM_USAGE_WEIGHTS.length - 1
      ? used - allocated
      : Math.round(used * row.share);
    allocated += credits;
    return { email: row.email, credits, runs: Math.max(0, Math.round(row.runs * scale)) };
  });
}

function buildTopUpPurchases(snapshot: CreditSnapshot): TopUpPurchaseRow[] {
  const purchases: TopUpPurchaseRow[] = [];
  const growthPack = TOP_UP_OPTIONS.find(p => p.id === "growth") ?? TOP_UP_OPTIONS[2];
  const builderPack = TOP_UP_OPTIONS.find(p => p.id === "builder") ?? TOP_UP_OPTIONS[1];

  if (snapshot.topUpBalance > 0) {
    purchases.push({
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pack: growthPack.label,
      credits: growthPack.credits,
      amount: growthPack.price,
    });
  }

  if (snapshot.plan === "pro" && snapshot.monthlyUsed > snapshot.monthlyLimit * 0.6) {
    purchases.push({
      date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pack: builderPack.label,
      credits: builderPack.credits,
      amount: builderPack.price,
    });
  }

  return purchases;
}

function computeBilling(snapshot: CreditSnapshot, topUpPurchases: TopUpPurchaseRow[]) {
  const planSpend = snapshot.plan === "pro" ? 25 : 0;
  const topUpSpend = topUpPurchases.reduce((n, row) => n + row.amount, 0);
  return {
    planSpend,
    topUpSpend,
    totalSpent: planSpend + topUpSpend,
  };
}

function AccountUsageTab({ snapshot }: { snapshot: CreditSnapshot }) {
  const { openUpgrade } = useCredits();
  const [period, setPeriod] = useState<UsagePeriod>("30d");
  const [userFilter, setUserFilter] = useState("all");

  const range = useMemo(() => getPeriodRange(period), [period]);
  const rangeLabel = useMemo(() => formatRangeLabel(range.start, range.end), [range]);
  const scale = useMemo(() => periodScale(period), [period]);

  const topUpPurchases = useMemo(() => buildTopUpPurchases(snapshot), [snapshot]);
  const billing = useMemo(() => computeBilling(snapshot, topUpPurchases), [snapshot, topUpPurchases]);

  const baseCredits = Math.round(snapshot.monthlyUsed * scale);
  const baseRuns = useMemo(() => {
    const allRows = buildUsageRows(snapshot, scale, "all");
    return allRows.reduce((n, row) => n + row.runs, 0);
  }, [snapshot, scale]);

  const dailyActivity = useMemo(
    () => buildDailyActivity(baseCredits, baseRuns, range.start, range.end, userFilter),
    [baseCredits, baseRuns, userFilter, range],
  );

  const totalCredits = dailyActivity.reduce((n, row) => n + row.credits, 0);
  const totalRuns = dailyActivity.reduce((n, row) => n + row.runs, 0);
  const cap = snapshot.monthlyLimit + snapshot.topUpBalance;
  const remaining = totalRemaining(snapshot);
  const creditsFromPlan = Math.min(snapshot.monthlyUsed, snapshot.monthlyLimit);
  const creditsFromTopUps = Math.max(0, snapshot.monthlyUsed - snapshot.monthlyLimit);
  const includedPct = cap > 0 ? Math.min(100, (snapshot.monthlyUsed / snapshot.monthlyLimit) * 100) : 0;
  const periodSpend = billing.totalSpent * scale;

  const limitNote = snapshot.plan === "free" && snapshot.topUpBalance <= 0
    ? `${remaining.toLocaleString()} of ${snapshot.monthlyLimit.toLocaleString()} trial credits remaining`
    : `${remaining.toLocaleString()} of ${cap.toLocaleString()} remaining · resets ${snapshot.monthlyResetLabel}`;

  const userOptions = useMemo(
    () => [{ email: "all", label: "All users" }, ...TEAM_USAGE_WEIGHTS.map(row => ({ email: row.email, label: row.email }))],
    [],
  );

  const dailySectionTitle = userFilter === "all"
    ? "Daily activity"
    : `Daily activity · ${userFilter}`;

  return (
    <div className="acct-usage">
      <div className="acct-usage-plan-cards">
        <div className="acct-usage-plan-card">
          <span className="acct-usage-plan-card-label">Your included usage</span>
          <strong className="acct-usage-plan-card-value">
            {formatCompact(snapshot.monthlyUsed)} / {formatCompact(snapshot.monthlyLimit)} credits
          </strong>
          <div className="acct-usage-plan-progress" aria-hidden="true">
            <div className="acct-usage-plan-progress-fill" style={{ width: `${includedPct}%` }} />
          </div>
          <span className="acct-usage-plan-card-meta">Resets {snapshot.monthlyResetLabel}</span>
        </div>
        <div className="acct-usage-plan-card">
          <span className="acct-usage-plan-card-label">On-demand usage</span>
          <strong className="acct-usage-plan-card-value">
            {snapshot.topUpBalance > 0 ? "On" : "Off"}
          </strong>
          <p className="acct-usage-plan-card-copy">
            Pay for extra usage beyond your plan limits.
          </p>
          <span className="acct-usage-plan-card-meta">
            {snapshot.topUpBalance > 0
              ? `${snapshot.topUpBalance.toLocaleString()} top-up credits available`
              : "No active top-up balance"}
          </span>
        </div>
      </div>

      <div className="acct-usage-topup-footer">
        <div className="acct-usage-topup-balance">
          <span className="acct-usage-topup-balance-label">Top-up balance</span>
          <strong>{snapshot.topUpBalance.toLocaleString()} credits</strong>
          {creditsFromTopUps > 0 ? (
            <span className="acct-usage-topup-balance-meta">
              {creditsFromTopUps.toLocaleString()} used from top-ups this month
            </span>
          ) : (
            <span className="acct-usage-topup-balance-meta">
              {creditsFromPlan.toLocaleString()} from plan allowance so far
            </span>
          )}
        </div>
        <button type="button" className="acct-usage-topup-cta" onClick={() => openUpgrade("topup")}>
          Top up credits <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="acct-usage-filters">
        <div className="acct-usage-filters-left">
          <button type="button" className="acct-usage-range-btn" aria-label={`Date range ${rangeLabel}`}>
            {rangeLabel}
            <span aria-hidden="true">▾</span>
          </button>
          <span className="acct-usage-filter-info" title="Usage is filtered to the selected date range">ⓘ</span>
          <div className="acct-usage-period-pills" role="tablist" aria-label="Usage period">
            {USAGE_PERIOD_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={period === option.id}
                className={`acct-usage-period-pill${period === option.id ? " is-active" : ""}`}
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="acct-usage-user-filter">
          <span className="acct-usage-user-filter-label">User</span>
          <select
            value={userFilter}
            onChange={event => setUserFilter(event.target.value)}
            aria-label="Filter usage by user"
          >
            {userOptions.map(option => (
              <option key={option.email} value={option.email}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="acct-usage-summary-card">
        <div className="acct-usage-summary">
          <div className="acct-usage-stat">
            <span className="acct-usage-stat-label">Total this period</span>
            <strong className="acct-usage-stat-value">{formatCompact(totalCredits)} credits</strong>
            <span className="acct-usage-stat-meta">{limitNote}</span>
          </div>
          <div className="acct-usage-stat">
            <span className="acct-usage-stat-label">Agent runs</span>
            <strong className="acct-usage-stat-value">{totalRuns}</strong>
            <span className="acct-usage-stat-meta">
              {rangeLabel}
              {userFilter !== "all" ? ` · ${userFilter}` : ""}
            </span>
          </div>
          <div className="acct-usage-stat">
            <span className="acct-usage-stat-label">Amount spent</span>
            <strong className="acct-usage-stat-value">{formatCurrency(periodSpend)}</strong>
            <span className="acct-usage-stat-meta">
              {billing.planSpend > 0 ? `${formatCurrency(billing.planSpend * scale)} plan` : "Free plan"}
              {billing.topUpSpend > 0 ? ` · ${formatCurrency(billing.topUpSpend * scale)} top-ups` : ""}
            </span>
          </div>
        </div>
      </div>

      <section className="acct-usage-section">
        <div className="acct-usage-section-head">
          <span className="acct-usage-eyebrow">Activity</span>
          <h3 className="acct-usage-section-title">{dailySectionTitle}</h3>
          <p className="acct-usage-section-sub">
            {userFilter === "all"
              ? "Team-wide credits and runs per day for the selected period."
              : "Credits and runs per day for this teammate in the selected period."}
          </p>
        </div>
        <div className="acct-usage-list">
          <div className="acct-usage-row acct-usage-row-head acct-usage-row-daily">
            <span>Date</span>
            <span>User</span>
            <span>Credits</span>
            <span>Runs</span>
            <span>Share</span>
          </div>
          {dailyActivity.map(row => {
            const share = totalCredits > 0 ? (row.credits / totalCredits) * 100 : 0;
            return (
              <div className="acct-usage-row acct-usage-row-daily" key={`${row.dateKey}-${row.email}`}>
                <strong>{row.date}</strong>
                <span className="acct-usage-user-email">{row.email}</span>
                <span className="acct-usage-num">{formatCompact(row.credits)}</span>
                <span className="acct-usage-num">{row.runs}</span>
                <span className="acct-usage-share-cell">
                  <em className="acct-usage-share-pct">{share.toFixed(1)}%</em>
                  <div className="acct-usage-share-track" aria-hidden="true">
                    <div className="acct-usage-share-fill" style={{ width: `${share}%` }} />
                  </div>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <p className="acct-usage-footnote">Usage · {rangeLabel}</p>
    </div>
  );
}

function AccountSettingsPlaceholder({ tab }: { tab: AccountSettingsTab }) {
  const label = ACCOUNT_SETTINGS_TABS.find(t => t.id === tab)?.label ?? "Section";
  return (
    <div className="acct-settings-placeholder">
      <h2 className="acct-settings-placeholder-title">{label}</h2>
      <p className="acct-settings-placeholder-copy">This section is coming soon.</p>
    </div>
  );
}

export function AccountSettings({
  tab,
  onTabChange,
}: {
  tab: AccountSettingsTab;
  onTabChange: (tab: AccountSettingsTab) => void;
}) {
  const { snapshot } = useCredits();

  return (
    <div className="account-settings">
      <header className="account-settings-hero">
        <div className="account-settings-hero-main">
          <h1 className="account-settings-title">My Account</h1>
          <p className="account-settings-sub">Account settings · members, teams, plan, and billing</p>
        </div>
        <div className="account-settings-badges">
          {snapshot.plan === "free" ? <span className="account-settings-badge trial">Trial</span> : null}
          <span className="account-settings-badge">fuel-teams</span>
          <span className="account-settings-badge">admin</span>
        </div>
      </header>

      <nav className="account-settings-tabs" aria-label="Account settings">
        {ACCOUNT_SETTINGS_TABS.map(item => (
          <button
            key={item.id}
            type="button"
            className={`account-settings-tab${tab === item.id ? " is-active" : ""}`}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="account-settings-body">
        {tab === "usage" ? (
          <AccountUsageTab snapshot={snapshot} />
        ) : (
          <AccountSettingsPlaceholder tab={tab} />
        )}
      </div>
    </div>
  );
}
