"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import type { Theme } from "@/lib/theme";
import { ctaPrimaryStyle, ctaTertiaryStyle, framedPanelPadStyle } from "@/lib/theme";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import { Chip, Logo, SectionHead } from "../atoms";
import { G } from "../icons";
import {
  CreateIconButton,
  FilterGroup,
  FilterMenu,
  FilterSearch,
  FilterOption,
  PageToolbar,
} from "../ToolbarActions";
import type { WatchlistListItem } from "@/lib/watchlists";
import {
  createWatchlistAction,
  deleteWatchlistAction,
  renameWatchlistAction,
  setFollowerAction,
  setScopeAction,
} from "@/app/(app)/portfolio/actions";
import { AddScreenShell } from "@/components/drawer/AddScreenShell";
import { addScreenPrimaryBtnStyle } from "@/components/drawer/styles";
import { useToast } from "../toast/ToastProvider";
import {
  CompactActionButton,
  SurfaceField,
  TeamAccessPicker,
  type TeamAccessOption,
} from "./watchlist-access-ui";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdActionsStyle,
  dataTdStyle,
  dataThStyle,
} from "./adminStyles";

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
    ...(primary ? ctaPrimaryStyle(t) : ctaTertiaryStyle(t)),
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: primary ? "8px 14px" : "7px 12px",
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function editingRowStyle(t: Theme): CSSProperties {
  return {
    outline: `1px solid ${t.accent}55`,
    outlineOffset: -1,
    boxShadow: `inset 3px 0 0 ${t.accent}`,
  };
}

