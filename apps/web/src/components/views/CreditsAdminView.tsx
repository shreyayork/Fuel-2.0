"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Theme } from "@/lib/theme";
import type { CreditActionCost, CreditPlan, TopupPack } from "@/db/schema";
import { Chip, SectionHead, Tabs, type TabItem } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  deleteActionCostAction,
  deleteTopupPackAction,
  restoreActionCostAction,
  restoreTopupPackAction,
  upsertActionCostAction,
  upsertCreditPlanAction,
  upsertTopupPackAction,
} from "@/app/(super-admin)/super-admin/credits/actions";
import type { CreditCatalogFlow } from "@/lib/credits/catalog-flow";
import { creditsPerBlock, PROFILE_EARN_BLOCK_COUNT } from "@/lib/credits/profile-modules";
import {
  formatUsdFromCents,
  resolveStrikePrice,
} from "@/lib/credits/admin-price-display";
import { creditBillingPriceStruck } from "@/components/credits/styles";
import {
  CREDIT_ACTION_TYPES,
  INTEGRATION_SYNC_ACTIONS,
  INTEGRATION_SYNC_ACTION_SLUGS,
} from "@/lib/credits/constants";

const CATALOG_SLUG_PATTERN = "[a-z][a-z0-9-]{1,62}";

type Section = "plans" | "actions" | "topups";

/** Admin catalog: ~~list~~ final when list > final; else single final. */
function AdminStrikePrice({
  t,
  listCents,
  finalCents,
  fractionDigits = 2,
}: {
  t: Theme;
  listCents: number | null | undefined;
  finalCents: number | null | undefined;
  fractionDigits?: 0 | 2;
}) {
  const resolved = resolveStrikePrice(listCents, finalCents);
  if (resolved.finalCents == null) return <>{"—"}</>;
  if (resolved.showStrike) {
    return (
      <>
        <span style={creditBillingPriceStruck(t)}>
          {formatUsdFromCents(resolved.listCents, fractionDigits)}
        </span>
        <strong style={{ color: t.ink, fontWeight: 600 }}>
          {formatUsdFromCents(resolved.finalCents, fractionDigits)}
        </strong>
      </>
    );
  }
  return <>{formatUsdFromCents(resolved.finalCents, fractionDigits)}</>;
}

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
    minHeight: multiline ? 80 : undefined,
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

function th(t: Theme): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "10px 12px",
    fontFamily: t.sans,
    fontSize: 10,
    color: t.muted,
    borderBottom: `1px solid ${t.rule}`,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

function Row({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "start" }}>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 11,
          color: t.muted,
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

