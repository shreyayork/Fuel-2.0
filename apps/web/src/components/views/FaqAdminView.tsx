"use client";

import { useEffect, useState, useTransition, type DragEvent } from "react";
import type { Theme } from "@/lib/theme";
import type { FaqEntry } from "@/db/schema";
import { Chip } from "../atoms";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminStatsStrip } from "./AdminChrome";
import { useTheme } from "../ThemeContext";
import {
  adminBtnStyle,
  adminEmptyStyle,
  adminInputStyle,
  adminModalOverlayStyle,
  adminModalPanelStyle,
  adminModalTitleStyle,
  adminPageStyle,
  adminSectionLabelStyle,
  adminTableFrameStyle,
  adminTableScrollStyle,
  adminTableStyle,
  adminTdActionsStyle,
  adminTdStyle,
  adminThStyle,
} from "./adminStyles";
import { formatFaqPointsText } from "@/lib/faq-constants";
import { FaqLinkedTextarea } from "@/components/help/FaqLinkedTextarea";
import {
  deleteFaqEntryAction,
  setFaqSortOrderAction,
  upsertFaqEntryAction} from "@/app/(super-admin)/super-admin/faq/actions";




function reorderLocal(list: FaqEntry[], fromId: string, toId: string): FaqEntry[] {
  if (fromId === toId) return list;
  const next = [...list];
  const from = next.findIndex((r) => r.id === fromId);
  const to = next.findIndex((r) => r.id === toId);
  if (from < 0 || to < 0) return list;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function FaqAdminView({ rows }: { rows: FaqEntry[] }) {
  const t = useTheme();
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [ordered, setOrdered] = useState(rows);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrdered(rows);
  }, [rows]);

  const openNew = () => {
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (row: FaqEntry) => {
    setEditing(row);
    setCreating(true);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const persistOrder = (next: FaqEntry[]) => {
    setOrdered(next);
    startTransition(async () => {
      await setFaqSortOrderAction(next.map((r) => r.id));
    });
  };

  const onDragStart = (e: DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);

    // Native drag ghost often looks transparent. Feed a solid-themed clone.
    const row = e.currentTarget as HTMLTableRowElement;
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.top = "-9999px";
    wrap.style.left = "0";
    wrap.style.background = t.panel;
    wrap.style.border = `1px solid ${t.rule}`;
    wrap.style.borderRadius = "6px";
    wrap.style.boxShadow = `0 8px 24px ${t.borderSubtle}`;
    wrap.style.opacity = "1";
    wrap.style.width = `${row.getBoundingClientRect().width}px`;
    wrap.style.overflow = "hidden";
    wrap.style.pointerEvents = "none";
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.background = t.panel;
    const tbody = document.createElement("tbody");
    const clone = row.cloneNode(true) as HTMLTableRowElement;
    clone.style.background = t.panel;
    clone.style.opacity = "1";
    tbody.appendChild(clone);
    table.appendChild(tbody);
    wrap.appendChild(table);
    document.body.appendChild(wrap);
    e.dataTransfer.setDragImage(wrap, 24, 16);
    requestAnimationFrame(() => wrap.remove());
  };

  const onDragOver = (e: DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };

  const onDrop = (e: DragEvent, toId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    setOverId(null);
    if (!fromId) return;
    const next = reorderLocal(ordered, fromId, toId);
    if (next === ordered) return;
    persistOrder(next);
  };

  return (
    <div className="fuel-admin-page" style={adminPageStyle()}>
      <AdminPageHeader
        t={t}
        title="Help & FAQ"
        description="Drag to reorder. Select text → Link or ⌘/Ctrl+K for a URL."
        actions={
          <button type="button" onClick={openNew} style={adminBtnStyle(t, "primary")}>
            + New question
          </button>
        }
      />

      <AdminStatsStrip
        t={t}
        items={[
          { label: "Questions", value: ordered.length },
          {
            label: "Published",
            value: ordered.filter((r) => r.published).length,
          },
          {
            label: "Drafts",
            value: ordered.filter((r) => !r.published).length,
          },
        ]}
      />

      {ordered.length === 0 ? (
        <div style={adminEmptyStyle(t)}>
          No FAQ entries yet. Create the first question to populate Help & FAQ.
        </div>
      ) : (
        <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
          <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
            <table className="fuel-admin-table" style={adminTableStyle()}>
              <thead>
                <tr>
                  {["", "Question", "Status", ""].map((h, i) => (
                    <th key={h || `col-${i}`} style={adminThStyle(t)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordered.map((r) => {
                  const isDragging = dragId === r.id;
                  const isOver = overId === r.id && dragId !== r.id;
                  return (
                    <tr
                      key={r.id}
                      draggable={!isPending}
                      onDragStart={(e) => onDragStart(e, r.id)}
                      onDragOver={(e) => onDragOver(e, r.id)}
                      onDragLeave={() => {
                        if (overId === r.id) setOverId(null);
                      }}
                      onDrop={(e) => onDrop(e, r.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverId(null);
                      }}
                      style={{
                        // Keep solid panel bg while dragging — never transparent.
                        background: isOver ? t.accentTint : t.panel,
                        outline: isDragging ? `2px solid ${t.accent}` : undefined,
                        outlineOffset: isDragging ? -2 : undefined,
                        opacity: 1,
                        cursor: isPending ? "default" : isDragging ? "grabbing" : "grab"}}
                    >
                      <td
                        style={{
                          ...adminTdStyle(t),
                          width: 44,
                          color: t.muted,
                          background: "inherit"}}
                        aria-hidden="true"
                      >
                        <span style={{ fontSize: 14, letterSpacing: 1 }} title="Drag to reorder">
                          ⋮⋮
                        </span>
                      </td>
                      <td style={{ ...adminTdStyle(t), background: "inherit" }}>
                        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
                          {r.question}
                        </div>
                        <div
                          style={{
                            fontFamily: t.sans,
                            fontSize: 11,
                            color: t.muted,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 480}}
                        >
                          {r.answer}
                        </div>
                      </td>
                      <td style={{ ...adminTdStyle(t), background: "inherit" }}>
                        <Chip t={t} tone={r.published ? "accent" : "ghost"}>
                          {r.published ? "Published" : "Draft"}
                        </Chip>
                      </td>
                      <td style={{ ...adminTdActionsStyle(t), background: "inherit" }}>
                        <button type="button" onClick={() => openEdit(r)} style={adminBtnStyle(t, "ghost")}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating ? <FaqModal t={t} row={editing} onClose={close} /> : null}
    </div>
  );
}

function FaqModal({
  t,
  row,
  onClose}: {
  t: Theme;
  row: FaqEntry | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: t.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200}}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-admin-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 24,
          width: "min(720px, 94vw)",
          maxHeight: "90vh",
          overflow: "auto"}}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16}}
        >
          <div
            id="faq-admin-modal-title"
            style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}
          >
            {row ? "Edit FAQ entry" : "New FAQ entry"}
          </div>
          <button type="button" onClick={onClose} style={adminBtnStyle(t, "ghost")}>
            Close
          </button>
        </div>

        <form
          action={(fd) =>
            startTransition(async () => {
              await upsertFaqEntryAction(fd);
              onClose();
            })
          }
          style={{ display: "grid", gap: 12 }}
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}

          <Row t={t} label="Question *">
            <input name="question" required defaultValue={row?.question ?? ""} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="Answer *">
            <FaqLinkedTextarea
              t={t}
              name="answer"
              required
              defaultValue={row?.answer ?? ""}
              minHeight={88}
            />
          </Row>
          <Row t={t} label="Points">
            <FaqLinkedTextarea
              t={t}
              name="points"
              defaultValue={formatFaqPointsText(row?.points ?? [])}
              placeholder={"One per line: Label — detail body (links OK in either side)"}
              minHeight={120}
              mono
            />
          </Row>
          <Row t={t} label="Footnote">
            <FaqLinkedTextarea
              t={t}
              name="footnote"
              defaultValue={row?.footnote ?? ""}
              minHeight={72}
            />
          </Row>
          <Row t={t} label="Published">
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: t.sans,
                fontSize: 13,
                color: t.inkSoft,
                paddingTop: 8}}
            >
              <input type="checkbox" name="published" defaultChecked={row?.published ?? false} />
              Visible on Help & FAQ
            </label>
          </Row>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8}}
          >
            {row ? (
              <button
                type="button"
                style={adminBtnStyle(t, "danger")}
                onClick={() => {
                  if (!confirm(`Delete “${row.question}”? This cannot be undone.`)) return;
                  const fd = new FormData();
                  fd.set("id", row.id);
                  startTransition(async () => {
                    await deleteFaqEntryAction(fd);
                    onClose();
                  });
                }}
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={isPending} style={adminBtnStyle(t, "primary")}>
              {isPending ? "Saving…" : row ? "Save changes" : "Create entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "start" }}>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 11,
          color: t.muted,
          paddingTop: 8,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 500}}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
