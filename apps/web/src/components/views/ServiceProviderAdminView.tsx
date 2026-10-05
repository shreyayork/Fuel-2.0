"use client";

import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { ServiceProvider } from "@/db/schema";
import { Chip, Label } from "../atoms";
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
  SERVICE_PROVIDER_CATEGORIES,
  SERVICE_PROVIDER_VISIBILITIES,
  categoryLabel} from "@/lib/service-providers-constants";
import { normalizeExternalHref } from "@/lib/service-provider-links";
import {
  upsertServiceProviderAction,
  deleteServiceProviderAction} from "@/app/(super-admin)/super-admin/service-providers/actions";



export function ServiceProviderAdminView({ rows }: { rows: ServiceProvider[] }) {
  const t = useTheme();
  const [editing, setEditing] = useState<ServiceProvider | null>(null);
  const [creating, setCreating] = useState(false);

  const openNew = () => {
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (row: ServiceProvider) => {
    setEditing(row);
    setCreating(true);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="fuel-admin-page" style={adminPageStyle()}>
      <AdminPageHeader
        t={t}
        title="Service providers"
        description="Curated directory — global for all users, or York-internal only."
        actions={
          <button onClick={openNew} style={adminBtnStyle(t, "primary")}>
            + New provider
          </button>
        }
      />

      <AdminStatsStrip
        t={t}
        items={[
          { label: "Providers", value: rows.length },
          {
            label: "Global",
            value: rows.filter((r) => r.visibility === "global").length,
          },
          {
            label: "York-internal",
            value: rows.filter((r) => r.visibility === "internal").length,
          },
          {
            label: "Categories",
            value: new Set(rows.map((r) => r.category).filter(Boolean)).size,
          },
        ]}
      />

      {rows.length === 0 ? (
        <div style={adminEmptyStyle(t)}>No service providers curated yet.</div>
      ) : (
        <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
          <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
            <table className="fuel-admin-table" style={adminTableStyle()}>
              <thead>
                <tr>
                  {["Name", "Category", "Visibility", "Website", "Tags", ""].map((h) => (
                    <th key={h} style={adminThStyle(t)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const websiteHref = normalizeExternalHref(r.website);
                  return (
                    <tr key={r.id}>
                      <td style={adminTdStyle(t)}>
                        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
                          {r.name}
                        </div>
                        {r.description ? (
                          <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
                            {r.description.slice(0, 80)}
                            {r.description.length > 80 ? "…" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td style={adminTdStyle(t)}>
                        <Chip t={t} tone="ghost">{categoryLabel(r.category)}</Chip>
                      </td>
                      <td style={adminTdStyle(t)}>
                        <Chip t={t} tone={r.visibility === "internal" ? "accent" : "ghost"}>
                          {r.visibility}
                        </Chip>
                      </td>
                      <td style={adminTdStyle(t)}>
                        {websiteHref ? (
                          <a
                            href={websiteHref}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: t.accent, textDecoration: "none", fontFamily: t.mono, fontSize: 11 }}
                          >
                            {r.domain ?? r.website}
                          </a>
                        ) : (
                          <span style={{ color: t.mutedSoft }}>—</span>
                        )}
                      </td>
                      <td style={adminTdStyle(t)}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(r.tags ?? []).slice(0, 3).map((tag) => (
                            <Chip key={tag} t={t} tone="ghost">{tag}</Chip>
                          ))}
                        </div>
                      </td>
                      <td style={adminTdActionsStyle(t)}>
                        <button onClick={() => openEdit(r)} style={adminBtnStyle(t, "ghost")}>
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

      {creating ? <ProviderModal t={t} row={editing} onClose={close} /> : null}
    </div>
  );
}


function ProviderModal({
  t,
  row,
  onClose}: {
  t: Theme;
  row: ServiceProvider | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

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
        zIndex: 200}}
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
          overflow: "auto"}}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}>
            {row ? `Edit ${row.name}` : "New service provider"}
          </div>
          <button onClick={onClose} style={adminBtnStyle(t, "ghost")}>
            Close
          </button>
        </div>

        <form
          action={(fd) =>
            startTransition(async () => {
              await upsertServiceProviderAction(fd);
              onClose();
            })
          }
          style={{ display: "grid", gap: 12 }}
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}

          <Row t={t} label="Name *">
            <input name="name" required defaultValue={row?.name ?? ""} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="Category *">
            <select name="category" required defaultValue={row?.category ?? ""} style={adminInputStyle(t)}>
              <option value="" disabled>
                Pick a category…
              </option>
              {SERVICE_PROVIDER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </Row>
          <Row t={t} label="Visibility">
            <select name="visibility" defaultValue={row?.visibility ?? "global"} style={adminInputStyle(t)}>
              {SERVICE_PROVIDER_VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Row>
          <Row t={t} label="Domain">
            <input name="domain" defaultValue={row?.domain ?? ""} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="Website">
            <input name="website" defaultValue={row?.website ?? ""} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="Logo URL">
            <input name="logoUrl" defaultValue={row?.logoUrl ?? ""} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="LinkedIn URL">
            <input name="linkedinUrl" defaultValue={row?.linkedinUrl ?? ""} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="Tags (comma-separated)">
            <input name="tags" defaultValue={(row?.tags ?? []).join(", ")} style={adminInputStyle(t)} />
          </Row>
          <Row t={t} label="Description">
            <textarea name="description" defaultValue={row?.description ?? ""} style={adminInputStyle(t, { multiline: true })} />
          </Row>
          <Row t={t} label="Admin notes">
            <textarea name="notes" defaultValue={row?.notes ?? ""} style={adminInputStyle(t, { multiline: true })} />
          </Row>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            {row ? (
              <form
                action={(fd) =>
                  startTransition(async () => {
                    await deleteServiceProviderAction(fd);
                    onClose();
                  })
                }
              >
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  style={adminBtnStyle(t, "danger")}
                  onClick={(e) => {
                    if (!confirm(`Delete ${row.name}? This cannot be undone.`)) e.preventDefault();
                  }}
                >
                  Delete
                </button>
              </form>
            ) : (
              <span />
            )}
            <button type="submit" disabled={isPending} style={adminBtnStyle(t, "primary")}>
              {isPending ? "Saving…" : row ? "Save changes" : "Create provider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "start" }}>
      <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, paddingTop: 8, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

// Keep the Label import useful so unused-var lint stays happy if someone deletes
// the only consumer later.
void Label;
