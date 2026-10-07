"use client";

import {
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  createTeamAction,
  deleteTeamAction,
  updateTeamAction,
} from "@/app/(app)/account/actions";
import {
  DUPLICATE_TEAM_NAME_MESSAGE,
  isTeamNameTaken,
} from "@/lib/teams/team-name";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import { Chip } from "../atoms";
import { G } from "../icons";
import {
  CreateIconButton,
  FilterGroup,
  FilterMenu,
  FilterOption,
  PageToolbar,
} from "../ToolbarActions";
import { AddScreenShell } from "@/components/drawer/AddScreenShell";
import { addScreenPrimaryBtnStyle } from "@/components/drawer/styles";
import { useTheme } from "../ThemeContext";
import { ctaPrimaryStyle } from "@/lib/theme";
import { useToast } from "../toast/ToastProvider";
import {
  CompactActionButton,
  MemberChipPicker,
  SurfaceField,
} from "./watchlist-access-ui";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdActionsStyle,
  dataTdStyle,
  dataThStyle,
} from "./adminStyles";

export type AccountTeamRow = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: string[];
};

type MembershipFilter = "all" | "mine" | "other";

const editingRowStyle = (accent: string): CSSProperties => ({
  outline: `1px solid ${accent}55`,
  outlineOffset: -1,
  boxShadow: `inset 3px 0 0 ${accent}`,
});

