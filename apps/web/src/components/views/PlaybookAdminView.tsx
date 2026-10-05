"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { Playbook } from "@/db/schema";
import {
  ADMIN_PLAYBOOK_CATEGORIES,
  PLAYBOOK_MODES,
  PLAYBOOK_TARGET_KINDS} from "@/lib/playbooks-constants";
import { Chip, Tabs, type TabItem } from "../atoms";
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
  deletePlaybookAction,
  restorePlaybookAction,
  upsertPlaybookAction} from "@/app/(super-admin)/super-admin/playbooks/actions";

const ALL_TAB = "all";
const SYSTEM_TAB = "__system";




type PlaybookAdminRow = Omit<Playbook, "embedding">;

function countByCategory(rows: PlaybookAdminRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.category, (map.get(r.category) ?? 0) + 1);
  }
  return map;
}

export function PlaybookAdminView({ rows }: { rows: PlaybookAdminRow[] }) {
  const t = useTheme();
  const [editing, setEditing] = useState<PlaybookAdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState(ALL_TAB);

  const openNew = () => {
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (row: PlaybookAdminRow) => {
    setEditing(row);
    setCreating(true);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const systemRows = rows.filter((r) => r.isSystem);
  const catalogRows = rows.filter((r) => !r.isSystem);
  const counts = countByCategory(catalogRows);
  const categoryKeys = [
    ...ADMIN_PLAYBOOK_CATEGORIES.filter((c) => c !== "System" && counts.has(c)),
    ...Array.from(counts.keys())
      .filter(
        (c) =>
          c !== "System" &&
          !(ADMIN_PLAYBOOK_CATEGORIES as readonly string[]).includes(c),
      )
      .sort(),
  ];

  const tabItems: TabItem[] = [
    { key: ALL_TAB, label: "All", count: rows.length },
    {
      key: SYSTEM_TAB,
      label: "System prompts",
      count: systemRows.length},
    ...categoryKeys.map((c) => ({ key: c, label: c, count: counts.get(c) ?? 0 })),
  ];

  const categoryTabValid = categoryKeys.includes(
    activeTab as (typeof categoryKeys)[number],
  );
  const resolvedTab =
    activeTab === ALL_TAB || activeTab === SYSTEM_TAB || categoryTabValid
      ? activeTab
      : ALL_TAB;

  const visibleRows =
    resolvedTab === ALL_TAB
      ? rows
      : resolvedTab === SYSTEM_TAB
        ? systemRows
        : catalogRows.filter((r) => r.category === resolvedTab);

  return (
    <div className="fuel-admin-page" style={adminPageStyle()}>
      <AdminPageHeader
        t={t}
        title="Playbooks"
        description="York IE frameworks and system prompts. Soft-deleted rows leave the user catalog."
        actions={
          <button onClick={openNew} style={adminBtnStyle(t, "primary")}>
            + New playbook
          </button>
        }
      />

      <AdminStatsStrip
        t={t}
        items={[
          { label: "Catalog", value: catalogRows.length },
          { label: "System", value: systemRows.length },
          {
            label: "Soft-deleted",
            value: rows.filter((r) => r.deletedAt).length,
          },
          { label: "Categories", value: counts.size },
        ]}
      />

      {rows.length === 0 ? (
        <div style={adminEmptyStyle(t)}>No global playbooks yet.</div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Tabs t={t} items={tabItems} active={resolvedTab} onChange={setActiveTab} />
          </div>

          {visibleRows.length === 0 ? (
            <div style={adminEmptyStyle(t)}>
              No playbooks in this category.
                {resolvedTab === SYSTEM_TAB
                  ? " Run npm run db:seed:libs (or npm run db:seed) to upsert system prompts."
                  : ""}
            </div>
          ) : (
            <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
              <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
                <table className="fuel-admin-table" style={adminTableStyle()}>
                  <thead>
                    <tr>
                      {(resolvedTab === ALL_TAB
                        ? ["Title", "Category", "Subcategory", "Mode", "Target", "Slug", "Status", ""]
                        : ["Title", "Subcategory", "Mode", "Target", "Slug", "Status", ""]
                      ).map((h) => (
                        <th key={h || "actions"} style={adminThStyle(t)}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const deleted = !!r.deletedAt;
                      return (
                        <tr key={r.id} style={deleted ? { opacity: 0.55 } : undefined}>
                          <td style={adminTdStyle(t)}>
                            <div
                              style={{
                                fontFamily: t.sans,
                                fontSize: 13,
                                fontWeight: 600,
                                color: t.ink,
                                textDecoration: deleted ? "line-through" : undefined}}
                            >
                              {r.title}
                            </div>
                            <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
                              {r.description.slice(0, 100)}
                              {r.description.length > 100 ? "…" : ""}
                            </div>
                          </td>
                          {resolvedTab === ALL_TAB ? (
                            <td style={adminTdStyle(t)}>
                              <Chip t={t} tone="ghost">{r.category}</Chip>
                            </td>
                          ) : null}
                          <td style={adminTdStyle(t)}>{r.subcategory ?? "—"}</td>
                          <td style={adminTdStyle(t)}>
                            <Chip t={t} tone={r.mode === "guided" ? "accent" : "ghost"}>
                              {r.mode}
                            </Chip>
                          </td>
                          <td style={adminTdStyle(t)}>{r.targetKind ?? "—"}</td>
                          <td style={adminTdStyle(t, { mono: true })}>{r.slug}</td>
                          <td style={adminTdStyle(t)}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <Chip t={t} tone={deleted ? "warn" : "ghost"}>
                                {deleted ? "deleted" : "active"}
                              </Chip>
                              {r.isSystem ? (
                                <Chip t={t} tone="accent">system</Chip>
                              ) : null}
                            </div>
                          </td>
                          <td style={adminTdActionsStyle(t)}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {deleted ? (
                                <RestoreButton t={t} row={r} />
                              ) : (
                                <button onClick={() => openEdit(r)} style={adminBtnStyle(t, "ghost")}>
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {creating ? <PlaybookModal t={t} row={editing} onClose={close} /> : null}
    </div>
  );
}

function RestoreButton({ t, row }: { t: Theme; row: PlaybookAdminRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        disabled={isPending}
        style={adminBtnStyle(t, "ghost")}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const fd = new FormData();
            fd.set("id", row.id);
            fd.set("slug", row.slug);
            const result = await restorePlaybookAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {isPending ? "Restoring…" : "Restore"}
      </button>
      {error ? (
        <span style={{ fontFamily: t.sans, fontSize: 11, color: t.warn }}>{error}</span>
      ) : null}
    </div>
  );
}

function PlaybookModal({
  t,
  row,
  onClose}: {
  t: Theme;
  row: PlaybookAdminRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"chat" | "guided">(
    row?.mode === "guided" ? "guided" : "chat",
  );

  const stepsDefault =
    row?.steps && row.mode === "guided"
      ? JSON.stringify(row.steps, null, 2)
      : "";

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
          width: "min(820px, 94vw)",
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
          <div style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}>
            {row ? `Edit ${row.title}` : "New playbook"}
          </div>
          <button onClick={onClose} style={adminBtnStyle(t, "ghost")}>
            Close
          </button>
        </div>

        <form
          action={(fd) =>
            startTransition(async () => {
              setError(null);
              const result = await upsertPlaybookAction(fd);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
              onClose();
            })
          }
          style={{ display: "grid", gap: 12 }}
        >
          {row ? (
            <>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="slug" value={row.slug} />
            </>
          ) : null}

          <Row t={t} label="Title *">
            <input name="title" required defaultValue={row?.title ?? ""} style={adminInputStyle(t)} />
          </Row>

          {!row ? (
            <Row t={t} label="Slug *">
              <input
                name="slug"
                required
                placeholder="kebab-case-slug"
                style={{ ...adminInputStyle(t), fontFamily: t.mono }}
              />
            </Row>
          ) : (
            <Row t={t} label="Slug">
              <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, paddingTop: 8 }}>
                {row.slug}
              </div>
            </Row>
          )}

          <Row t={t} label="Category *">
            <select name="category" required defaultValue={row?.category ?? ""} style={adminInputStyle(t)}>
              <option value="" disabled>
                Pick a category…
              </option>
              {ADMIN_PLAYBOOK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Row>

          <Row t={t} label="Subcategory">
            <input name="subcategory" defaultValue={row?.subcategory ?? ""} style={adminInputStyle(t)} />
          </Row>

          <Row t={t} label="Mode">
            <select
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value === "guided" ? "guided" : "chat")}
              style={adminInputStyle(t)}
            >
              {PLAYBOOK_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Row>

          <Row t={t} label="Target kind">
            <select name="targetKind" defaultValue={row?.targetKind ?? ""} style={adminInputStyle(t)}>
              <option value="">None</option>
              {PLAYBOOK_TARGET_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Row>

          <Row t={t} label="Tags (comma-separated)">
            <input name="tags" defaultValue={(row?.tags ?? []).join(", ")} style={adminInputStyle(t)} />
          </Row>

          <Row t={t} label="Description *">
            <textarea
              name="description"
              required
              defaultValue={row?.description ?? ""}
              style={adminInputStyle(t, { multiline: true })}
            />
          </Row>

          <Row t={t} label="Content (markdown) *">
            <textarea
              name="content"
              required
              defaultValue={row?.content ?? ""}
              style={{ ...adminInputStyle(t, { multiline: true }), minHeight: 200, fontFamily: t.mono, fontSize: 12 }}
            />
          </Row>

          {mode === "guided" ? (
            <Row t={t} label="Steps (JSON) *">
              <textarea
                name="steps"
                required
                defaultValue={stepsDefault}
                placeholder='[{"id":"step-1","label":"…","fields":[…]}]'
                style={{ ...adminInputStyle(t, { multiline: true }), minHeight: 160, fontFamily: t.mono, fontSize: 11 }}
              />
            </Row>
          ) : (
            <input type="hidden" name="steps" value="" />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
              gap: 12}}
          >
            {row && !row.deletedAt ? (
              <button
                type="button"
                style={adminBtnStyle(t, "danger")}
                disabled={isPending}
                onClick={() => {
                  if (!confirm(`Soft-delete ${row.title}? It will disappear from the catalog.`)) return;
                  startTransition(async () => {
                    setError(null);
                    const fd = new FormData();
                    fd.set("id", row.id);
                    fd.set("slug", row.slug);
                    const result = await deletePlaybookAction(fd);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    router.refresh();
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
              {isPending ? "Saving…" : row ? "Save changes" : "Create playbook"}
            </button>
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                fontFamily: t.sans,
                fontSize: 12,
                color: t.warn,
                padding: "8px 10px",
                background: `${t.warn}14`,
                border: `1px solid ${t.warn}`,
                borderRadius: 6}}
            >
              {error}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function Row({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "start" }}>
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
