"use client";

import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { Advisor } from "@/db/schema";
import { Chip, SectionHead } from "../atoms";
import { G } from "../icons";
import { useTheme } from "../ThemeContext";
import { CompactActionButton } from "./watchlist-access-ui";
import {
  upsertAdvisorAction,
  deleteAdvisorAction,
  setAdvisorStatusAction,
  enhanceInstanceAdvisorFromLinkedInAction,
} from "@/app/(super-admin)/super-admin/advisors/actions";

function button(t: Theme, variant: "primary" | "ghost" = "ghost"): React.CSSProperties {
  const map = {
    primary: { bg: t.ink, color: t.bg, border: t.ink },
    ghost: { bg: "transparent", color: t.inkSoft, border: t.rule },
  } as const;
  const v = map[variant];
  return {
    padding: "6px 12px",
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function input(t: Theme, multiline = false): React.CSSProperties {
  return {
    padding: "8px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 13,
    width: "100%",
    minHeight: multiline ? 80 : undefined,
    resize: multiline ? "vertical" : undefined,
  };
}

type AdvisorModalState =
  | { mode: "create" }
  | { mode: "edit" | "view"; row: Advisor };

export function AdvisorAdminView({ rows }: { rows: Advisor[] }) {
  const t = useTheme();
  const [modal, setModal] = useState<AdvisorModalState | null>(null);

  return (
    <div>
      <SectionHead
        t={t}
        title="Advisors · Admin"
        subtitle="Instance-level advisors. Visible to every account alongside each account's own advisors."
        right={
          <button onClick={() => setModal({ mode: "create" })} style={button(t, "primary")}>
            + New advisor
          </button>
        }
      />

      {rows.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            background: t.panel,
            border: `1px solid ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
          }}
        >
          No instance advisors curated yet.
        </div>
      ) : (
        <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Title / Company", "Expertise", "Status", ""].map((h) => (
                  <th
                    key={h || "actions"}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontFamily: t.sans,
                      fontSize: 11,
                      color: t.muted,
                      borderBottom: `1px solid ${t.rule}`,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={cellBase(t)}>
                    <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
                      {r.name}
                    </div>
                    {r.email ? (
                      <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
                        {r.email}
                      </div>
                    ) : null}
                  </td>
                  <td style={cellBase(t)}>
                    <div style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft }}>
                      {[r.title, r.company].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td style={cellBase(t)}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(r.expertise ?? []).slice(0, 3).map((tag) => (
                        <Chip key={tag} t={t} tone="ghost">
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td style={cellBase(t)}>
                    <StatusToggle row={r} />
                  </td>
                  <td style={{ ...cellBase(t), textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <CompactActionButton
                        iconOnly
                        ariaLabel={`View ${r.name}`}
                        title="View"
                        onClick={() => setModal({ mode: "view", row: r })}
                      >
                        {G.view}
                      </CompactActionButton>
                      <CompactActionButton
                        iconOnly
                        ariaLabel={`Edit ${r.name}`}
                        title="Edit"
                        onClick={() => setModal({ mode: "edit", row: r })}
                      >
                        {G.edit}
                      </CompactActionButton>
                      <DeleteAdvisorButton row={r} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <AdvisorModal
          t={t}
          row={modal.mode === "create" ? null : modal.row}
          readOnly={modal.mode === "view"}
          onClose={() => setModal(null)}
          onUpdated={(updated) => setModal({ mode: "edit", row: updated })}
        />
      ) : null}
    </div>
  );
}

function StatusToggle({ row }: { row: Advisor }) {
  const t = useTheme();
  const [isPending, startTransition] = useTransition();
  const active = row.status === "active";
  const next = active ? "archived" : "active";

  return (
    <form action={(fd) => startTransition(() => setAdvisorStatusAction(fd))}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        role="switch"
        aria-checked={active}
        aria-label={`${row.name} is ${active ? "active" : "inactive"}. Toggle status.`}
        disabled={isPending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 1,
          fontFamily: t.sans,
          fontSize: 12,
          color: t.inkSoft,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 34,
            height: 18,
            borderRadius: 999,
            background: active ? t.accent : t.panelAlt,
            border: `1px solid ${active ? t.accent : t.rule}`,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 1,
              left: active ? 16 : 1,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: t.mode === "editorial" ? t.panel : t.ink,
              transition: "left 120ms ease",
            }}
          />
        </span>
        {active ? "Active" : "Inactive"}
      </button>
    </form>
  );
}

function DeleteAdvisorButton({ row }: { row: Advisor }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          await deleteAdvisorAction(fd);
        })
      }
      onSubmit={(e) => {
        if (!confirm(`Delete ${row.name}? Company links cascade. This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={row.id} />
      <CompactActionButton
        type="submit"
        iconOnly
        disabled={isPending}
        ariaLabel={`Delete ${row.name}`}
        title="Delete"
      >
        {G.trash}
      </CompactActionButton>
    </form>
  );
}

function cellBase(t: Theme): React.CSSProperties {
  return {
    padding: "10px 12px",
    fontFamily: t.sans,
    fontSize: 13,
    color: t.inkSoft,
    borderBottom: `1px solid ${t.ruleSoft}`,
    verticalAlign: "top",
  };
}

function AdvisorModal({
  t,
  row,
  readOnly,
  onClose,
  onUpdated,
}: {
  t: Theme;
  row: Advisor | null;
  readOnly: boolean;
  onClose: () => void;
  onUpdated: (row: Advisor) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(row);
  const linkedinUrl = draft?.linkedinUrl?.trim() ?? "";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 24,
          width: "min(720px, 94vw)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}>
            {readOnly && draft ? draft.name : draft ? `Edit ${draft.name}` : "New advisor"}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {draft && !readOnly ? (
              <form
                action={(fd) =>
                  startTransition(async () => {
                    const updated = await enhanceInstanceAdvisorFromLinkedInAction(fd);
                    if (updated) {
                      setDraft(updated);
                      onUpdated(updated);
                    }
                  })
                }
              >
                <input type="hidden" name="id" value={draft.id} />
                <input type="hidden" name="linkedinUrl" value={linkedinUrl} />
                <button
                  type="submit"
                  disabled={!linkedinUrl || isPending}
                  style={{
                    ...button(t, "primary"),
                    opacity: !linkedinUrl || isPending ? 0.6 : 1,
                    cursor: !linkedinUrl || isPending ? "default" : "pointer",
                  }}
                  title={
                    linkedinUrl
                      ? undefined
                      : "Add a LinkedIn URL first, then enhance"
                  }
                >
                  {isPending
                    ? "Enhancing…"
                    : draft.linkedinFetchedAt
                      ? "Re-fetch from LinkedIn"
                      : "Enhance from LinkedIn"}
                </button>
              </form>
            ) : null}
            <button onClick={onClose} style={button(t, "ghost")}>
              Close
            </button>
          </div>
        </div>

        <form
          action={
            readOnly
              ? undefined
              : (fd) =>
                  startTransition(async () => {
                    await upsertAdvisorAction(fd);
                    onClose();
                  })
          }
          onSubmit={readOnly ? (e) => e.preventDefault() : undefined}
          style={{ display: "grid", gap: 12 }}
        >
          {draft ? <input type="hidden" name="id" value={draft.id} /> : null}

          <Row t={t} label="Name *">
            <input name="name" required readOnly={readOnly} defaultValue={draft?.name ?? ""} style={input(t)} />
          </Row>
          <Row t={t} label="Title">
            <input name="title" readOnly={readOnly} defaultValue={draft?.title ?? ""} style={input(t)} key={`title-${draft?.updatedAt?.toString() ?? "new"}`} />
          </Row>
          <Row t={t} label="Company">
            <input name="company" readOnly={readOnly} defaultValue={draft?.company ?? ""} style={input(t)} key={`company-${draft?.updatedAt?.toString() ?? "new"}`} />
          </Row>
          <Row t={t} label="Email">
            <input name="email" type="email" readOnly={readOnly} defaultValue={draft?.email ?? ""} style={input(t)} />
          </Row>
          <Row t={t} label="Phone">
            <input name="phone" readOnly={readOnly} defaultValue={draft?.phone ?? ""} style={input(t)} />
          </Row>
          <Row t={t} label="LinkedIn URL">
            <input
              name="linkedinUrl"
              readOnly={readOnly}
              defaultValue={draft?.linkedinUrl ?? ""}
              style={input(t)}
              onChange={(e) => {
                if (!draft || readOnly) return;
                setDraft({ ...draft, linkedinUrl: e.target.value });
              }}
            />
          </Row>
          <Row t={t} label="Photo URL">
            <input name="photoUrl" readOnly={readOnly} defaultValue={draft?.photoUrl ?? ""} style={input(t)} key={`photo-${draft?.updatedAt?.toString() ?? "new"}`} />
          </Row>
          <Row t={t} label="Location">
            <input name="location" readOnly={readOnly} defaultValue={draft?.location ?? ""} style={input(t)} key={`loc-${draft?.updatedAt?.toString() ?? "new"}`} />
          </Row>
          <Row t={t} label="Expertise (comma-separated)">
            <input
              name="expertise"
              readOnly={readOnly}
              defaultValue={(draft?.expertise ?? []).join(", ")}
              style={input(t)}
            />
          </Row>
          <Row t={t} label="Focus industries">
            <input
              name="focusIndustries"
              readOnly={readOnly}
              defaultValue={(draft?.focusIndustries ?? []).join(", ")}
              style={input(t)}
            />
          </Row>
          <Row t={t} label="Bio">
            <textarea name="bio" readOnly={readOnly} defaultValue={draft?.bio ?? ""} style={input(t, true)} key={`bio-${draft?.updatedAt?.toString() ?? "new"}`} />
          </Row>
          <Row t={t} label="Admin notes">
            <textarea
              name="privateNotes"
              readOnly={readOnly}
              defaultValue={draft?.privateNotes ?? ""}
              style={input(t, true)}
            />
          </Row>
          <Row t={t} label="Public card">
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: t.sans,
                fontSize: 13,
                color: t.inkSoft,
                paddingTop: 8,
              }}
            >
              <input
                type="checkbox"
                name="publicCard"
                defaultChecked={draft?.publicCard ?? false}
                disabled={readOnly}
              />
              Allow /advisor/…/card without login
            </label>
          </Row>

          {draft?.linkedinFetchedAt ? (
            <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, paddingLeft: 170 }}>
              LinkedIn last fetched {draft.linkedinFetchedAt.toLocaleDateString("en-US")}
            </div>
          ) : null}

          {readOnly ? null : (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button type="submit" disabled={isPending} style={button(t, "primary")}>
                {isPending ? "Saving…" : draft ? "Save changes" : "Create advisor"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Row({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 11,
          color: t.muted,
          paddingTop: 8,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
