"use client";

import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { Signal } from "@/db/schema";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  upsertSignalAction,
  deleteSignalAction,
} from "@/app/(super-admin)/super-admin/signals/actions";

const KINDS = ["quantitative", "qualitative", "boolean"] as const;
const UNITS = ["usd", "pct", "months", "count", "ratio", "days", "score"] as const;
type Kind = (typeof KINDS)[number];

function button(t: Theme, variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties {
  const map = {
    primary: { bg: t.ink, color: t.bg, border: t.ink },
    ghost: { bg: "transparent", color: t.inkSoft, border: t.rule },
    danger: { bg: "transparent", color: t.warn, border: t.warn },
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
    minHeight: multiline ? 72 : undefined,
    resize: multiline ? "vertical" : undefined,
  };
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

export function SignalAdminView({ rows }: { rows: Signal[] }) {
  const t = useTheme();
  const [editing, setEditing] = useState<Signal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row: Signal) => {
    setEditing(row);
    setModalOpen(true);
  };
  const close = () => {
    setEditing(null);
    setModalOpen(false);
  };

  // Group rows by category for scannability.
  const byCategory = new Map<string, Signal[]>();
  for (const r of rows) {
    const arr = byCategory.get(r.category) ?? [];
    arr.push(r);
    byCategory.set(r.category, arr);
  }
  const categories = Array.from(byCategory.keys()).sort();

  return (
    <div>
      <SectionHead
        t={t}
        title="Signals · Admin"
        subtitle="The global signal catalog. Every context ingest extracts observations against these."
        right={
          <button onClick={openNew} style={button(t, "primary")}>
            + New signal
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
          No signals defined yet.
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} style={{ marginTop: 18 }}>
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 600,
                color: t.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              {cat}
            </div>
            <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Signal", "ID", "Kind", "Unit", "Better", "Order", ""].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          fontFamily: t.sans,
                          fontSize: 10,
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
                  {(byCategory.get(cat) ?? []).map((r) => (
                    <tr key={r.id}>
                      <td style={cellBase(t)}>
                        <div
                          style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}
                        >
                          {r.label}
                        </div>
                        {r.description ? (
                          <div
                            style={{
                              fontFamily: t.sans,
                              fontSize: 11,
                              color: t.muted,
                              marginTop: 2,
                            }}
                          >
                            {r.description.slice(0, 100)}
                            {r.description.length > 100 ? "…" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ ...cellBase(t), fontFamily: t.mono, fontSize: 11 }}>{r.id}</td>
                      <td style={cellBase(t)}>
                        <Chip t={t} tone={r.kind === "quantitative" ? "accent" : "ghost"}>
                          {r.kind}
                        </Chip>
                      </td>
                      <td style={cellBase(t)}>{r.unit ?? <span style={{ color: t.mutedSoft }}>—</span>}</td>
                      <td style={cellBase(t)}>
                        {r.kind === "quantitative"
                          ? r.invertedGood
                            ? "lower"
                            : "higher"
                          : <span style={{ color: t.mutedSoft }}>—</span>}
                      </td>
                      <td style={cellBase(t)}>{r.displayOrder}</td>
                      <td style={{ ...cellBase(t), textAlign: "right" }}>
                        <button onClick={() => openEdit(r)} style={button(t, "ghost")}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {modalOpen ? <SignalModal t={t} row={editing} onClose={close} /> : null}
    </div>
  );
}

function SignalModal({
  t,
  row,
  onClose,
}: {
  t: Theme;
  row: Signal | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>(row?.kind ?? "quantitative");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
        zIndex: 100,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        action={(fd) =>
          startTransition(async () => {
            await upsertSignalAction(fd);
            onClose();
          })
        }
        style={{
          width: "100%",
          maxWidth: 560,
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 22,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>
          {row ? "Edit signal" : "New signal"}
        </div>
        <Field t={t} label="ID (stable slug — don't change once in use)">
          <input
            name="id"
            defaultValue={row?.id ?? ""}
            readOnly={!!row}
            placeholder="e.g. arr_usd"
            required
            style={{
              ...input(t),
              fontFamily: t.mono,
              opacity: row ? 0.7 : 1,
            }}
          />
        </Field>
        <Field t={t} label="Label">
          <input name="label" defaultValue={row?.label ?? ""} required style={input(t)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field t={t} label="Kind">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              style={input(t)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field t={t} label="Category">
            <input
              name="category"
              defaultValue={row?.category ?? ""}
              placeholder="growth / retention / …"
              required
              style={input(t)}
            />
          </Field>
        </div>
        {kind === "quantitative" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field t={t} label="Unit">
              <select name="unit" defaultValue={row?.unit ?? ""} style={input(t)}>
                <option value="">—</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
            <Field t={t} label="Display order">
              <input
                name="displayOrder"
                type="number"
                defaultValue={row?.displayOrder ?? 0}
                style={input(t)}
              />
            </Field>
            <Field t={t} label="Direction">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: t.inkSoft,
                  padding: "8px 0",
                }}
              >
                <input
                  type="checkbox"
                  name="invertedGood"
                  defaultChecked={row?.invertedGood ?? false}
                />
                Lower is better
              </label>
            </Field>
          </div>
        ) : (
          <Field t={t} label="Display order">
            <input
              name="displayOrder"
              type="number"
              defaultValue={row?.displayOrder ?? 0}
              style={input(t)}
            />
          </Field>
        )}
        <Field t={t} label="Description">
          <textarea
            name="description"
            defaultValue={row?.description ?? ""}
            style={input(t, true)}
          />
        </Field>
        <Field
          t={t}
          label="Extraction hint (prompt note that helps Claude disambiguate)"
        >
          <textarea
            name="extractionHint"
            defaultValue={row?.extractionHint ?? ""}
            style={input(t, true)}
          />
        </Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          {row ? (
            <DeleteButton t={t} id={row.id} onDone={onClose} />
          ) : null}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={button(t, "ghost")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} style={button(t, "primary")}>
            {pending ? "Saving…" : row ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 10,
          fontWeight: 600,
          color: t.muted,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function DeleteButton({ t, id, onDone }: { t: Theme; id: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          await deleteSignalAction(fd);
          onDone();
        })
      }
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        style={button(t, "danger")}
        onClick={(e) => {
          if (!confirm(`Delete signal "${id}"? Observations referencing it will be cascaded.`)) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
