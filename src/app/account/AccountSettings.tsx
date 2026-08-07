import React, { useMemo, useState } from "react";
import { useCredits } from "../credits/CreditProvider";
import { totalRemaining } from "../credits/creditLogic";
import { ACTION_LABELS, CREDIT_COSTS, TOP_UP_OPTIONS } from "../credits/constants";
import type { CreditActionType, CreditSnapshot } from "../credits/types";
import {
  ACCOUNT_SETTINGS_TABS,
  type AccountSettingsTab,
} from "./AccountSettingsNav";
import { AccountIntegrationsList } from "./AccountIntegrationsList";
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

type ActionUsageRow = {
  action: CreditActionType;
  label: string;
  unitCost: number;
  credits: number;
  count: number;
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

/** Demo mix of where credits land in a typical workspace period. */
const USAGE_ACTION_MIX: { action: CreditActionType; share: number }[] = [
  { action: "aiChat", share: 0.34 },
  { action: "generateSource", share: 0.24 },
  { action: "docUpload", share: 0.2 },
  { action: "playbookRun", share: 0.14 },
  { action: "crunchbaseEnrichment", share: 0.08 },
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

function buildActionBreakdown(totalCredits: number): ActionUsageRow[] {
  if (totalCredits <= 0) {
    return USAGE_ACTION_MIX.map(entry => ({
      action: entry.action,
      label: ACTION_LABELS[entry.action],
      unitCost: CREDIT_COSTS[entry.action],
      credits: 0,
      count: 0,
    }));
  }

  let allocated = 0;
  return USAGE_ACTION_MIX.map((entry, index) => {
    const unitCost = CREDIT_COSTS[entry.action];
    const remaining = Math.max(0, totalCredits - allocated);
    const raw = index === USAGE_ACTION_MIX.length - 1
      ? remaining
      : Math.min(remaining, Math.round(totalCredits * entry.share));
    const credits = Math.max(0, raw);
    allocated += credits;
    const count = unitCost > 0 ? Math.max(credits > 0 ? 1 : 0, Math.round(credits / unitCost)) : 0;
    return {
      action: entry.action,
      label: ACTION_LABELS[entry.action],
      unitCost,
      credits,
      count,
    };
  });
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

  const usageRows = useMemo(
    () => buildUsageRows(snapshot, scale, userFilter),
    [snapshot, scale, userFilter],
  );
  const totalCredits = usageRows.reduce((n, row) => n + row.credits, 0);
  const totalRuns = usageRows.reduce((n, row) => n + row.runs, 0);
  const actionBreakdown = useMemo(() => buildActionBreakdown(totalCredits), [totalCredits]);

  const cap = snapshot.monthlyLimit + snapshot.topUpBalance;
  const remaining = totalRemaining(snapshot);
  const creditsFromPlan = Math.min(snapshot.monthlyUsed, snapshot.monthlyLimit);
  const creditsFromTopUps = Math.max(0, snapshot.monthlyUsed - snapshot.monthlyLimit);
  const includedPct = snapshot.monthlyLimit > 0
    ? Math.min(100, (snapshot.monthlyUsed / snapshot.monthlyLimit) * 100)
    : 0;
  const periodSpend = billing.totalSpent * scale;

  const limitNote = snapshot.plan === "free" && snapshot.topUpBalance <= 0
    ? `${remaining.toLocaleString()} of ${snapshot.monthlyLimit.toLocaleString()} trial credits remaining`
    : `${remaining.toLocaleString()} of ${cap.toLocaleString()} remaining · resets ${snapshot.monthlyResetLabel}`;

  const userOptions = useMemo(
    () => [{ email: "all", label: "All users" }, ...TEAM_USAGE_WEIGHTS.map(row => ({ email: row.email, label: row.email }))],
    [],
  );

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
          <span className="acct-usage-eyebrow">By action</span>
          <h3 className="acct-usage-section-title">Credit usage</h3>
          <p className="acct-usage-section-sub">
            Credits used per action type this period.
          </p>
        </div>
        <div className="acct-usage-list">
          <div className="acct-usage-row acct-usage-row-head acct-usage-row-actions">
            <span>Action</span>
            <span>Cost</span>
            <span>Times used</span>
            <span>Credits used</span>
          </div>
          {actionBreakdown.map(row => (
            <div className="acct-usage-row acct-usage-row-actions" key={row.action}>
              <strong>{row.label}</strong>
              <span className="acct-usage-num">{row.unitCost}</span>
              <span className="acct-usage-num">{row.count}</span>
              <span className="acct-usage-num">{formatCompact(row.credits)}</span>
            </div>
          ))}
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
      <p className="acct-settings-placeholder-copy">This section is not available yet. Check back soon.</p>
    </div>
  );
}

const PROFILE_USER = {
  name: "Shreya Gokani",
  email: "shreya.g@york.ie",
  role: "member",
  organization: "—",
  userId: "317ba520-4071-70b8-5a86-433196fa4817",
  initials: "SG",
  portfolios: [{ name: "Shreya Gokani", count: 1 }],
  watchlists: [] as { name: string; count: number }[],
};

function AccountProfileTab({
  onOpenUsage,
  onLogout,
}: {
  onOpenUsage: () => void;
  onLogout?: () => void;
}) {
  const tokensUsed = 91700;
  const agentRuns = 56;
  const portfolioCount = PROFILE_USER.portfolios.length;
  const watchlistCount = PROFILE_USER.watchlists.length;

  return (
    <div className="acct-profile">
      <section className="overview-panel acct-profile-identity">
        <div className="acct-profile-identity-main">
          <div className="acct-profile-avatar" aria-hidden="true">{PROFILE_USER.initials}</div>
          <div className="acct-profile-identity-copy">
            <div className="acct-profile-name-row">
              <h2 className="acct-profile-name">{PROFILE_USER.name}</h2>
              <span className="acct-profile-role-badge">{PROFILE_USER.role}</span>
            </div>
            <p className="acct-profile-email">{PROFILE_USER.email}</p>
          </div>
        </div>
        <button type="button" className="acct-profile-signout" onClick={onLogout}>
          Sign out
        </button>
      </section>

      <div className="acct-profile-grid">
        <div className="acct-profile-col">
          <section className="overview-panel acct-profile-card">
            <h3 className="acct-profile-card-title">Account</h3>
            <dl className="acct-profile-fields">
              <div className="acct-profile-field">
                <dt>Email</dt>
                <dd>{PROFILE_USER.email}</dd>
              </div>
              <div className="acct-profile-field">
                <dt>Display Name</dt>
                <dd>{PROFILE_USER.name}</dd>
              </div>
              <div className="acct-profile-field">
                <dt>Role</dt>
                <dd>{PROFILE_USER.role}</dd>
              </div>
              <div className="acct-profile-field">
                <dt>Organization</dt>
                <dd>{PROFILE_USER.organization}</dd>
              </div>
              <div className="acct-profile-field">
                <dt>User ID</dt>
                <dd className="acct-profile-mono">{PROFILE_USER.userId}</dd>
              </div>
            </dl>
          </section>

          <section className="overview-panel acct-profile-card">
            <div className="acct-profile-card-head">
              <h3 className="acct-profile-card-title">Notification preferences</h3>
              <span className="acct-profile-soon">Soon</span>
            </div>
            <p className="acct-profile-card-copy">
              Digest settings for each portfolio and watchlist live on those lists today. Account-wide preferences
              (default cadence, delivery day, and summary depth) will appear here next.
            </p>
          </section>

          <section className="overview-panel acct-profile-card">
            <div className="acct-profile-card-head">
              <h3 className="acct-profile-card-title">Your AI usage</h3>
              <span className="acct-profile-card-meta">this month</span>
            </div>
            <div className="acct-profile-usage-metrics">
              <div className="acct-profile-usage-metric">
                <span className="acct-profile-usage-label">Tokens</span>
                <strong className="acct-profile-usage-value">{formatCompact(tokensUsed)}</strong>
              </div>
              <div className="acct-profile-usage-metric">
                <span className="acct-profile-usage-label">Agent Runs</span>
                <strong className="acct-profile-usage-value">{agentRuns}</strong>
              </div>
            </div>
            <button type="button" className="acct-profile-link" onClick={onOpenUsage}>
              See account-wide usage <span aria-hidden="true">→</span>
            </button>
          </section>
        </div>

        <div className="acct-profile-col">
          <section className="overview-panel acct-profile-card">
            <div className="acct-profile-card-head">
              <h3 className="acct-profile-card-title">Your portfolios</h3>
              <span className="acct-profile-card-meta">{portfolioCount}</span>
            </div>
            {portfolioCount > 0 ? (
              <ul className="acct-profile-list">
                {PROFILE_USER.portfolios.map(item => (
                  <li key={item.name} className="acct-profile-list-row">
                    <span>{item.name}</span>
                    <span className="acct-profile-card-meta">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="acct-profile-card-copy">No portfolios yet.</p>
            )}
          </section>

          <section className="overview-panel acct-profile-card">
            <div className="acct-profile-card-head">
              <h3 className="acct-profile-card-title">Your watchlists</h3>
              <span className="acct-profile-card-meta">{watchlistCount}</span>
            </div>
            {watchlistCount > 0 ? (
              <ul className="acct-profile-list">
                {PROFILE_USER.watchlists.map(item => (
                  <li key={item.name} className="acct-profile-list-row">
                    <span>{item.name}</span>
                    <span className="acct-profile-card-meta">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="acct-profile-card-copy">
                No watchlists yet.{" "}
                <button type="button" className="acct-profile-inline-link">
                  Create one.
                </button>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function AccountSettings({
  tab,
  onTabChange,
  onLogout,
}: {
  tab: AccountSettingsTab;
  onTabChange: (tab: AccountSettingsTab) => void;
  onLogout?: () => void;
}) {
  const { snapshot } = useCredits();
  const isProfile = tab === "profile";
  const isIntegrations = tab === "integrations";

  return (
    <div className="account-settings">
      <header className="account-settings-hero">
        <div className="account-settings-hero-main">
          <h1 className="account-settings-title">
            {isProfile ? "Profile" : isIntegrations ? "Connectors" : "My Account"}
          </h1>
          <p className="account-settings-sub">
            {isProfile
              ? "Manage your account details, preferences, and the lists you own."
              : isIntegrations
                ? "Connect HubSpot or Granola so Fuel can use CRM and meeting context in your workspace."
                : "Manage members, teams, plan, and billing."}
          </p>
        </div>
        {!isProfile && !isIntegrations ? (
          <div className="account-settings-badges">
            {snapshot.plan === "free" ? <span className="account-settings-badge trial">Trial</span> : null}
            <span className="account-settings-badge">fuel-teams</span>
            <span className="account-settings-badge">admin</span>
          </div>
        ) : null}
      </header>

      <nav className="account-settings-tabs" aria-label="Account settings">
        {ACCOUNT_SETTINGS_TABS.filter(item => !item.hidden).map(item => (
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
        {tab === "profile" ? (
          <AccountProfileTab onOpenUsage={() => onTabChange("usage")} onLogout={onLogout} />
        ) : tab === "usage" ? (
          <AccountUsageTab snapshot={snapshot} />
        ) : tab === "integrations" ? (
          <AccountIntegrationsList
            heading="Connectors"
            intro="Connect HubSpot or Granola now, or leave these for later. Fuel still works with what you enter manually."
          />
        ) : (
          <AccountSettingsPlaceholder tab={tab} />
        )}
      </div>
    </div>
  );
}
