"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { Theme } from "@/lib/theme";
import { Chip, Logo, SectionHead, Tabs } from "../atoms";
import { G } from "../icons";
import type { WatchlistListItem } from "@/lib/watchlists";
import {
  createWatchlistAction,
  deleteWatchlistAction,
  renameWatchlistAction,
  setFollowerAction,
  setScopeAction,
} from "@/app/(app)/portfolio/actions";
import { useToast } from "../toast/ToastProvider";
import {
  CompactActionButton,
  SurfaceField,
  TeamAccessPicker,
  type TeamAccessOption,
} from "./watchlist-access-ui";

type ScopeKey = "all" | "mine" | "shared" | "starred";
type ScopeValue = "private" | "account" | "team";

function syncScopeToUrl(scope: ScopeKey) {
  const url = new URL(window.location.href);
  if (scope === "all") {
    url.searchParams.delete("scope");
  } else {
    url.searchParams.set("scope", scope);
  }
  window.history.replaceState({}, "", url.toString());
}

function btn(t: Theme, primary = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: primary ? t.ink : "transparent",
    color: primary ? t.bg : t.inkSoft,
    border: `1px solid ${primary ? t.ink : t.rule}`,
    padding: primary ? "8px 14px" : "7px 12px",
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function th(t: Theme, align: "left" | "right" = "left"): CSSProperties {
  return {
    padding: "10px 12px",
    textAlign: align,
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    color: t.muted,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: `1px solid ${t.rule}`,
    whiteSpace: "nowrap",
  };
}

function td(t: Theme, align: "left" | "right" = "left"): CSSProperties {
  return {
    padding: "14px 12px",
    verticalAlign: "middle",
    textAlign: align,
    fontFamily: t.sans,
    fontSize: 13,
    color: t.ink,
    borderBottom: `1px solid ${t.ruleSoft}`,
  };
}

function editingRowStyle(t: Theme): CSSProperties {
  return {
    outline: `1px solid ${t.accent}55`,
    outlineOffset: -1,
    boxShadow: `inset 3px 0 0 ${t.accent}`,
  };
}

function CompanyStack({ t, items, max = 4 }: { t: Theme; items: WatchlistListItem["companyPreview"]; max?: number }) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {shown.map((c, i) => (
        <div
          key={c.uuid}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            outline: `2px solid ${t.panel}`,
            borderRadius: 6,
            zIndex: shown.length - i,
          }}
        >
          <Logo
            t={t}
            co={{ logo: (c.name ?? "??").slice(0, 2).toUpperCase(), name: c.name ?? undefined, uuid: c.uuid }}
            size={22}
          />
        </div>
      ))}
      {extra > 0 ? (
        <span
          style={{
            marginLeft: -6,
            padding: "2px 6px",
            fontFamily: t.mono,
            fontSize: 11,
            color: t.muted,
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
          }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function StarToggle({
  t,
  watchlistId,
  starred,
}: {
  t: Theme;
  watchlistId: string;
  starred: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => {
        start(() => setFollowerAction(fd));
      }}
      style={{ display: "inline-flex" }}
    >
      <input type="hidden" name="watchlistId" value={watchlistId} />
      <input type="hidden" name="starred" value={starred ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          color: starred ? t.warn : t.mutedSoft,
          lineHeight: 1,
          padding: 0,
        }}
        title={starred ? "Starred" : "Star"}
      >
        {starred ? "★" : "☆"}
      </button>
    </form>
  );
}

function scopeLabel(scope: ScopeValue): string {
  return scope === "private" ? "Private" : scope === "team" ? "Team" : "Workspace";
}

function scopeTone(scope: ScopeValue): "ghost" | "accent" | "default" {
  if (scope === "team") return "accent";
  if (scope === "account") return "default";
  return "ghost";
}

function accessDetail(
  w: WatchlistListItem,
  userEmail: string,
  teamNameById: Map<string, string>,
): string {
  if (w.ownerEmail === userEmail) return "You own this list";
  if (w.scope === "account") return "Visible to everyone in this account";
  if (w.scope === "team" && w.teamIds.length > 0) {
    const names = w.teamIds.map((id) => teamNameById.get(id) ?? "Team");
    const teamLabel = names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1}`;
    return `Through ${teamLabel}`;
  }
  return `Shared by ${w.ownerEmail}`;
}

function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const time = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const ms = Date.now() - time;
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function WatchlistsView({
  t,
  watchlists,
  userEmail,
  scope,
  kind,
  availableTeams = [],
}: {
  t: Theme;
  watchlists: WatchlistListItem[];
  userEmail: string;
  scope: ScopeKey;
  kind: "portfolio" | "watchlist";
  availableTeams?: TeamAccessOption[];
}) {
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [activeScope, setActiveScope] = useState<ScopeKey>(scope);
  const [createScope, setCreateScope] = useState<ScopeValue>(
    kind === "portfolio" ? "account" : "private",
  );
  const [createCohort, setCreateCohort] = useState("");
  const [createTeamIds, setCreateTeamIds] = useState<string[]>([]);
  const [createPending, startCreate] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editScope, setEditScope] = useState<ScopeValue>("private");
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editPending, startEdit] = useTransition();
  const [, startDelete] = useTransition();
  const { showToast } = useToast();

  useEffect(() => {
    setActiveScope(scope);
  }, [scope]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
  }, [searchParams]);

  const kindLabel = kind === "portfolio" ? "Portfolio" : "Watchlist";
  const kindPlural = kind === "portfolio" ? "Portfolios" : "Watchlists";
  const detailBasePath = kind === "portfolio" ? "/portfolio" : "/watchlists";

  function beginEdit(w: WatchlistListItem) {
    setEditingId(w.id);
    setEditName(w.name);
    setEditScope(w.scope);
    setEditTeamIds([...w.teamIds]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditScope("private");
    setEditTeamIds([]);
  }

  function onCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (createScope === "team" && createTeamIds.length === 0) {
      showToast({ message: "Select at least one team for team-scoped access.", variant: "error" });
      return;
    }
    if (kind === "portfolio" && !createCohort) {
      showToast({ message: "Select a stage (cohort) for this portfolio.", variant: "error" });
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    startCreate(async () => {
      const result = await createWatchlistAction(fd);
      if (result?.error) {
        showToast({ message: result.error, variant: "error" });
      }
    });
  }

  function onSaveEdit(watchlistId: string, originalName: string) {
    const name = editName.trim();
    if (!name) {
      showToast({ message: "Name is required.", variant: "error" });
      return;
    }
    if (editScope === "team" && editTeamIds.length === 0) {
      showToast({ message: "Select at least one team for team-scoped access.", variant: "error" });
      return;
    }
    startEdit(async () => {
      if (name !== originalName) {
        const renameFd = new FormData();
        renameFd.set("id", watchlistId);
        renameFd.set("name", name);
        const renameResult = await renameWatchlistAction(renameFd);
        if (renameResult?.error) {
          showToast({ message: renameResult.error, variant: "error" });
          return;
        }
      }
      const scopeFd = new FormData();
      scopeFd.set("id", watchlistId);
      scopeFd.set("scope", editScope);
      for (const id of editTeamIds) scopeFd.append("teamIds", id);
      const scopeResult = await setScopeAction(scopeFd);
      if (scopeResult?.error) {
        showToast({ message: scopeResult.error, variant: "error" });
        return;
      }
      cancelEdit();
    });
  }

  const teamNameById = useMemo(
    () => new Map(availableTeams.map((team) => [team.id, team.name])),
    [availableTeams],
  );

  const counts = watchlists.reduce(
    (acc, w) => {
      acc.all++;
      if (w.ownerEmail === userEmail) acc.mine++;
      else acc.shared++;
      if (w.follower?.starred) acc.starred++;
      return acc;
    },
    { all: 0, mine: 0, shared: 0, starred: 0 },
  );

  const filtered = watchlists.filter((w) => {
    if (activeScope === "mine" && w.ownerEmail !== userEmail) return false;
    if (activeScope === "shared" && w.ownerEmail === userEmail) return false;
    if (activeScope === "starred" && !w.follower?.starred) return false;
    if (search) {
      const q = search.toLowerCase();
      const teamHit = w.teamIds.some((id) => (teamNameById.get(id) ?? "").toLowerCase().includes(q));
      if (
        !w.name.toLowerCase().includes(q) &&
        !w.ownerEmail.toLowerCase().includes(q) &&
        !teamHit &&
        !scopeLabel(w.scope).toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const showEmptyCta = watchlists.length === 0 || activeScope === "mine";
  const emptyMessage =
    watchlists.length === 0
      ? `No ${kindPlural.toLowerCase()} yet.`
      : activeScope === "mine"
        ? `You don't own any ${kindPlural.toLowerCase()} yet.`
        : activeScope === "shared"
          ? "Nothing shared with you yet."
          : "No lists match this filter.";

  return (
    <div>
      <SectionHead
        t={t}
        title={kindPlural}
        right={
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              if (editingId) cancelEdit();
            }}
            aria-expanded={showCreate}
            style={btn(t, true)}
          >
            {G.plus} {showCreate ? "Cancel" : `New ${kindLabel.toLowerCase()}`}
          </button>
        }
      />

      {showCreate ? (
        <form
          onSubmit={onCreateSubmit}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: 14,
            background: t.panel,
            border: `1px solid ${t.rule}`,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <input type="hidden" name="kind" value={kind} />
          <SurfaceField
            name="name"
            autoFocus
            placeholder={
              kind === "portfolio" ? "Portfolio name (e.g. Fund 2)" : "Watchlist name (e.g. Competitors)"
            }
            required
            disabled={createPending}
            style={{ flex: 1, minWidth: 200 }}
          />
          {kind === "portfolio" ? (
            <SurfaceField
              name="fundName"
              placeholder="Fund label (optional)"
              disabled={createPending}
              style={{ width: 160 }}
            />
          ) : null}
          {kind === "portfolio" ? (
            <SurfaceField
              as="select"
              name="cohort"
              value={createCohort}
              onChange={(e) => setCreateCohort(e.target.value)}
              required
              disabled={createPending}
              aria-label="Stage / cohort"
              style={{ cursor: "pointer", minWidth: 140 }}
            >
              <option value="">Stage (required)</option>
              <option value="Pre-seed">Pre-seed</option>
              <option value="Seed">Seed</option>
              <option value="Series A">Series A</option>
              <option value="Series B">Series B</option>
              <option value="Series C">Series C</option>
              <option value="Growth">Growth</option>
            </SurfaceField>
          ) : null}
          <SurfaceField
            as="select"
            name="scope"
            value={createScope}
            onChange={(e) => {
              const next = e.target.value as ScopeValue;
              if (next === "team" && availableTeams.length === 0) {
                showToast({
                  message: "Create a Team first before using Team visibility.",
                  variant: "error",
                });
                setCreateScope("private");
                setCreateTeamIds([]);
                return;
              }
              setCreateScope(next);
              if (next !== "team") setCreateTeamIds([]);
            }}
            disabled={createPending}
            style={{ cursor: "pointer" }}
          >
            <option value="private">Private</option>
            <option value="account">Workspace</option>
            <option value="team">Team</option>
          </SurfaceField>
          {createScope === "team" && availableTeams.length > 0 ? (
            <TeamAccessPicker
              teams={availableTeams}
              value={createTeamIds}
              onChange={setCreateTeamIds}
              name="teamIds"
              disabled={createPending}
              variant="inline"
            />
          ) : null}
          <button
            type="submit"
            disabled={
              createPending || (kind === "portfolio" && !createCohort)
            }
            style={btn(t, true)}
          >
            {createPending ? "Creating…" : "Create"}
          </button>
        </form>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 14,
          minWidth: 0,
        }}
      >
        <Tabs
          t={t}
          active={activeScope}
          onChange={(k) => {
            const next = k as ScopeKey;
            setActiveScope(next);
            syncScopeToUrl(next);
          }}
          items={[
            { key: "all", label: "All", count: counts.all },
            { key: "mine", label: "Mine", count: counts.mine },
            { key: "shared", label: "Shared", count: counts.shared },
            { key: "starred", label: "Starred", count: counts.starred },
          ]}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: t.muted,
            padding: "6px 10px",
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            background: t.panel,
            minWidth: 0,
            flex: "1 1 160px",
            maxWidth: "100%",
          }}
        >
          {G.search}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, owner, or team"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: t.sans,
              fontSize: 13,
              color: t.ink,
              width: "100%",
              minWidth: 0,
              flex: 1,
            }}
          />
        </div>
      </div>

      <div className="fuel-table-wrap" style={{ background: t.panel, border: `1px solid ${t.rule}` }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th(t)}>Name</th>
              <th style={th(t)}>Access</th>
              <th style={th(t)}>Companies</th>
              <th style={th(t)}>Owner</th>
              <th style={th(t, "right")}>Updated</th>
              <th style={th(t, "right")}>★</th>
              <th style={th(t, "right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const detail = accessDetail(w, userEmail, teamNameById);
              const isOwner = w.ownerEmail === userEmail;
              const isEditing = editingId === w.id;

              if (isEditing) {
                return (
                  <tr key={w.id} style={editingRowStyle(t)}>
                    <td style={td(t)}>
                      <SurfaceField
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={editPending}
                        aria-label="Watchlist name"
                        style={{ width: "100%", minWidth: 140 }}
                      />
                    </td>
                    <td style={td(t)} colSpan={2}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <SurfaceField
                          as="select"
                          value={editScope}
                          onChange={(e) => {
                            const next = e.target.value as ScopeValue;
                            if (next === "team" && availableTeams.length === 0) {
                              showToast({
                                message: "Create a Team first before using Team visibility.",
                                variant: "error",
                              });
                              setEditScope("private");
                              setEditTeamIds([]);
                              return;
                            }
                            setEditScope(next);
                            if (next !== "team") setEditTeamIds([]);
                          }}
                          disabled={editPending}
                          aria-label="Visibility"
                          style={{ cursor: "pointer" }}
                        >
                          <option value="private">Private</option>
                          <option value="account">Workspace</option>
                          <option value="team">Team</option>
                        </SurfaceField>
                        {editScope === "team" && availableTeams.length > 0 ? (
                          <TeamAccessPicker
                            teams={availableTeams}
                            value={editTeamIds}
                            onChange={setEditTeamIds}
                            name=""
                            disabled={editPending}
                            variant="inline"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td style={td(t)}>
                      <div style={{ fontSize: 13 }}>You</div>
                    </td>
                    <td style={td(t, "right")}>
                      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                        {relativeTime(w.updatedAt)}
                      </span>
                    </td>
                    <td style={td(t, "right")}>
                      <StarToggle t={t} watchlistId={w.id} starred={w.follower?.starred === true} />
                    </td>
                    <td style={{ ...td(t, "right"), whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <CompactActionButton
                          tone="primary"
                          iconOnly
                          disabled={editPending}
                          ariaLabel="Save"
                          title="Save"
                          onClick={() => onSaveEdit(w.id, w.name)}
                        >
                          {G.check}
                        </CompactActionButton>
                        <CompactActionButton
                          iconOnly
                          disabled={editPending}
                          ariaLabel="Cancel"
                          title="Cancel"
                          onClick={cancelEdit}
                        >
                          {G.close}
                        </CompactActionButton>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={w.id}>
                  <td style={td(t)}>
                    <Link
                      href={`${detailBasePath}/${w.id}`}
                      style={{ color: t.ink, textDecoration: "none", fontWeight: 600 }}
                    >
                      {w.name}
                    </Link>
                    {w.kind === "portfolio" ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: t.accent,
                          fontWeight: 600,
                        }}
                      >
                        · portfolio{w.fundName ? ` · ${w.fundName}` : ""}
                      </span>
                    ) : null}
                  </td>
                  <td style={td(t)} title={detail}>
                    <Chip t={t} tone={scopeTone(w.scope)}>{scopeLabel(w.scope)}</Chip>
                  </td>
                  <td style={td(t)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CompanyStack t={t} items={w.companyPreview} />
                      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                        {w.companyCount}
                      </span>
                    </div>
                  </td>
                  <td style={td(t)}>
                    <div style={{ fontSize: 13 }}>
                      {isOwner ? "You" : w.ownerEmail.split("@")[0]}
                    </div>
                    {!isOwner ? (
                      <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
                        {w.ownerEmail}
                      </div>
                    ) : null}
                  </td>
                  <td style={td(t, "right")}>
                    <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                      {relativeTime(w.updatedAt)}
                    </span>
                  </td>
                  <td style={td(t, "right")}>
                    <StarToggle t={t} watchlistId={w.id} starred={w.follower?.starred === true} />
                  </td>
                  <td style={{ ...td(t, "right"), whiteSpace: "nowrap" }}>
                    {isOwner ? (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <CompactActionButton
                          iconOnly
                          ariaLabel="Edit"
                          title="Edit"
                          onClick={() => {
                            setShowCreate(false);
                            beginEdit(w);
                          }}
                        >
                          {G.edit}
                        </CompactActionButton>
                        <form
                          action={(fd) => startDelete(() => deleteWatchlistAction(fd))}
                          style={{ display: "inline" }}
                          onSubmit={(e) => {
                            if (!confirm(`Delete "${w.name}"?`)) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="id" value={w.id} />
                          <input type="hidden" name="returnTo" value={detailBasePath} />
                          <CompactActionButton
                            type="submit"
                            iconOnly
                            ariaLabel={`Delete ${w.name}`}
                            title="Delete"
                          >
                            {G.trash}
                          </CompactActionButton>
                        </form>
                      </div>
                    ) : (
                      <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              fontFamily: t.sans,
              fontSize: 13,
              color: t.muted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>{emptyMessage}</span>
            {showEmptyCta ? (
              <button type="button" onClick={() => setShowCreate(true)} style={btn(t, true)}>
                {G.plus} New {kindLabel.toLowerCase()}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
