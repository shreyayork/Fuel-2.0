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
import { Chip, Tabs } from "../atoms";
import { G } from "../icons";
import { useTheme } from "../ThemeContext";
import { useToast } from "../toast/ToastProvider";
import {
  CompactActionButton,
  MemberChipPicker,
  SurfaceField,
} from "./watchlist-access-ui";

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

  const th: CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    color: t.muted,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: `1px solid ${t.rule}`,
  };
  const td: CSSProperties = {
    padding: "12px 14px",
    borderBottom: `1px solid ${t.ruleSoft}`,
    verticalAlign: "middle",
  };
  const primaryBtn: CSSProperties = {
    padding: "8px 14px",
    background: t.ink,
    color: t.bg,
    border: `1px solid ${t.ink}`,
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <Tabs
          t={t}
          active={filter}
          onChange={(k) => setFilter(k as MembershipFilter)}
          items={[
            { key: "all", label: "All teams", count: counts.all },
            { key: "mine", label: "I'm on", count: counts.mine },
            { key: "other", label: "Other teams", count: counts.other },
          ]}
        />
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setNameError(null);
              if (editingId) cancelEdit();
            }}
            aria-expanded={showCreate}
            style={primaryBtn}
          >
            {showCreate ? "Cancel" : "+ New team"}
          </button>
        ) : null}
      </div>

      {canManage && showCreate ? (
        <form
          onSubmit={onCreateSubmit}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: 14,
            background: t.panel,
            border: `1px solid ${t.rule}`,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <input type="hidden" name="accountId" value={accountId} />
          <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 6 }}>
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
          <div style={{ flex: 2, minWidth: 220 }}>
            <MemberChipPicker
              members={accountMembers}
              value={createMembers}
              onChange={setCreateMembers}
              name="memberEmails"
              disabled={createPending}
              placeholder="Add members…"
            />
          </div>
          <button
            type="submit"
            disabled={createPending}
            style={{
              ...primaryBtn,
              cursor: createPending ? "wait" : "pointer",
              opacity: createPending ? 0.7 : 1,
            }}
          >
            {createPending ? "Creating…" : "Create team"}
          </button>
        </form>
      ) : null}

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Team</th>
              <th style={th}>Description</th>
              <th style={th}>Members</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
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
                  <td style={td}>
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
                  <td style={{ ...td, maxWidth: 260 }}>
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
                  <td style={{ ...td, minWidth: 260 }}>
                    <MemberChipPicker
                      members={accountMembers}
                      value={isEditing ? editMembers : team.members}
                      onChange={setEditMembers}
                      disabled={!canManage || !isEditing || savePending}
                    />
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
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
              padding: 40,
              textAlign: "center",
              fontFamily: t.sans,
              fontSize: 13,
              color: t.muted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            {teams.length === 0 ? (
              <>
                <span>No teams yet.</span>
                {canManage ? (
                  <button type="button" onClick={() => setShowCreate(true)} style={primaryBtn}>
                    Create team
                  </button>
                ) : null}
              </>
            ) : filter === "mine" ? (
              "You're not on any team."
            ) : (
              "No teams match this filter."
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