export function AccountTeams({
  accountId,
  teams,
  accountMembers,
  canManage,
  currentUserEmail,
}: {
  accountId: string;
  teams: AccountTeamRow[];
  accountMembers: Array<{ email: string; role: string }>;
  canManage: boolean;
  currentUserEmail: string;
}) {
  const t = useTheme();
  const phone = useNarrow(BREAKPOINTS.md);
  const { showToast } = useToast();
  const [, startTransition] = useTransition();
  const [createPending, startCreate] = useTransition();
  const [savePending, startSave] = useTransition();
  const [filter, setFilter] = useState<MembershipFilter>("all");
  const [nameError, setNameError] = useState<string | null>(null);
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createMembers, setCreateMembers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMembers, setEditMembers] = useState<string[]>([]);

  const me = currentUserEmail.trim().toLowerCase();
  const hasTeams = teams.length > 0;

  function beginEdit(team: AccountTeamRow) {
    setShowCreate(false);
    setEditingId(team.id);
    setEditName(team.name);
    setEditDescription(team.description ?? "");
    setEditMembers([...team.members]);
    setEditNameError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditMembers([]);
    setEditNameError(null);
  }

  function onCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    if (isTeamNameTaken(name, teams)) {
      setNameError(DUPLICATE_TEAM_NAME_MESSAGE);
      return;
    }
    setNameError(null);
    startCreate(async () => {
      const result = await createTeamAction(fd);
      if (result?.error) {
        setNameError(result.error);
        return;
      }
      form.reset();
      setCreateMembers([]);
      setNameError(null);
      setShowCreate(false);
    });
  }

  function onSaveEdit(teamId: string) {
    const name = editName.trim();
    if (!name) {
      setEditNameError("Team name is required.");
      return;
    }
    if (isTeamNameTaken(name, teams, teamId)) {
      setEditNameError(DUPLICATE_TEAM_NAME_MESSAGE);
      return;
    }
    setEditNameError(null);
    startSave(async () => {
      const fd = new FormData();
      fd.set("accountId", accountId);
      fd.set("id", teamId);
      fd.set("name", name);
      fd.set("description", editDescription.trim());
      for (const email of editMembers) fd.append("memberEmails", email);
      const result = await updateTeamAction(fd);
      if (result?.error) {
        setEditNameError(result.error);
        showToast({ message: result.error, variant: "error" });
        return;
      }
      cancelEdit();
    });
  }

  const counts = useMemo(() => {
    let mine = 0;
    let other = 0;
    for (const team of teams) {
      if (team.members.some((e) => e.toLowerCase() === me)) mine++;
      else other++;
    }
    return { all: teams.length, mine, other };
  }, [teams, me]);

  const visibleTeams = useMemo(() => {
    return teams.filter((team) => {
      const onTeam = team.members.some((e) => e.toLowerCase() === me);
      if (filter === "mine") return onTeam;
      if (filter === "other") return !onTeam;
      return true;
    });
  }, [teams, filter, me]);

  const primaryBtn: CSSProperties = {
    ...ctaPrimaryStyle(t),
    alignItems: "center",
    borderRadius: 8,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 600,
    justifyContent: "center",
    minHeight: TOUCH_TARGET_MIN,
    padding: "10px 16px",
    whiteSpace: "nowrap",
  };

  function openCreate() {
    setShowCreate(true);
    setNameError(null);
    if (editingId) cancelEdit();
  }

  function toggleCreate() {
    setShowCreate((v) => !v);
    setNameError(null);
    if (editingId) cancelEdit();
  }

  return (
    <div className="fuel-account-teams">
      {/* Filters + New team only matter once teams exist */}
      {hasTeams ? (
        <div
          className="fuel-account-teams__toolbar"
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <PageToolbar
            t={t}
            filter={
              <FilterMenu
                t={t}
                activeCount={filter === "all" ? 0 : 1}
                onClear={() => setFilter("all")}
              >
                <FilterGroup t={t} title="Teams">
                    {(
                      [
                        { key: "all" as const, label: phone ? "All" : "All teams", count: counts.all },
                        { key: "mine" as const, label: phone ? "Mine" : "I'm on", count: counts.mine },
                        { key: "other" as const, label: phone ? "Other" : "Other teams", count: counts.other },
                      ]
                    ).map((item) => (
                      <FilterOption
                        key={item.key}
                        t={t}
                        selected={filter === item.key}
                        onSelect={() => setFilter(item.key)}
                        trailing={item.count}
                      >
                        {item.label}
                      </FilterOption>
                    ))}
                </FilterGroup>
              </FilterMenu>
            }
            create={
              canManage ? (
                <CreateIconButton
                  t={t}
                  label="New team"
                  active={phone ? false : showCreate}
                  onClick={phone ? openCreate : toggleCreate}
                />
              ) : undefined
            }
          />
        </div>
      ) : null}

      {canManage && showCreate ? (
        phone ? (
          <AddScreenShell
            t={t}
            title="New team"
            onClose={() => { setShowCreate(false); setNameError(null); }}
            footer={
              <button
                type="submit"
                form="team-create-form"
                disabled={createPending}
                style={addScreenPrimaryBtnStyle(t, {
                  cursor: createPending ? "wait" : "pointer",
                  opacity: createPending ? 0.7 : 1,
                })}
              >
                {createPending ? "Creating…" : "Create team"}
              </button>
            }
          >
            <form
              id="team-create-form"
              className="fuel-account-teams__create"
              onSubmit={onCreateSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <p
                style={{
                  color: t.muted,
                  fontFamily: t.sans,
                  fontSize: 13,
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                Name the team and optionally add members now.
              </p>
              <input type="hidden" name="accountId" value={accountId} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SurfaceField
                  name="name"
                  placeholder="Team name"
                  required
                  autoFocus
                  aria-label="Team name"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? "team-name-error" : undefined}
                  onChange={() => {
                    if (nameError) setNameError(null);
                  }}
                  style={{
                    width: "100%",
                    borderColor: nameError ? t.negative : undefined,
                  }}
                />
                {nameError ? (
                  <span
                    id="team-name-error"
                    role="alert"
                    style={{ fontFamily: t.sans, fontSize: 12, color: t.negative, lineHeight: 1.4 }}
                  >
                    {nameError}
                  </span>
                ) : null}
              </div>
              <MemberChipPicker
                members={accountMembers}
                value={createMembers}
                onChange={setCreateMembers}
                name="memberEmails"
                disabled={createPending}
                placeholder="Add members…"
              />
            </form>
          </AddScreenShell>
        ) : (
        <form
          className="fuel-account-teams__create"
          onSubmit={onCreateSubmit}
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: hasTeams ? 14 : 0,
            padding: phone ? 14 : 16,
          }}
        >
          <div>
            <div
              style={{
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 14,
                fontWeight: 650,
                marginBottom: 4,
              }}
            >
              New team
            </div>
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12,
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              Name the team and optionally add members now.
            </p>
          </div>
          <input type="hidden" name="accountId" value={accountId} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SurfaceField
              name="name"
              placeholder="Team name"
              required
              autoFocus
              aria-label="Team name"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "team-name-error" : undefined}
              onChange={() => {
                if (nameError) setNameError(null);
              }}
              style={{
                width: "100%",
                borderColor: nameError ? t.negative : undefined,
              }}
            />
            {nameError ? (
              <span
                id="team-name-error"
                role="alert"
                style={{ fontFamily: t.sans, fontSize: 12, color: t.negative, lineHeight: 1.4 }}
              >
                {nameError}
              </span>
            ) : null}
          </div>
          <MemberChipPicker
            members={accountMembers}
            value={createMembers}
            onChange={setCreateMembers}
            name="memberEmails"
            disabled={createPending}
            placeholder="Add members…"
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: phone ? "stretch" : "flex-end",
            }}
          >
            {hasTeams || !canManage ? null : (
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNameError(null);
                }}
                style={{
                  ...primaryBtn,
                  background: "transparent",
                  border: `1px solid ${t.rule}`,
                  color: t.inkSoft,
                  flex: phone ? "1 1 auto" : undefined,
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={createPending}
              style={{
                ...primaryBtn,
                cursor: createPending ? "wait" : "pointer",
                flex: phone ? "1 1 auto" : undefined,
                opacity: createPending ? 0.7 : 1,
              }}
            >
              {createPending ? "Creating…" : "Create team"}
            </button>
          </div>
        </form>
        )
      ) : null}

      {/* Zero teams: calm empty state — no filter tabs, no empty table headers */}
      {!hasTeams && !showCreate ? (
        <div
          className="fuel-account-teams__empty"
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: phone ? "36px 20px" : "48px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: t.ink,
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            No teams yet
          </div>
          <p
            style={{
              color: t.muted,
              fontFamily: t.sans,
              fontSize: 13,
              lineHeight: 1.5,
              margin: 0,
              maxWidth: 320,
            }}
          >
            {canManage
              ? "Create a team to group members for watchlists and shared work."
              : "An owner or admin can create the first team for this account."}
          </p>
          {canManage ? (
            <CreateIconButton
              t={t}
              label="Create team"
              onClick={openCreate}
              style={{ marginTop: 4 }}
            />
          ) : null}
        </div>
      ) : null}

      {hasTeams ? (
      <div
        className="fuel-data-table-frame fuel-table-wrap"
        style={{ ...dataTableFrameStyle(t), overflow: "visible" }}
      >
        <table className="fuel-data-table" style={dataTableStyle()}>
          <thead>
            <tr>
              <th style={dataThStyle(t)}>Team</th>
              <th style={dataThStyle(t)}>Description</th>
              <th style={dataThStyle(t)}>Members</th>
              <th style={dataThStyle(t, { align: "right" })}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTeams.map((team) => {
              const onTeam = team.members.some((e) => e.toLowerCase() === me);
              const isEditing = editingId === team.id;
              return (
                <tr
                  key={team.id}
                  style={isEditing ? editingRowStyle(t.accent) : undefined}
                >
                  <td style={dataTdStyle(t, { top: false })}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
                        <SurfaceField
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editNameError) setEditNameError(null);
                          }}
                          disabled={savePending}
                          aria-label="Team name"
                          aria-invalid={editNameError ? true : undefined}
                          style={{
                            width: "100%",
                            fontWeight: 600,
                            borderColor: editNameError ? t.negative : undefined,
                          }}
                        />
                        {editNameError ? (
                          <span
                            role="alert"
                            style={{ fontFamily: t.sans, fontSize: 11, color: t.negative }}
                          >
                            {editNameError}
                          </span>
                        ) : null}
                        {onTeam ? <Chip t={t} tone="accent">You&apos;re on this team</Chip> : null}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
                          {team.name}
                        </span>
                        {onTeam ? <Chip t={t} tone="accent">You&apos;re on this team</Chip> : null}
                      </div>
                    )}
                  </td>
                  <td style={{ ...dataTdStyle(t, { top: false }), maxWidth: 260 }}>
                    {isEditing ? (
                      <SurfaceField
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        disabled={savePending}
                        placeholder="Description (optional)"
                        aria-label="Team description"
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: t.sans,
                          fontSize: 13,
                          color: team.description ? t.inkSoft : t.muted,
                        }}
                      >
                        {team.description?.trim() || "—"}
                      </span>
                    )}
                  </td>
                  <td style={{ ...dataTdStyle(t, { top: false }), minWidth: 260 }}>
                    <MemberChipPicker
                      members={accountMembers}
                      value={isEditing ? editMembers : team.members}
                      onChange={setEditMembers}
                      disabled={!canManage || !isEditing || savePending}
                    />
                  </td>
                  <td style={dataTdActionsStyle(t)}>
                    {canManage ? (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        {isEditing ? (
                          <>
                            <CompactActionButton
                              tone="primary"
                              iconOnly
                              disabled={savePending}
                              ariaLabel="Save"
                              title="Save"
                              onClick={() => onSaveEdit(team.id)}
                            >
                              {G.check}
                            </CompactActionButton>
                            <CompactActionButton
                              iconOnly
                              disabled={savePending}
                              ariaLabel="Cancel"
                              title="Cancel"
                              onClick={cancelEdit}
                            >
                              {G.close}
                            </CompactActionButton>
                          </>
                        ) : (
                          <>
                            <CompactActionButton
                              iconOnly
                              ariaLabel="Edit"
                              title="Edit"
                              onClick={() => beginEdit(team)}
                            >
                              {G.edit}
                            </CompactActionButton>
                            <form
                              action={(fd) => startTransition(() => deleteTeamAction(fd))}
                              style={{ display: "inline" }}
                              onSubmit={(e) => {
                                if (!confirm(`Delete "${team.name}"?`)) e.preventDefault();
                              }}
                            >
                              <input type="hidden" name="accountId" value={accountId} />
                              <input type="hidden" name="id" value={team.id} />
                              <CompactActionButton
                                type="submit"
                                iconOnly
                                ariaLabel={`Delete ${team.name}`}
                                title="Delete"
                              >
                                {G.trash}
                              </CompactActionButton>
                            </form>
                          </>
                        )}
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
        {visibleTeams.length === 0 ? (
          <div
            style={{
              alignItems: "center",
              color: t.muted,
              display: "flex",
              flexDirection: "column",
              fontFamily: t.sans,
              fontSize: 13,
              gap: 8,
              padding: 32,
              textAlign: "center",
            }}
          >
            {filter === "mine"
              ? "You're not on any team."
              : "No teams match this filter."}
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