function formatFundName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const auto = trimmed.replace(/^AUTO:FUND:/i, "").replace(/:/g, " ").trim();
  if (!auto) return null;
  return auto
    .split(/\s+/)
    .map((part) =>
      part.length <= 3
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

function CompanyStack({
  t,
  items,
  extraCount = 0,
  max = 4,
  size = 22,
  overlap = true,
  listHref,
}: {
  t: Theme;
  items: WatchlistListItem["companyPreview"];
  extraCount?: number;
  max?: number;
  size?: number;
  overlap?: boolean;
  listHref?: string;
}) {
  const shown = items.slice(0, max);
  const extra = Math.max(0, extraCount, items.length - shown.length);
  const extraStyle: CSSProperties = {
    alignItems: "center",
    background: t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    boxSizing: "border-box",
    color: t.inkSoft,
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    height: size,
    justifyContent: "center",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    marginLeft: overlap ? -7 : 4,
    minWidth: size,
    outline: `2px solid ${t.panel}`,
    padding: "0 4px",
    position: "relative",
    textDecoration: "none",
    width: extra > 9 ? "auto" : size,
    zIndex: shown.length + 1,
  };
  const extraLabel = extra > 99 ? "99+" : `+${extra}`;
  const extraAria = `View ${extra} more ${extra === 1 ? "company" : "companies"}`;

  return (
    <div
      className="fuel-watchlist-company-stack"
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        gap: overlap ? 0 : 4,
      }}
    >
      {shown.map((c, i) => (
        <div
          key={c.uuid}
          title={c.name ?? c.uuid}
          style={{
            marginLeft: overlap && i > 0 ? -7 : 0,
            outline: `2px solid ${t.panel}`,
            borderRadius: 6,
            position: "relative",
            zIndex: i + 1,
            overflow: "hidden",
          }}
        >
          <Logo
            t={t}
            co={{ logo: (c.name ?? "??").slice(0, 2).toUpperCase(), name: c.name ?? undefined, uuid: c.uuid }}
            size={size}
          />
        </div>
      ))}
      {extra > 0 ? (
        listHref ? (
          <Link href={listHref} aria-label={extraAria} style={extraStyle}>
            {extraLabel}
          </Link>
        ) : (
          <span aria-hidden style={extraStyle}>
            {extraLabel}
          </span>
        )
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
          alignItems: "center",
          background: "transparent",
          border: "none",
          color: starred ? t.warn : t.mutedSoft,
          cursor: "pointer",
          display: "inline-flex",
          fontSize: 18,
          justifyContent: "center",
          lineHeight: 1,
          minHeight: TOUCH_TARGET_MIN,
          minWidth: TOUCH_TARGET_MIN,
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
  const phone = useNarrow(BREAKPOINTS.md);

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

  const filterActiveCount =
    (activeScope !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <div className="fuel-page">
      <SectionHead
        t={t}
        title={kindPlural}
        right={
          <PageToolbar
            t={t}
            filter={
              <FilterMenu
                t={t}
                activeCount={filterActiveCount}
                onClear={() => {
                  setActiveScope("all");
                  syncScopeToUrl("all");
                  setSearch("");
                }}
              >
                <FilterGroup t={t} title="Scope">
                    {(
                      [
                        { key: "all", label: "All", count: counts.all },
                        { key: "mine", label: "Mine", count: counts.mine },
                        { key: "shared", label: "Shared", count: counts.shared },
                        { key: "starred", label: "Starred", count: counts.starred },
                      ] as const
                    ).map((item) => (
                      <FilterOption
                        key={item.key}
                        t={t}
                        selected={activeScope === item.key}
                        onSelect={() => {
                          setActiveScope(item.key);
                          syncScopeToUrl(item.key);
                        }}
                        trailing={item.count}
                      >
                        {item.label}
                      </FilterOption>
                    ))}
                </FilterGroup>
                <FilterGroup t={t} title="Search">
                  <FilterSearch
                    t={t}
                    value={search}
                    onChange={setSearch}
                    placeholder="Name, owner, or team"
                    aria-label="Search watchlists"
                  />
                </FilterGroup>
              </FilterMenu>
            }
            create={
              <CreateIconButton
                t={t}
                label={`New ${kindLabel.toLowerCase()}`}
                active={phone ? false : showCreate}
                onClick={() => {
                  if (phone) {
                    setShowCreate(true);
                  } else {
                    setShowCreate((v) => !v);
                  }
                  if (editingId) cancelEdit();
                }}
              />
            }
          />
        }
      />

      {showCreate ? (
        phone ? (
          <AddScreenShell
            t={t}
            title={`New ${kindLabel.toLowerCase()}`}
            onClose={() => setShowCreate(false)}
            footer={
              <button
                type="submit"
                form="watchlist-create-form"
                disabled={createPending || (kind === "portfolio" && !createCohort)}
                style={addScreenPrimaryBtnStyle(t, {
                  cursor: createPending ? "wait" : "pointer",
                  opacity:
                    createPending || (kind === "portfolio" && !createCohort) ? 0.45 : 1,
                })}
              >
                {createPending ? "Creating…" : `Create ${kindLabel.toLowerCase()}`}
              </button>
            }
          >
            <form
              id="watchlist-create-form"
              onSubmit={onCreateSubmit}
              className="fuel-watchlist-create"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "stretch",
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
                style={{ width: "100%", fontSize: 16 }}
              />
              {kind === "portfolio" ? (
                <SurfaceField
                  name="fundName"
                  placeholder="Fund label (optional)"
                  disabled={createPending}
                  style={{ width: "100%", fontSize: 16 }}
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
                  style={{
                    cursor: "pointer",
                    width: "100%",
                    fontSize: 16,
                    minHeight: TOUCH_TARGET_MIN,
                  }}
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
                style={{
                  cursor: "pointer",
                  width: "100%",
                  fontSize: 16,
                  minHeight: TOUCH_TARGET_MIN,
                }}
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
            </form>
          </AddScreenShell>
        ) : (
        <form
          onSubmit={onCreateSubmit}
          className="fuel-watchlist-create"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: 14,
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 0,
            marginBottom: 14,
            flexWrap: "wrap",
            flexDirection: "row",
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
            style={{
              flex: 1,
              minWidth: 200,
            }}
          />
          {kind === "portfolio" ? (
            <SurfaceField
              name="fundName"
              placeholder="Fund label (optional)"
              disabled={createPending}
              style={{
                width: 160,
              }}
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
              style={{
                cursor: "pointer",
                minWidth: 140,
              }}
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
            style={{
              cursor: "pointer",
            }}
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
            style={{
              ...btn(t, true),
              justifyContent: "center",
            }}
          >
            {createPending ? "Creating…" : "Create"}
          </button>
        </form>
        )
      ) : null}

      {phone ? (
        <div
          className="fuel-watchlist-cards fuel-card-stack"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflow: "visible",
            padding: 0,
          }}
        >
          {filtered.map((w) => {
            const detail = accessDetail(w, userEmail, teamNameById);
            const isOwner = w.ownerEmail === userEmail;
            const isEditing = editingId === w.id;
            const ownerLabel = isOwner ? "You" : w.ownerEmail.split("@")[0];

            if (isEditing) {
              return (
                <article
                  key={w.id}
                  className="fuel-watchlist-card"
                  style={{
                    ...framedPanelPadStyle(t),
                    ...editingRowStyle(t),
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    overflow: "visible",
                  }}
                >
                  <SurfaceField
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={editPending}
                    aria-label="Watchlist name"
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
                      style={{ cursor: "pointer", flex: "1 1 140px" }}
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <CompactActionButton
                      tone="primary"
                      disabled={editPending}
                      ariaLabel="Save"
                      title="Save"
                      onClick={() => onSaveEdit(w.id, w.name)}
                    >
                      {G.check} Save
                    </CompactActionButton>
                    <CompactActionButton
                      disabled={editPending}
                      ariaLabel="Cancel"
                      title="Cancel"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </CompactActionButton>
                  </div>
                </article>
              );
            }

            const updated = relativeTime(w.updatedAt);
            const companyHref = `${detailBasePath}/${w.id}`;
            const companyCountLabel =
              w.companyCount === 1 ? "1 company" : `${w.companyCount} companies`;

            return (
                <article
                  key={w.id}
                  className="fuel-watchlist-card"
                  style={{
                    ...framedPanelPadStyle(t),
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    overflow: "visible",
                  }}
                >
                <div
                  style={{
                    alignItems: "flex-start",
                    display: "flex",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={companyHref}
                      style={{
                        color: t.ink,
                        display: "block",
                        fontFamily: t.sans,
                        fontSize: 16,
                        fontWeight: 650,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.3,
                        textDecoration: "none",
                      }}
                    >
                      {w.name}
                    </Link>
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      <span title={detail}>
                        <Chip t={t} tone={scopeTone(w.scope)}>
                          {scopeLabel(w.scope)}
                        </Chip>
                      </span>
                      {w.kind === "portfolio" ? (
                        <span
                          style={{
                            color: t.accent,
                            fontFamily: t.sans,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {formatFundName(w.fundName) ?? "Portfolio"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      flexShrink: 0,
                      gap: 2,
                      minHeight: TOUCH_TARGET_MIN,
                    }}
                  >
                    <StarToggle t={t} watchlistId={w.id} starred={w.follower?.starred === true} />
                    {isOwner ? (
                      <>
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
                      </>
                    ) : null}
                  </div>
                </div>

                {w.companyCount > 0 ? (
                  <Link
                    href={companyHref}
                    className="fuel-watchlist-card-companies"
                    aria-label={`View ${companyCountLabel} in ${w.name}`}
                    style={{
                      background: t.panelAlt,
                      border: `1px solid ${t.rule}`,
                      borderRadius: 10,
                      color: t.ink,
                      padding: "10px 12px",
                    }}
                  >
                    <CompanyStack
                      t={t}
                      items={w.companyPreview}
                      extraCount={Math.max(0, w.companyCount - 3)}
                      max={3}
                      size={28}
                      overlap
                    />
                    <span
                      className="fuel-watchlist-card-companies-count"
                      style={{
                        color: t.ink,
                        fontFamily: t.sans,
                        fontSize: 14,
                        fontWeight: 650,
                      }}
                    >
                      {companyCountLabel}
                    </span>
                    <span
                      aria-hidden
                      style={{
                        color: t.muted,
                        display: "inline-flex",
                        flexShrink: 0,
                        marginLeft: "auto",
                      }}
                    >
                      {G.arrow}
                    </span>
                  </Link>
                ) : (
                  <div
                    className="fuel-watchlist-card-companies"
                    style={{
                      background: t.panelAlt,
                      border: `1px dashed ${t.rule}`,
                      borderRadius: 10,
                      color: t.muted,
                      fontFamily: t.sans,
                      fontSize: 14,
                      padding: "10px 12px",
                    }}
                  >
                    No companies yet
                  </div>
                )}

                <div
                  style={{
                    color: t.muted,
                    fontFamily: t.sans,
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  {ownerLabel}
                  {updated ? ` · ${updated}` : ""}
                </div>
              </article>
            );
          })}
          {filtered.length === 0 ? (
            <div
              style={{
                alignItems: "center",
                color: t.muted,
                display: "flex",
                flexDirection: "column",
                fontFamily: t.sans,
                fontSize: 13,
                gap: 12,
                padding: 40,
              }}
            >
              <span>{emptyMessage}</span>
              {showEmptyCta ? (
                <CreateIconButton
                  t={t}
                  label={`New ${kindLabel.toLowerCase()}`}
                  onClick={() => setShowCreate(true)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="fuel-data-table-frame fuel-table-wrap" style={dataTableFrameStyle(t)}>
          <table
            className="fuel-data-table fuel-watchlist-table"
            style={{ ...dataTableStyle(), minWidth: 720 }}
          >
            <thead>
              <tr>
                <th style={dataThStyle(t)}>Name</th>
                <th style={dataThStyle(t)}>Access</th>
                <th style={dataThStyle(t)}>Companies</th>
                <th style={dataThStyle(t)}>Owner</th>
                <th style={dataThStyle(t, { align: "right" })}>Updated</th>
                <th style={dataThStyle(t, { align: "right" })}>★</th>
                <th style={dataThStyle(t, { align: "right" })}>Actions</th>
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
                      <td style={dataTdStyle(t, { top: false })}>
                        <SurfaceField
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={editPending}
                          aria-label="Watchlist name"
                          style={{ width: "100%", minWidth: 140 }}
                        />
                      </td>
                      <td style={dataTdStyle(t, { top: false })} colSpan={2}>
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
                      <td style={dataTdStyle(t, { top: false })}>
                        <div style={{ fontSize: 13 }}>You</div>
                      </td>
                      <td style={dataTdStyle(t, { align: "right", mono: true, top: false })}>
                        {relativeTime(w.updatedAt)}
                      </td>
                      <td style={dataTdStyle(t, { align: "right", top: false })}>
                        <StarToggle t={t} watchlistId={w.id} starred={w.follower?.starred === true} />
                      </td>
                      <td style={dataTdActionsStyle(t)}>
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
                    <td style={dataTdStyle(t, { primary: true, top: false })}>
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
                    <td style={dataTdStyle(t, { top: false })} title={detail}>
                      <Chip t={t} tone={scopeTone(w.scope)}>
                        {scopeLabel(w.scope)}
                      </Chip>
                    </td>
                    <td style={dataTdStyle(t, { top: false })}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CompanyStack
                          t={t}
                          items={w.companyPreview}
                          extraCount={Math.max(0, w.companyCount - 4)}
                          listHref={`${detailBasePath}/${w.id}`}
                        />
                        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                          {w.companyCount}
                        </span>
                      </div>
                    </td>
                    <td style={dataTdStyle(t, { top: false })}>
                      <div style={{ fontSize: 13 }}>
                        {isOwner ? "You" : w.ownerEmail.split("@")[0]}
                      </div>
                      {!isOwner ? (
                        <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
                          {w.ownerEmail}
                        </div>
                      ) : null}
                    </td>
                    <td style={dataTdStyle(t, { align: "right", mono: true, top: false })}>
                      {relativeTime(w.updatedAt)}
                    </td>
                    <td style={dataTdStyle(t, { align: "right", top: false })}>
                      <StarToggle t={t} watchlistId={w.id} starred={w.follower?.starred === true} />
                    </td>
                    <td style={dataTdActionsStyle(t)}>
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
                <CreateIconButton
                  t={t}
                  label={`New ${kindLabel.toLowerCase()}`}
                  onClick={() => setShowCreate(true)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