function ModalShell({
  t,
  title,
  onClose,
  children,
}: {
  t: Theme;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
          width: "min(640px, 94vw)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}>
            {title}
          </div>
          <button type="button" onClick={onClose} style={button(t, "ghost")}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CreditsAdminView({
  plans,
  actionCosts,
  topups,
}: {
  plans: CreditPlan[];
  actionCosts: CreditActionCost[];
  topups: TopupPack[];
}) {
  const t = useTheme();
  const [flow, setFlow] = useState<CreditCatalogFlow>("founder");
  const [section, setSection] = useState<Section>("plans");
  const [editingPlan, setEditingPlan] = useState<CreditPlan | null>(null);
  const [editingAction, setEditingAction] = useState<CreditActionCost | null>(null);
  const [creatingAction, setCreatingAction] = useState(false);
  const [editingTopup, setEditingTopup] = useState<TopupPack | null>(null);
  const [creatingTopup, setCreatingTopup] = useState(false);

  const flowPlans = plans.filter((row) => row.flow === flow);
  const flowActions = actionCosts.filter((row) => row.flow === flow);
  const flowTopups = topups.filter((row) => row.flow === flow);
  const usedActionSlugs = new Set(flowActions.map((row) => row.actionSlug));
  const availableActionSlugs = CREDIT_ACTION_TYPES.filter((slug) => !usedActionSlugs.has(slug));

  const closeEditors = () => {
    setEditingPlan(null);
    setEditingAction(null);
    setCreatingAction(false);
    setEditingTopup(null);
    setCreatingTopup(false);
  };

  const flowTabs: TabItem[] = [
    { key: "founder", label: "Founder" },
    { key: "investor", label: "Investor" },
  ];

  const tabs: TabItem[] = [
    { key: "plans", label: "Plans", count: flowPlans.length },
    { key: "actions", label: "Action costs", count: flowActions.length },
    { key: "topups", label: "Top-ups", count: flowTopups.length },
  ];

  return (
    <div>
      <SectionHead
        t={t}
        title="Credits · Admin"
        subtitle="Founder and Investor catalogs are edited separately. Soft-delete hides a row from that flow only. Sync to Stripe creates new Prices when amounts change."
        right={
          section === "actions" && availableActionSlugs.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setEditingAction(null);
                setCreatingAction(true);
              }}
              style={button(t, "primary")}
            >
              + Action cost
            </button>
          ) : section === "topups" ? (
            <button
              type="button"
              onClick={() => {
                setEditingTopup(null);
                setCreatingTopup(true);
              }}
              style={button(t, "primary")}
            >
              + Top-up pack
            </button>
          ) : null
        }
      />

      <div style={{ marginBottom: 12 }}>
        <Tabs
          t={t}
          items={flowTabs}
          active={flow}
          onChange={(key) => {
            setFlow(key as CreditCatalogFlow);
            closeEditors();
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs
          t={t}
          items={tabs}
          active={section}
          onChange={(key) => setSection(key as Section)}
        />
      </div>

      {section === "plans" ? (
        <PlansTable t={t} rows={flowPlans} onEdit={setEditingPlan} />
      ) : null}
      {section === "actions" ? (
        <>
          <IntegrationSyncCostsPanel key={flow} t={t} flow={flow} rows={flowActions} />
          <div style={{ height: 16 }} />
          <ActionsTable
            t={t}
            flow={flow}
            rows={flowActions.filter((r) => !INTEGRATION_SYNC_ACTION_SLUGS.has(r.actionSlug))}
            onEdit={(row) => {
              setEditingAction(row);
              setCreatingAction(true);
            }}
          />
        </>
      ) : null}
      {section === "topups" ? (
        <TopupsTable
          t={t}
          flow={flow}
          rows={flowTopups}
          onEdit={(row) => {
            setEditingTopup(row);
            setCreatingTopup(true);
          }}
        />
      ) : null}

      {editingPlan ? (
        <PlanModal t={t} row={editingPlan} onClose={() => setEditingPlan(null)} />
      ) : null}
      {creatingAction ? (
        <ActionModal
          t={t}
          flow={flow}
          row={editingAction}
          availableSlugs={availableActionSlugs}
          onClose={() => {
            setEditingAction(null);
            setCreatingAction(false);
          }}
        />
      ) : null}
      {creatingTopup ? (
        <TopupModal
          t={t}
          flow={flow}
          row={editingTopup}
          onClose={() => {
            setEditingTopup(null);
            setCreatingTopup(false);
          }}
        />
      ) : null}
    </div>
  );
}

function PlansTable({
  t,
  rows,
  onEdit,
}: {
  t: Theme;
  rows: CreditPlan[];
  onEdit: (row: CreditPlan) => void;
}) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Plan", "Monthly / daily", "Fee (mo / yr)", "Stripe prices", ""].map((h) => (
              <th key={h || "actions"} style={th(t)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.flow}:${r.slug}`}>
              <td style={cellBase(t)}>
                <div style={{ fontWeight: 600, color: t.ink }}>{r.displayName}</div>
                <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{r.slug}</div>
              </td>
              <td style={cellBase(t)}>
                {r.monthlyLimit} / {r.dailyLimit}
              </td>
              <td style={cellBase(t)}>
                {r.monthlyPriceCents != null || r.annualPriceCents != null ? (
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
                    <AdminStrikePrice
                      t={t}
                      listCents={r.listPriceCents}
                      finalCents={r.monthlyPriceCents}
                      fractionDigits={0}
                    />
                    <span style={{ color: t.muted }}>/</span>
                    <AdminStrikePrice
                      t={t}
                      listCents={r.annualListPriceCents}
                      finalCents={r.annualPriceCents}
                      fractionDigits={0}
                    />
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td style={{ ...cellBase(t), fontFamily: t.mono, fontSize: 11 }}>
                <div>{r.stripeMonthlyPriceId ?? "—"}</div>
                <div style={{ color: t.muted }}>{r.stripeAnnualPriceId ?? "—"}</div>
              </td>
              <td style={cellBase(t)}>
                <button type="button" style={button(t, "ghost")} onClick={() => onEdit(r)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegrationSyncCostsPanel({
  t,
  flow,
  rows,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  rows: CreditActionCost[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const bySlug = new Map(rows.map((r) => [r.actionSlug, r]));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      for (const def of INTEGRATION_SYNC_ACTIONS) {
        const raw = fd.get(`cost_${def.action}`);
        const cost = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
        if (!Number.isInteger(cost) || cost < 0) {
          setError("Integration sync costs must be non-negative integers.");
          return;
        }
        const existing = bySlug.get(def.action);
        const actionFd = new FormData();
        actionFd.set("flow", flow);
        actionFd.set("actionSlug", def.action);
        actionFd.set("label", existing?.label ?? def.label);
        actionFd.set("cost", String(cost));
        const result = await upsertActionCostAction(actionFd);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 6,
        padding: 16,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>
          Integration Sync Credits
        </div>
        <p style={{ margin: "4px 0 0", fontFamily: t.sans, fontSize: 12, color: t.muted }}>
          Credits consumed per HubSpot / Granola / Slack sync or reconciliation run. Set to 0 to
          make free and hide from the per-activity credit dialog.
        </p>
      </div>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {INTEGRATION_SYNC_ACTIONS.map((def) => {
          const row = bySlug.get(def.action);
          return (
            <Row t={t} key={def.action} label={def.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  name={`cost_${def.action}`}
                  type="number"
                  required
                  min={0}
                  step={1}
                  defaultValue={row?.cost ?? 0}
                  style={{ ...input(t), maxWidth: 120 }}
                />
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                  {def.action}
                </span>
              </div>
            </Row>
          );
        })}
        {error ? (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.warn }}>{error}</div>
        ) : null}
        {saved ? (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.positive }}>Saved.</div>
        ) : null}
        <div>
          <button type="submit" disabled={pending} style={button(t, "primary")}>
            {pending ? "Saving…" : "Save integration costs"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionsTable({
  t,
  flow,
  rows,
  onEdit,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  rows: CreditActionCost[];
  onEdit: (row: CreditActionCost) => void;
}) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Action", "Label", "Cost", "Status", ""].map((h) => (
              <th key={h || "actions"} style={th(t)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const inactive = !r.active;
            return (
              <tr key={`${flow}:${r.actionSlug}`} style={inactive ? { opacity: 0.55 } : undefined}>
                <td style={{ ...cellBase(t), fontFamily: t.mono, fontSize: 12 }}>{r.actionSlug}</td>
                <td style={cellBase(t)}>{r.label}</td>
                <td style={cellBase(t)}>{r.cost}</td>
                <td style={cellBase(t)}>
                  <Chip t={t} tone={inactive ? "warn" : "positive"}>
                    {inactive ? "Inactive" : "Active"}
                  </Chip>
                </td>
                <td style={cellBase(t)}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" style={button(t, "ghost")} onClick={() => onEdit(r)}>
                      Edit
                    </button>
                    {inactive ? (
                      <RestoreActionButton t={t} flow={flow} slug={r.actionSlug} />
                    ) : (
                      <DeleteActionButton t={t} flow={flow} slug={r.actionSlug} label={r.label} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TopupsTable({
  t,
  flow,
  rows,
  onEdit,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  rows: TopupPack[];
  onEdit: (row: TopupPack) => void;
}) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Pack", "Credits", "Price", "Discount", "Stripe", "Status", ""].map((h) => (
              <th key={h || "actions"} style={th(t)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const inactive = !r.active;
            return (
              <tr key={`${flow}:${r.slug}`} style={inactive ? { opacity: 0.55 } : undefined}>
                <td style={cellBase(t)}>
                  <div style={{ fontWeight: 600, color: t.ink }}>{r.label}</div>
                  <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{r.slug}</div>
                </td>
                <td style={cellBase(t)}>{r.credits}</td>
                <td style={cellBase(t)}>
                  <AdminStrikePrice
                    t={t}
                    listCents={r.listPriceCents}
                    finalCents={r.priceCents}
                    fractionDigits={2}
                  />
                </td>
                <td style={cellBase(t)}>
                  {r.discount ? (
                    <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                      {r.discount}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ ...cellBase(t), fontFamily: t.mono, fontSize: 11 }}>
                  {r.stripePriceId ?? "—"}
                </td>
                <td style={cellBase(t)}>
                  <Chip t={t} tone={inactive ? "warn" : "positive"}>
                    {inactive ? "Inactive" : "Active"}
                  </Chip>
                </td>
                <td style={cellBase(t)}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" style={button(t, "ghost")} onClick={() => onEdit(r)}>
                      Edit
                    </button>
                    {inactive ? (
                      <RestoreTopupButton t={t} flow={flow} slug={r.slug} />
                    ) : (
                      <DeleteTopupButton t={t} flow={flow} slug={r.slug} label={r.label} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeleteActionButton({
  t,
  flow,
  slug,
  label,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  slug: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        disabled={isPending}
        style={button(t, "danger")}
        onClick={() => {
          if (!confirm(`Soft-delete action cost “${label}”?`)) return;
          startTransition(async () => {
            setError(null);
            const fd = new FormData();
            fd.set("flow", flow);
            fd.set("actionSlug", slug);
            const result = await deleteActionCostAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? "…" : "Delete"}
      </button>
      {error ? (
        <span style={{ fontFamily: t.sans, fontSize: 11, color: t.warn }}>{error}</span>
      ) : null}
    </div>
  );
}

function RestoreActionButton({
  t,
  flow,
  slug,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  slug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        disabled={isPending}
        style={button(t, "ghost")}
        onClick={() =>
          startTransition(async () => {
            setError(null);
          const fd = new FormData();
          fd.set("flow", flow);
          fd.set("actionSlug", slug);
          const result = await restoreActionCostAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {isPending ? "…" : "Restore"}
      </button>
      {error ? (
        <span style={{ fontFamily: t.sans, fontSize: 11, color: t.warn }}>{error}</span>
      ) : null}
    </div>
  );
}

function DeleteTopupButton({
  t,
  flow,
  slug,
  label,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  slug: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        disabled={isPending}
        style={button(t, "danger")}
        onClick={() => {
          if (!confirm(`Soft-delete top-up “${label}”?`)) return;
          startTransition(async () => {
            setError(null);
            const fd = new FormData();
            fd.set("flow", flow);
            fd.set("slug", slug);
            const result = await deleteTopupPackAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? "…" : "Delete"}
      </button>
      {error ? (
        <span style={{ fontFamily: t.sans, fontSize: 11, color: t.warn }}>{error}</span>
      ) : null}
    </div>
  );
}

function RestoreTopupButton({
  t,
  flow,
  slug,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  slug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        disabled={isPending}
        style={button(t, "ghost")}
        onClick={() =>
          startTransition(async () => {
            setError(null);
          const fd = new FormData();
          fd.set("flow", flow);
          fd.set("slug", slug);
          const result = await restoreTopupPackAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {isPending ? "…" : "Restore"}
      </button>
      {error ? (
        <span style={{ fontFamily: t.sans, fontSize: 11, color: t.warn }}>{error}</span>
      ) : null}
    </div>
  );
}

function PlanModal({ t, row, onClose }: { t: Theme; row: CreditPlan; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [monthlyLimitDraft, setMonthlyLimitDraft] = useState(String(row.monthlyLimit));
  const isPro = row.slug === "pro";
  const perBlock = creditsPerBlock(Number.parseInt(monthlyLimitDraft, 10) || 0);

  return (
    <ModalShell t={t} title={`Edit ${row.displayName}`} onClose={onClose}>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const result = await upsertCreditPlanAction(fd);
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
        <input type="hidden" name="flow" value={row.flow} />
        <input type="hidden" name="slug" value={row.slug} />

        <Row t={t} label="Display name *">
          <input name="displayName" required defaultValue={row.displayName} style={input(t)} />
        </Row>
        <Row t={t} label="Monthly limit *">
          <div>
            <input
              name="monthlyLimit"
              type="number"
              required
              min={0}
              defaultValue={row.monthlyLimit}
              onChange={(e) => setMonthlyLimitDraft(e.target.value)}
              style={input(t)}
            />
            {!isPro && row.flow === "founder" ? (
              <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 4 }}>
                Each of {PROFILE_EARN_BLOCK_COUNT} profile modules awards {perBlock} credits
                (monthly limit ÷ {PROFILE_EARN_BLOCK_COUNT}).
              </div>
            ) : null}
            {!isPro && row.flow === "investor" ? (
              <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 4 }}>
                Granted in full when an investor workspace is created.
              </div>
            ) : null}
          </div>
        </Row>
        <Row t={t} label="Daily limit *">
          <input
            name="dailyLimit"
            type="number"
            required
            min={0}
            defaultValue={row.dailyLimit}
            style={input(t)}
          />
        </Row>
        <Row t={t} label="Block duration (ms)">
          <input
            name="blockDurationMs"
            type="number"
            min={0}
            defaultValue={row.blockDurationMs}
            style={input(t)}
          />
        </Row>

        {isPro ? (
          <>
            <Row t={t} label="Monthly fee ($)">
              <input
                name="monthlyPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  row.monthlyPriceCents != null
                    ? (row.monthlyPriceCents / 100).toString()
                    : "30"
                }
                style={input(t)}
              />
            </Row>
            <Row t={t} label="Monthly list price ($)">
              <div>
                <input
                  name="listPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    row.listPriceCents != null
                      ? (row.listPriceCents / 100).toString()
                      : ""
                  }
                  style={input(t)}
                />
                <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 4 }}>
                  Optional compare-at. Shown struck when greater than monthly fee. Not sent to Stripe.
                </div>
              </div>
            </Row>
            <Row t={t} label="Annual fee ($)">
              <input
                name="annualPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  row.annualPriceCents != null
                    ? (row.annualPriceCents / 100).toString()
                    : "300"
                }
                style={input(t)}
              />
            </Row>
            <Row t={t} label="Annual list price ($)">
              <div>
                <input
                  name="annualListPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    row.annualListPriceCents != null
                      ? (row.annualListPriceCents / 100).toString()
                      : ""
                  }
                  style={input(t)}
                />
                <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 4 }}>
                  Optional compare-at for annual fee. Not sent to Stripe.
                </div>
              </div>
            </Row>
            <Row t={t} label="Stripe monthly price">
              <input
                name="stripeMonthlyPriceId"
                placeholder="price_…"
                defaultValue={row.stripeMonthlyPriceId ?? ""}
                style={{ ...input(t), fontFamily: t.mono }}
              />
            </Row>
            <Row t={t} label="Stripe annual price">
              <input
                name="stripeAnnualPriceId"
                placeholder="price_…"
                defaultValue={row.stripeAnnualPriceId ?? ""}
                style={{ ...input(t), fontFamily: t.mono }}
              />
            </Row>
            <Row t={t} label="Stripe sync">
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" name="syncStripe" />
                Create new Stripe Prices when fee changes (archives old)
              </label>
            </Row>
          </>
        ) : (
          <>
            <input type="hidden" name="monthlyPrice" value="" />
            <input type="hidden" name="annualPrice" value="" />
            <input type="hidden" name="listPrice" value="" />
            <input type="hidden" name="annualListPrice" value="" />
            <input type="hidden" name="stripeMonthlyPriceId" value="" />
            <input type="hidden" name="stripeAnnualPriceId" value="" />
          </>
        )}

        {error ? (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.warn }}>{error}</div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" disabled={isPending} style={button(t, "primary")}>
            {isPending ? "Saving…" : "Save plan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ActionModal({
  t,
  flow,
  row,
  availableSlugs,
  onClose,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  row: CreditActionCost | null;
  availableSlugs: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const slugOptions = row ? [row.actionSlug] : availableSlugs;

  return (
    <ModalShell t={t} title={row ? `Edit ${row.label}` : "New action cost"} onClose={onClose}>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const result = await upsertActionCostAction(fd);
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
        <input type="hidden" name="flow" value={flow} />
        <Row t={t} label="Action *">
          {row ? (
            <>
              <input type="hidden" name="actionSlug" value={row.actionSlug} />
              <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, paddingTop: 8 }}>
                {row.actionSlug}
              </div>
            </>
          ) : (
            <select name="actionSlug" required defaultValue="" style={input(t)}>
              <option value="" disabled>
                Pick action…
              </option>
              {slugOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Row>
        <Row t={t} label="Label *">
          <input name="label" required defaultValue={row?.label ?? ""} style={input(t)} />
        </Row>
        <Row t={t} label="Cost *">
          <input
            name="cost"
            type="number"
            required
            min={0}
            defaultValue={row?.cost ?? 1}
            style={input(t)}
          />
        </Row>
        {error ? (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.warn }}>{error}</div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" disabled={isPending} style={button(t, "primary")}>
            {isPending ? "Saving…" : row ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function TopupModal({
  t,
  flow,
  row,
  onClose,
}: {
  t: Theme;
  flow: CreditCatalogFlow;
  row: TopupPack | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <ModalShell t={t} title={row ? `Edit ${row.label}` : "New top-up pack"} onClose={onClose}>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const result = await upsertTopupPackAction(fd);
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
        <input type="hidden" name="flow" value={flow} />
        <Row t={t} label="Slug *">
          {row ? (
            <>
              <input type="hidden" name="slug" value={row.slug} />
              <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, paddingTop: 8 }}>
                {row.slug}
              </div>
            </>
          ) : (
            <div>
              <input
                name="slug"
                required
                pattern={CATALOG_SLUG_PATTERN}
                title="Lowercase kebab-case: start with a letter; letters, numbers, hyphens"
                placeholder="kebab-case"
                style={{ ...input(t), fontFamily: t.mono }}
              />
              <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 4 }}>
                Lowercase kebab-case only (e.g. sprint-boost)
              </div>
            </div>
          )}
        </Row>
        <Row t={t} label="Label *">
          <input name="label" required defaultValue={row?.label ?? ""} style={input(t)} />
        </Row>
        <Row t={t} label="Credits *">
          <input
            name="credits"
            type="number"
            required
            min={1}
            defaultValue={row?.credits ?? 100}
            style={input(t)}
          />
        </Row>
        <Row t={t} label="Price ($) *">
          <input
            name="price"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={
              row?.priceCents != null ? (row.priceCents / 100).toString() : "12"
            }
            style={input(t)}
          />
        </Row>
        <Row t={t} label="List price ($)">
          <div>
            <input
              name="listPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={
                row?.listPriceCents != null ? (row.listPriceCents / 100).toString() : ""
              }
              style={input(t)}
            />
            <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 4 }}>
              Optional compare-at. Shown struck when greater than price. Not sent to Stripe.
            </div>
          </div>
        </Row>
        <Row t={t} label="Blurb *">
          <textarea name="blurb" required defaultValue={row?.blurb ?? ""} style={input(t, true)} />
        </Row>
        <Row t={t} label="Discount label">
          <input name="discount" defaultValue={row?.discount ?? ""} style={input(t)} />
        </Row>
        <Row t={t} label="Sort order">
          <input
            name="sortOrder"
            type="number"
            defaultValue={row?.sortOrder ?? 0}
            style={input(t)}
          />
        </Row>
        <Row t={t} label="Popular">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" name="popular" defaultChecked={row?.popular ?? false} />
            Mark as popular
          </label>
        </Row>
        <Row t={t} label="Stripe price ID">
          <input
            name="stripePriceId"
            placeholder="price_…"
            defaultValue={row?.stripePriceId ?? ""}
            style={{ ...input(t), fontFamily: t.mono }}
          />
        </Row>
        <Row t={t} label="Stripe sync">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" name="syncStripe" defaultChecked={!row?.stripePriceId} />
            Create / refresh Stripe Price from amount (archives old)
          </label>
        </Row>
        {error ? (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.warn }}>{error}</div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" disabled={isPending} style={button(t, "primary")}>
            {isPending ? "Saving…" : row ? "Save pack" : "Create pack"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
