import React, { useMemo, useState } from "react";
import { useCredits } from "../credits/CreditProvider";
import { totalRemaining } from "../credits/creditLogic";
import type { CreditSnapshot } from "../credits/types";

const ORG = {
  name: "York IE",
  type: "ORGANIZATION",
  creator: "shreya.g@york.ie",
  created: "Jul 12, 2026",
  primaryCompany: "Volura",
  primaryUrl: "volura.com",
  stripeCustomer: "cus_TqR8mK2nP9xL4w",
};

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}

/* ── Overview ── */
export function AccountOverviewTab() {
  return (
    <div className="acct-overview">
      <section className="acct-overview-section">
        <h2 className="acct-section-label">Fuel data · public snapshot</h2>
        <div className="acct-overview-public-grid">
          {[
            { label: "Total system data", value: "2.1 TB", meta: "Neptune + OpenSearch" },
            { label: "Companies analyzed", value: "4.4M", meta: "Crunchbase + derived" },
            { label: "Data points / day", value: "2.5M", meta: "New + updated" },
          ].map(card => (
            <article key={card.label} className="overview-metric-card acct-overview-stat-card">
              <span className="acct-overview-stat-label">{card.label}</span>
              <strong className="acct-overview-stat-value">{card.value}</strong>
              <span className="acct-overview-stat-meta">{card.meta}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="acct-overview-section">
        <h2 className="acct-section-label">Fuel · private operating data</h2>
        <div className="acct-overview-private-grid">
          {[
            { label: "Context items", value: "241", meta: "108 in last 7d" },
            { label: "Signal observations", value: "2.1K", meta: "1.0K active" },
            { label: "Portfolio companies", value: "55", meta: "13 in pipeline" },
            { label: "Agent runs", value: "1.2K", meta: "15.8M tokens" },
          ].map(card => (
            <article key={card.label} className="overview-metric-card acct-overview-stat-card is-compact">
              <span className="acct-overview-stat-label">{card.label}</span>
              <strong className="acct-overview-stat-value">{card.value}</strong>
              <span className="acct-overview-stat-meta">{card.meta}</span>
            </article>
          ))}
        </div>

        <div className="acct-overview-lists">
          <article className="overview-panel acct-panel">
            <h3 className="acct-panel-title">Context by source</h3>
            <ul className="acct-kv-list">
              {[
                { label: "HubSpot", value: "118" },
                { label: "Granola", value: "13" },
                { label: "Slack", value: "0" },
              ].map(row => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
          </article>
          <article className="overview-panel acct-panel">
            <h3 className="acct-panel-title">Catalogs</h3>
            <ul className="acct-kv-list">
              {[
                { label: "Signals in catalog", value: "128" },
                { label: "Benchmark cohorts", value: "39" },
                { label: "Playbooks", value: "50" },
                { label: "Advisors (active)", value: "9" },
              ].map(row => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}

/* ── Users ── */
type MemberRole = "Owner" | "Admin" | "Member";
type Invite = { id: string; email: string; role: MemberRole; invitedBy: string; sent: string; expires: string };
type Member = { id: string; email: string; role: MemberRole; joined: string; isYou?: boolean };

const SEED_INVITES: Invite[] = [
  {
    id: "inv-1",
    email: "harmish.s@york.ie",
    role: "Member",
    invitedBy: "shreya.g@york.ie",
    sent: "Sep 20, 2026",
    expires: "Oct 4, 2026",
  },
];

const SEED_MEMBERS: Member[] = [
  { id: "m-1", email: "soumya.m@york.ie", role: "Member", joined: "Aug 2026" },
  { id: "m-2", email: "shreya.g@york.ie", role: "Owner", joined: "Jul 2026", isYou: true },
];

export function AccountUsersTab() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("Member");
  const [invites, setInvites] = useState<Invite[]>(() => [...SEED_INVITES]);
  const [members, setMembers] = useState<Member[]>(() => [...SEED_MEMBERS]);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function inviteTeammate() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (members.some(m => m.email === email) || invites.some(i => i.email === email)) {
      flash("That person is already on the account.");
      return;
    }
    setInvites(previous => [
      {
        id: `inv-${Date.now()}`,
        email,
        role: inviteRole,
        invitedBy: "shreya.g@york.ie",
        sent: "Just now",
        expires: "In 14 days",
      },
      ...previous,
    ]);
    setInviteEmail("");
    flash(`Invite sent to ${email}`);
  }

  return (
    <div className="acct-users">
      {toast ? <div className="acct-toast" role="status">{toast}</div> : null}

      <div className="acct-invite-bar" role="form" aria-label="Invite teammate">
        <input
          value={inviteEmail}
          onChange={event => setInviteEmail(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault();
              inviteTeammate();
            }
          }}
          placeholder="teammate@company.com"
          aria-label="Teammate email"
        />
        <label className="acct-invite-role">
          <span className="sr-only">Role</span>
          <select
            value={inviteRole}
            onChange={event => setInviteRole(event.target.value as MemberRole)}
            aria-label="Invite role"
          >
            <option value="Member">Member</option>
            <option value="Admin">Admin</option>
          </select>
        </label>
        <button
          type="button"
          className="acct-btn is-primary"
          onClick={inviteTeammate}
          disabled={!inviteEmail.trim()}
        >
          Invite
        </button>
      </div>

      <section className="acct-users-block">
        <h2 className="acct-section-label">Pending invites · {invites.length}</h2>
        {invites.length === 0 ? (
          <p className="acct-empty-copy">No pending invites.</p>
        ) : (
          <div className="acct-table-wrap">
            <table className="acct-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Sent</th>
                  <th>Expires</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {invites.map(invite => (
                  <tr key={invite.id}>
                    <td data-label="Email">
                      <strong>{invite.email}</strong>
                      <span className="acct-table-sub">invited by {invite.invitedBy}</span>
                    </td>
                    <td data-label="Role">
                      <span className="acct-pill">{invite.role.toLowerCase()}</span>
                    </td>
                    <td data-label="Sent">{invite.sent}</td>
                    <td data-label="Expires">{invite.expires}</td>
                    <td className="acct-table-actions">
                      <button
                        type="button"
                        className="acct-btn is-ghost"
                        onClick={() => flash(`Resent invite to ${invite.email}`)}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        className="acct-btn is-ghost"
                        onClick={() => {
                          setInvites(previous => previous.filter(row => row.id !== invite.id));
                          flash("Invite revoked");
                        }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="acct-users-block">
        <h2 className="acct-section-label">Members · {members.length}</h2>
        <div className="acct-table-wrap">
          <table className="acct-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td data-label="Member">
                    <strong>{member.isYou ? "You" : member.email}</strong>
                    {member.isYou ? (
                      <span className="acct-table-sub">{member.email}</span>
                    ) : null}
                  </td>
                  <td data-label="Role">
                    {member.role === "Owner" ? (
                      <span className="acct-pill is-accent">owner</span>
                    ) : (
                      <select
                        className="acct-inline-select"
                        value={member.role}
                        aria-label={`Role for ${member.email}`}
                        onChange={event => {
                          const role = event.target.value as MemberRole;
                          setMembers(previous =>
                            previous.map(row => (row.id === member.id ? { ...row, role } : row)),
                          );
                        }}
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td data-label="Joined">{member.joined}</td>
                  <td className="acct-table-actions">
                    {!member.isYou && member.role !== "Owner" ? (
                      <button
                        type="button"
                        className="acct-icon-btn"
                        aria-label={`Remove ${member.email}`}
                        onClick={() => {
                          setMembers(previous => previous.filter(row => row.id !== member.id));
                          flash("Member removed");
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ── Teams ── */
type Team = {
  id: string;
  name: string;
  description: string;
  members: string[];
  youOn: boolean;
};

const SEED_TEAMS: Team[] = [
  {
    id: "t-1",
    name: "Engineer",
    description: "",
    members: ["soumya.m@york.ie"],
    youOn: false,
  },
];

export function AccountTeamsTab() {
  const [filter, setFilter] = useState<"all" | "mine" | "other">("all");
  const [teams, setTeams] = useState<Team[]>(() => [...SEED_TEAMS]);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");

  const filtered = useMemo(() => {
    if (filter === "mine") return teams.filter(team => team.youOn);
    if (filter === "other") return teams.filter(team => !team.youOn);
    return teams;
  }, [filter, teams]);

  const counts = useMemo(
    () => ({
      all: teams.length,
      mine: teams.filter(team => team.youOn).length,
      other: teams.filter(team => !team.youOn).length,
    }),
    [teams],
  );

  function createTeam() {
    const name = draftName.trim();
    if (!name) return;
    setTeams(previous => [
      {
        id: `t-${Date.now()}`,
        name,
        description: "",
        members: ["shreya.g@york.ie"],
        youOn: true,
      },
      ...previous,
    ]);
    setDraftName("");
    setCreating(false);
    setFilter("all");
  }

  return (
    <div className="acct-teams">
      <div className="acct-teams-toolbar">
        <div className="acct-teams-filters" role="tablist" aria-label="Team filters">
          {(
            [
              { id: "all", label: `All teams ${counts.all}` },
              { id: "mine", label: `I'm on ${counts.mine}` },
              { id: "other", label: `Other teams ${counts.other}` },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={filter === tab.id ? "is-active" : undefined}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="acct-btn is-primary"
          onClick={() => setCreating(open => !open)}
        >
          {creating ? "Cancel" : "+ New team"}
        </button>
      </div>

      {creating ? (
        <div className="acct-create-row" role="form" aria-label="Create team">
          <input
            value={draftName}
            onChange={event => setDraftName(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                createTeam();
              }
            }}
            placeholder="Team name"
            aria-label="Team name"
            autoFocus
          />
          <button
            type="button"
            className="acct-btn is-primary"
            onClick={createTeam}
            disabled={!draftName.trim()}
          >
            Create
          </button>
        </div>
      ) : null}

      <div className="acct-table-wrap">
        <table className="acct-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Description</th>
              <th>Members</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <p className="acct-empty-copy">No teams in this filter.</p>
                </td>
              </tr>
            ) : (
              filtered.map(team => (
                <tr key={team.id}>
                  <td data-label="Team">
                    <strong>{team.name}</strong>
                  </td>
                  <td data-label="Description">{team.description || "—"}</td>
                  <td data-label="Members">
                    <div className="acct-member-pills">
                      {team.members.map(email => (
                        <span key={email} className="acct-pill is-accent">
                          {email}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="acct-table-actions" data-label="Actions">
                    <button type="button" className="acct-icon-btn" aria-label={`Edit ${team.name}`}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="acct-icon-btn"
                      aria-label={`Delete ${team.name}`}
                      onClick={() => setTeams(previous => previous.filter(row => row.id !== team.id))}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Settings ── */
export function AccountSettingsTabPanel() {
  const [portfolioManager, setPortfolioManager] = useState(false);

  return (
    <div className="acct-settings-grid">
      <article className="overview-panel acct-panel">
        <h3 className="acct-panel-title">Organization</h3>
        <dl className="acct-settings-fields">
          <div>
            <dt>Name</dt>
            <dd>{ORG.name}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{ORG.type}</dd>
          </div>
          <div>
            <dt>Creator</dt>
            <dd>{ORG.creator}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{ORG.created}</dd>
          </div>
        </dl>
      </article>

      <article className="overview-panel acct-panel">
        <h3 className="acct-panel-title">Features</h3>
        <dl className="acct-settings-fields">
          <div>
            <dt>Portfolio Manager</dt>
            <dd>
              <button
                type="button"
                className={`acct-toggle${portfolioManager ? " is-on" : ""}`}
                aria-pressed={portfolioManager}
                onClick={() => setPortfolioManager(on => !on)}
              >
                {portfolioManager ? "Enabled" : "Disabled"}
              </button>
            </dd>
          </div>
          <div>
            <dt>Primary Company</dt>
            <dd>
              <span className="acct-pill is-accent">
                {ORG.primaryCompany}
                <em>{ORG.primaryUrl}</em>
              </span>
            </dd>
          </div>
        </dl>
      </article>

      <article className="overview-panel acct-panel">
        <h3 className="acct-panel-title">Plan</h3>
        <dl className="acct-settings-fields">
          <div>
            <dt>Status</dt>
            <dd>
              <span className="acct-pill is-good">Active</span>
            </dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>
              <span className="acct-pill is-good">Pro</span>
            </dd>
          </div>
          <div>
            <dt>Stripe Customer</dt>
            <dd className="acct-mono">{ORG.stripeCustomer}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}

/* ── Integrations ── */
type IntegrationStatus = "connected" | "available" | "soon";

type Integration = {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  description: string;
  meta?: string;
};

const SEED_INTEGRATIONS: Integration[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    status: "connected",
    description: "Pull CRM notes, deals, and activity into Fuel context for portfolio companies.",
    meta: "installed by shreya.g@york.ie · Aug 14, 2026 · id 88421",
  },
  {
    id: "granola",
    name: "Granola",
    category: "meetings",
    status: "available",
    description: "Sync meeting notes and action items into company context automatically.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "chat",
    status: "available",
    description: "Bring channel discussions and mentions into Fuel as searchable context.",
  },
  {
    id: "email",
    name: "Email",
    category: "email",
    status: "soon",
    description: "Connect inbox threads for founder and investor correspondence.",
  },
];

export function AccountIntegrationsTab() {
  const [items, setItems] = useState<Integration[]>(() => [...SEED_INTEGRATIONS]);

  function setStatus(id: string, status: IntegrationStatus) {
    setItems(previous => previous.map(item => (item.id === id ? { ...item, status } : item)));
  }

  return (
    <div className="acct-integrations">
      {items.map(item => (
        <article key={item.id} className="overview-panel acct-integration-card">
          <div className="acct-integration-head">
            <div className="acct-integration-titles">
              <strong>{item.name}</strong>
              <span className="acct-pill">{item.category}</span>
              {item.status === "connected" ? (
                <span className="acct-pill is-good">connected</span>
              ) : null}
              {item.status === "soon" ? <span className="acct-pill">soon</span> : null}
            </div>
            <div className="acct-integration-actions">
              {item.status === "connected" ? (
                <>
                  <button type="button" className="acct-btn is-primary">Configure</button>
                  <button type="button" className="acct-btn is-ghost" onClick={() => setStatus(item.id, "connected")}>
                    Reconnect
                  </button>
                  <button type="button" className="acct-btn is-ghost" onClick={() => setStatus(item.id, "available")}>
                    Disconnect
                  </button>
                </>
              ) : null}
              {item.status === "available" ? (
                <button type="button" className="acct-btn is-primary" onClick={() => setStatus(item.id, "connected")}>
                  Connect
                </button>
              ) : null}
            </div>
          </div>
          <p>{item.description}</p>
          {item.meta ? <span className="acct-integration-meta">{item.meta}</span> : null}
        </article>
      ))}
    </div>
  );
}

/* ── Developer ── */
type ApiToken = { id: string; label: string; created: string; expires: string };

export function AccountDeveloperTab() {
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("90");
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);

  const claudeConfig = `{
  "mcpServers": {
    "fuel": {
      "url": "https://mcp.fuel.york.ie",
      "headers": {
        "Authorization": "Bearer <YOUR_TOKEN>"
      }
    }
  }
}`;

  function generateToken() {
    const name = label.trim() || "Untitled token";
    const token = `fuel_mcp_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    setTokens(previous => [
      {
        id: `tok-${Date.now()}`,
        label: name,
        created: "Just now",
        expires: `in ${expiry} days`,
      },
      ...previous,
    ]);
    setRevealed(token);
    setLabel("");
  }

  return (
    <div className="acct-developer">
      <article className="overview-panel acct-panel">
        <div className="acct-panel-head">
          <h3 className="acct-panel-title">MCP API tokens</h3>
          <span className="acct-panel-meta">shreya.g@york.ie</span>
        </div>
        <p className="acct-panel-copy">
          These tokens authenticate MCP clients like Claude to your Fuel account. Treat them like passwords.
        </p>
        <div className="acct-create-row">
          <input
            value={label}
            onChange={event => setLabel(event.target.value)}
            placeholder="Token label (e.g. Claude desktop)"
            aria-label="Token label"
          />
          <select
            value={expiry}
            onChange={event => setExpiry(event.target.value)}
            aria-label="Token expiration"
          >
            <option value="30">Expires in 30 days</option>
            <option value="90">Expires in 90 days</option>
            <option value="365">Expires in 1 year</option>
          </select>
          <button type="button" className="acct-btn is-primary" onClick={generateToken}>
            Generate token
          </button>
        </div>
        {revealed ? (
          <div className="acct-token-reveal" role="status">
            <strong>Copy this token now</strong>
            <code>{revealed}</code>
            <button
              type="button"
              className="acct-btn is-ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(revealed);
              }}
            >
              Copy
            </button>
          </div>
        ) : null}
        {tokens.length === 0 ? (
          <p className="acct-empty-copy">No tokens yet.</p>
        ) : (
          <ul className="acct-token-list">
            {tokens.map(token => (
              <li key={token.id}>
                <div>
                  <strong>{token.label}</strong>
                  <span>
                    Created {token.created} · Expires {token.expires}
                  </span>
                </div>
                <button
                  type="button"
                  className="acct-btn is-ghost"
                  onClick={() => setTokens(previous => previous.filter(row => row.id !== token.id))}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="overview-panel acct-panel">
        <h3 className="acct-panel-title">Connect from Claude</h3>
        <p className="acct-panel-copy">Add Fuel as a remote MCP server in your Claude client.</p>
        <pre className="acct-code-block">{claudeConfig}</pre>
      </article>

      <article className="overview-panel acct-panel">
        <div className="acct-panel-head">
          <h3 className="acct-panel-title">Agent skills</h3>
          <button type="button" className="acct-link-btn">
            View skills →
          </button>
        </div>
        <p className="acct-panel-copy">
          Primitive tools the Fuel agent uses — searching, reading context, scraping, and running playbooks.
          Input schemas, side effects, and credit costs are listed for developers.
        </p>
      </article>
    </div>
  );
}

/* ── Billing ── */
export function AccountBillingTab({ snapshot }: { snapshot: CreditSnapshot }) {
  const { openUpgrade } = useCredits();
  const remaining = totalRemaining(snapshot);
  const planLabel = snapshot.plan === "pro" ? "Pro · Annual" : "Free · Trial";

  return (
    <div className="acct-billing">
      <div className="acct-billing-top">
        <article className="overview-panel acct-panel acct-billing-plan">
          <div className="acct-panel-head">
            <h3 className="acct-panel-title">Current plan</h3>
            <span className="acct-pill is-good">{planLabel}</span>
          </div>
          <strong className="acct-billing-credits">{remaining.toLocaleString()} credits available</strong>
          <p className="acct-panel-copy">
            Billed annually. Cancel anytime — access continues through the end of the current period.
          </p>
          <div className="acct-billing-actions">
            <button type="button" className="acct-btn is-accent" onClick={() => openUpgrade("pro")}>
              Manage payment method
            </button>
            <button type="button" className="acct-btn is-ghost">
              Cancel subscription
            </button>
            <button type="button" className="acct-btn is-ghost" onClick={() => openUpgrade("pro")}>
              Change plan
            </button>
          </div>
          <p className="acct-billing-foot">
            Need a custom contract or invoice? Email billing@york.ie.
          </p>
        </article>

        <article className="overview-panel acct-panel">
          <h3 className="acct-panel-title">Account</h3>
          <dl className="acct-settings-fields">
            <div>
              <dt>Status</dt>
              <dd>Active</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{snapshot.plan === "pro" ? "Pro" : "Free"}</dd>
            </div>
            <div>
              <dt>Stripe customer</dt>
              <dd className="acct-mono">{ORG.stripeCustomer}</dd>
            </div>
            <div>
              <dt>Daily usage</dt>
              <dd>0 / {snapshot.monthlyLimit.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Monthly usage</dt>
              <dd>
                {snapshot.monthlyUsed.toLocaleString()} / {snapshot.monthlyLimit.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Period ends</dt>
              <dd>{snapshot.monthlyResetLabel}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="overview-panel acct-panel">
        <h3 className="acct-panel-title">Invoice history</h3>
        <p className="acct-empty-copy">
          No invoices yet. Invoices will appear after the first successful payment.
        </p>
      </article>
    </div>
  );
}

export { formatCompact };
