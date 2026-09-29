"use client";

import { useTransition, type CSSProperties } from "react";
import {
  inviteMemberAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
  setRoleAction,
} from "@/app/(app)/account/actions";
import { Chip, Avatar } from "../atoms";
import { useTheme } from "../ThemeContext";
import type { AccountMember } from "@/db/schema";

export interface PendingInviteSummary {
  tokenHash: string;
  email: string;
  role: "owner" | "admin" | "member";
  invitedByEmail: string;
  expiresAt: string;
  createdAt: string;
}

function initialsFor(email: string): string {
  const [local] = email.split("@");
  if (!local) return "??";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function roleTone(r: string): "accent" | "ghost" {
  return r === "owner" ? "accent" : "ghost";
}

export function AccountUsers({
  accountId,
  members,
  pendingInvites = [],
  canManage,
  currentEmail,
}: {
  accountId: string;
  members: AccountMember[];
  pendingInvites?: PendingInviteSummary[];
  canManage: boolean;
  currentEmail: string;
}) {
  const t = useTheme();
  const [, startTransition] = useTransition();

  const thStyle: CSSProperties = {
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
  const tdStyle: CSSProperties = {
    padding: "12px 14px",
    borderBottom: `1px solid ${t.ruleSoft}`,
  };

  return (
    <div>
      {canManage ? (
        <form
          action={(fd) => startTransition(() => inviteMemberAction(fd))}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: 14,
            background: t.panel,
            border: `1px solid ${t.rule}`,
            marginBottom: 14,
          }}
        >
          <input type="hidden" name="accountId" value={accountId} />
          <input
            name="email"
            type="email"
            placeholder="teammate@company.com"
            required
            style={{
              flex: 1,
              padding: "8px 10px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
            }}
          />
          <select
            name="role"
            defaultValue="member"
            style={{
              padding: "8px 10px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button
            type="submit"
            style={{
              padding: "8px 14px",
              background: t.ink,
              color: t.bg,
              border: `1px solid ${t.ink}`,
              borderRadius: 8,
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Invite
          </button>
        </form>
      ) : null}

      {pendingInvites.length > 0 ? (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            marginBottom: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${t.rule}`,
              fontFamily: t.mono,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: t.mutedSoft,
            }}
          >
            Pending invites · {pendingInvites.length}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Sent</th>
                <th style={thStyle}>Expires</th>
                <th style={{ ...thStyle, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((p) => (
                <tr key={p.tokenHash}>
                  <td style={tdStyle}>
                    <div style={{ fontFamily: t.sans, fontSize: 13 }}>{p.email}</div>
                    <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
                      invited by {p.invitedByEmail}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <Chip t={t} tone={roleTone(p.role)}>
                      {p.role}
                    </Chip>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                    {new Date(p.expiresAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {canManage ? (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <form
                          action={(fd) => startTransition(() => resendInviteAction(fd))}
                          style={{ display: "inline" }}
                        >
                          <input type="hidden" name="accountId" value={accountId} />
                          <input type="hidden" name="tokenHash" value={p.tokenHash} />
                          <button
                            type="submit"
                            style={{
                              background: "transparent",
                              border: `1px solid ${t.rule}`,
                              color: t.inkSoft,
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontFamily: t.sans,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            Resend
                          </button>
                        </form>
                        <form
                          action={(fd) => startTransition(() => revokeInviteAction(fd))}
                          style={{ display: "inline" }}
                        >
                          <input type="hidden" name="accountId" value={accountId} />
                          <input type="hidden" name="tokenHash" value={p.tokenHash} />
                          <button
                            type="submit"
                            style={{
                              background: "transparent",
                              border: `1px solid ${t.rule}`,
                              color: t.muted,
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontFamily: t.sans,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            Revoke
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Member</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Joined</th>
              <th style={{ ...thStyle, textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userEmail}>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                      t={t}
                      person={{ name: m.userEmail, avatar: initialsFor(m.userEmail) }}
                      size={28}
                    />
                    <div>
                      <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 500 }}>
                        {m.userEmail === currentEmail ? "You" : m.userEmail}
                      </div>
                      {m.userEmail === currentEmail ? (
                        <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
                          {m.userEmail}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  {canManage && m.userEmail !== currentEmail ? (
                    <form
                      action={(fd) => startTransition(() => setRoleAction(fd))}
                      style={{ display: "inline-flex" }}
                    >
                      <input type="hidden" name="accountId" value={accountId} />
                      <input type="hidden" name="email" value={m.userEmail} />
                      <select
                        name="role"
                        defaultValue={m.role}
                        onChange={(e) => {
                          const fd = new FormData();
                          fd.set("accountId", accountId);
                          fd.set("email", m.userEmail);
                          fd.set("role", e.target.value);
                          startTransition(() => setRoleAction(fd));
                        }}
                        style={{
                          padding: "4px 8px",
                          background: t.panelAlt,
                          color: t.ink,
                          border: `1px solid ${t.rule}`,
                          borderRadius: 6,
                          fontFamily: t.sans,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </form>
                  ) : (
                    <Chip t={t} tone={roleTone(m.role)}>{m.role}</Chip>
                  )}
                </td>
                <td style={{ ...tdStyle, fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                  {m.createdAt
                    ? new Date(m.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {canManage && m.userEmail !== currentEmail ? (
                    <form
                      action={(fd) => startTransition(() => removeMemberAction(fd))}
                      style={{ display: "inline" }}
                    >
                      <input type="hidden" name="accountId" value={accountId} />
                      <input type="hidden" name="email" value={m.userEmail} />
                      <button
                        type="submit"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: t.muted,
                          cursor: "pointer",
                          fontSize: 18,
                          lineHeight: 1,
                        }}
                        title="Remove from account"
                      >
                        ×
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: t.muted }}>
            No members yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
