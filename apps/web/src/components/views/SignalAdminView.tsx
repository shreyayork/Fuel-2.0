"use client";

import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { Signal } from "@/db/schema";
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
import {
  upsertSignalAction,
  deleteSignalAction} from "@/app/(super-admin)/super-admin/signals/actions";

const KINDS = ["quantitative", "qualitative", "boolean"] as const;
const UNITS = ["usd", "pct", "months", "count", "ratio", "days", "score"] as const;
type Kind = (typeof KINDS)[number];




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
  const kinds = new Map<string, number>();
  for (const r of rows) {
    kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);
  }

  return (
    <div className="fuel-admin-page" style={adminPageStyle()}>
      <AdminPageHeader
        t={t}
        title="Signals"
        description="Global metrics and observations extracted from every context item."
        actions={
          <button onClick={openNew} style={adminBtnStyle(t, "primary")}>
            + New signal
          </button>
        }
      />

      <AdminStatsStrip
        t={t}
        items={[
          { label: "Signals", value: rows.length },
          { label: "Categories", value: categories.length },
          {
            label: "Kinds",
            value: kinds.size,
            footnote: Array.from(kinds.entries())
              .map(([k, n]) => `${k} ${n}`)
              .slice(0, 3)
              .join(" · "),
          },
        ]}
      />

      {rows.length === 0 ? (
        <div style={adminEmptyStyle(t)}>No signals defined yet.</div>
      ) : (
        categories.map((cat) => (
          <div key={cat} style={{ marginTop: 18 }}>
            <div style={adminSectionLabelStyle(t)}>{cat}</div>
            <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
              <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
                <table className="fuel-admin-table" style={adminTableStyle()}>
                  <thead>
                    <tr>
                      {["Signal", "ID", "Kind", "Unit", "Better", "Order", ""].map((h) => (
                        <th
                          key={h}
                          style={adminThStyle(t, h === "Order" ? { numeric: true } : undefined)}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(byCategory.get(cat) ?? []).map((r) => (
                      <tr key={r.id}>
                        <td style={adminTdStyle(t)}>
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
                                marginTop: 2}}
                            >
                              {r.description.slice(0, 100)}
                              {r.description.length > 100 ? "…" : ""}
                            </div>
                          ) : null}
                        </td>
                        <td style={adminTdStyle(t, { mono: true })}>{r.id}</td>
                        <td style={adminTdStyle(t)}>
                          <Chip t={t} tone={r.kind === "quantitative" ? "accent" : "ghost"}>
                            {r.kind}
                          </Chip>
                        </td>
                        <td style={adminTdStyle(t)}>{r.unit ?? <span style={{ color: t.mutedSoft }}>—</span>}</td>
                        <td style={adminTdStyle(t)}>
                          {r.kind === "quantitative"
                            ? r.invertedGood
                              ? "lower"
                              : "higher"
                            : <span style={{ color: t.mutedSoft }}>—</span>}
                        </td>
                        <td style={adminTdStyle(t, { numeric: true })}>{r.displayOrder}</td>
                        <td style={adminTdActionsStyle(t)}>
                          <button onClick={() => openEdit(r)} style={adminBtnStyle(t, "ghost")}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
  onClose}: {
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
        zIndex: 100}}
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
          gap: 12}}
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
              ...adminInputStyle(t),
              fontFamily: t.mono,
              opacity: row ? 0.7 : 1}}
          />
        </Field>
        <Field t={t} label="Label">
          <input name="label" defaultValue={row?.label ?? ""} required style={adminInputStyle(t)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field t={t} label="Kind">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              style={adminInputStyle(t)}
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
              style={adminInputStyle(t)}
            />
          </Field>
        </div>
        {kind === "quantitative" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field t={t} label="Unit">
              <select name="unit" defaultValue={row?.unit ?? ""} style={adminInputStyle(t)}>
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
                style={adminInputStyle(t)}
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
                  padding: "8px 0"}}
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
              style={adminInputStyle(t)}
            />
          </Field>
        )}
        <Field t={t} label="Description">
          <textarea
            name="description"
            defaultValue={row?.description ?? ""}
            style={adminInputStyle(t, { multiline: true })}
          />
        </Field>
        <Field
          t={t}
          label="Extraction hint (prompt note that helps Claude disambiguate)"
        >
          <textarea
            name="extractionHint"
            defaultValue={row?.extractionHint ?? ""}
            style={adminInputStyle(t, { multiline: true })}
          />
        </Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          {row ? (
            <DeleteButton t={t} id={row.id} onDone={onClose} />
          ) : null}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={adminBtnStyle(t, "ghost")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} style={adminBtnStyle(t, "primary")}>
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
          letterSpacing: "0.04em"}}
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
        style={adminBtnStyle(t, "danger")}
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
