import React, { useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../a11y/useDialogA11y";
import {
  nextStripePriceId,
  saveCreditFlow,
  useCreditCatalog,
  type CatalogAction,
  type CatalogPlan,
  type CatalogTopUp,
  type CreditAudience,
  type CreditFlow,
} from "../credits/creditCatalog";
import type { CreditPlan } from "../credits/types";

type CreditsTab = "plans" | "actions" | "topups";

type Editor =
  | { kind: "plan"; id: CreditPlan }
  | { kind: "action"; id: CatalogAction["id"] }
  | { kind: "topup"; id: string; isNew?: boolean }
  | null;

function formatFee(plan: CatalogPlan): string {
  if (plan.feeMonthly == null && plan.feeYearly == null) return "—";
  const monthly = plan.feeMonthly != null ? `$${plan.feeMonthly}` : "—";
  const yearly = plan.feeYearly != null ? `$${plan.feeYearly}` : "—";
  return `${monthly} / ${yearly}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="sa-edit-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EditDialog({
  title,
  onClose,
  onSave,
  onHide,
  hideLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  onHide?: () => void;
  hideLabel?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(true, ref, onClose);

  return (
    <div className="sa-edit-scrim" onClick={onClose}>
      <div
        ref={ref}
        className="overview-panel sa-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-edit-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="sa-edit-title">{title}</h2>
        <div className="sa-edit-body">{children}</div>
        <div className="sa-edit-actions">
          {onHide ? (
            <button type="button" className="sa-row-edit" onClick={onHide}>
              {hideLabel ?? "Hide from product"}
            </button>
          ) : (
            <span />
          )}
          <div className="sa-edit-actions-end">
            <button type="button" className="sa-row-edit" onClick={onClose}>Cancel</button>
            <button type="button" className="sa-edit-save" onClick={onSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanEditor({
  plan,
  flow,
  audience,
  onClose,
}: {
  plan: CatalogPlan;
  flow: CreditFlow;
  audience: CreditAudience;
  onClose: () => void;
}) {
  const [monthly, setMonthly] = useState(String(plan.monthly));
  const [daily, setDaily] = useState(String(plan.daily));
  const [feeMonthly, setFeeMonthly] = useState(plan.feeMonthly == null ? "" : String(plan.feeMonthly));
  const [feeYearly, setFeeYearly] = useState(plan.feeYearly == null ? "" : String(plan.feeYearly));

  function commit() {
    const nextMonthly = Math.max(0, Math.round(Number(monthly) || 0));
    const nextDaily = Math.max(0, Math.round(Number(daily) || 0));
    const nextFeeMonthly = feeMonthly.trim() === "" ? null : Math.max(0, Number(feeMonthly));
    const nextFeeYearly = feeYearly.trim() === "" ? null : Math.max(0, Number(feeYearly));
    const feeChanged = nextFeeMonthly !== plan.feeMonthly || nextFeeYearly !== plan.feeYearly;
    const stripePrices = (feeChanged || plan.stripePrices.length === 0) && nextFeeMonthly != null
      ? [nextStripePriceId(), ...(nextFeeYearly != null ? [nextStripePriceId()] : [])]
      : plan.stripePrices;

    saveCreditFlow(audience, {
      ...flow,
      plans: flow.plans.map(item =>
        item.id === plan.id
          ? {
              ...item,
              monthly: nextMonthly,
              daily: nextDaily,
              feeMonthly: Number.isFinite(nextFeeMonthly as number) ? nextFeeMonthly : null,
              feeYearly: Number.isFinite(nextFeeYearly as number) ? nextFeeYearly : null,
              stripePrices,
            }
          : item,
      ),
    });
    onClose();
  }

  return (
    <EditDialog title={`Edit ${plan.name}`} onClose={onClose} onSave={commit}>
      <Field label="Monthly pool">
        <input type="number" min={0} value={monthly} onChange={e => setMonthly(e.target.value)} data-autofocus />
      </Field>
      <Field label="Daily cap">
        <input type="number" min={0} value={daily} onChange={e => setDaily(e.target.value)} />
      </Field>
      <Field label="Fee ($ / month)">
        <input type="number" min={0} value={feeMonthly} onChange={e => setFeeMonthly(e.target.value)} placeholder="—" />
      </Field>
      <Field label="Fee ($ / year)">
        <input type="number" min={0} value={feeYearly} onChange={e => setFeeYearly(e.target.value)} placeholder="—" />
      </Field>
      <p className="sa-edit-note">Save syncs a new Stripe Price when the fee changes.</p>
    </EditDialog>
  );
}

function ActionEditor({
  action,
  flow,
  audience,
  onClose,
}: {
  action: CatalogAction;
  flow: CreditFlow;
  audience: CreditAudience;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(action.label);
  const [cost, setCost] = useState(String(action.cost));

  function patch(partial: Partial<CatalogAction>) {
    saveCreditFlow(audience, {
      ...flow,
      actions: flow.actions.map(item => (item.id === action.id ? { ...item, ...partial } : item)),
    });
    onClose();
  }

  return (
    <EditDialog
      title="Edit action cost"
      onClose={onClose}
      onSave={() => patch({ label: label.trim() || action.label, cost: Math.max(0, Math.round(Number(cost) || 0)) })}
      onHide={() => patch({ deleted: !action.deleted })}
      hideLabel={action.deleted ? "Show in product" : "Hide from product"}
    >
      <Field label="Action">
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} data-autofocus />
      </Field>
      <Field label="Credits">
        <input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} />
      </Field>
    </EditDialog>
  );
}

function TopUpEditor({
  pack,
  flow,
  audience,
  isNew,
  onClose,
}: {
  pack: CatalogTopUp;
  flow: CreditFlow;
  audience: CreditAudience;
  isNew?: boolean;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(pack.label);
  const [credits, setCredits] = useState(String(pack.credits));
  const [price, setPrice] = useState(String(pack.price));
  const [blurb, setBlurb] = useState(pack.blurb);
  const [discount, setDiscount] = useState(pack.discount ?? "");
  const [popular, setPopular] = useState(Boolean(pack.popular));

  function commit(deleted = pack.deleted) {
    const nextCredits = Math.max(0, Math.round(Number(credits) || 0));
    const nextPrice = Math.max(0, Number(price) || 0);
    const priceChanged = nextPrice !== pack.price;
    const next: CatalogTopUp = {
      ...pack,
      label: label.trim() || "Pack",
      credits: nextCredits,
      price: nextPrice,
      blurb: blurb.trim(),
      discount: discount.trim() || undefined,
      popular,
      deleted,
      stripePrice: priceChanged || !pack.stripePrice ? nextStripePriceId() : pack.stripePrice,
    };
    const topUps = isNew
      ? [...flow.topUps, next]
      : flow.topUps.map(item => (item.id === pack.id ? next : item));
    saveCreditFlow(audience, { ...flow, topUps });
    onClose();
  }

  return (
    <EditDialog
      title={isNew ? "Add top-up pack" : `Edit ${pack.label}`}
      onClose={onClose}
      onSave={() => commit()}
      onHide={isNew ? undefined : () => commit(!pack.deleted)}
      hideLabel={pack.deleted ? "Show in product" : "Hide from product"}
    >
      <Field label="Name">
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} data-autofocus />
      </Field>
      <Field label="Credits">
        <input type="number" min={0} value={credits} onChange={e => setCredits(e.target.value)} />
      </Field>
      <Field label="Price ($)">
        <input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
      </Field>
      <Field label="Wording">
        <textarea value={blurb} onChange={e => setBlurb(e.target.value)} rows={3} />
      </Field>
      <Field label="Discount badge">
        <input type="text" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Save 20%" />
      </Field>
      <label className="sa-edit-check">
        <input type="checkbox" checked={popular} onChange={e => setPopular(e.target.checked)} />
        Most popular
      </label>
    </EditDialog>
  );
}

export function CreditsAdmin() {
  const catalog = useCreditCatalog();
  const [tab, setTab] = useState<CreditsTab>("plans");
  const [audience, setAudience] = useState<CreditAudience>("founder");
  const [editor, setEditor] = useState<Editor>(null);

  const flow = catalog[audience];
  const visiblePlans = flow.plans.filter(plan => !plan.deleted);
  const editingPlan = editor?.kind === "plan" ? flow.plans.find(plan => plan.id === editor.id) : null;
  const editingAction = editor?.kind === "action" ? flow.actions.find(action => action.id === editor.id) : null;
  const editingTopUp = useMemo(() => {
    if (editor?.kind !== "topup") return null;
    if (editor.isNew) {
      return {
        id: editor.id,
        label: "",
        credits: audience === "investor" ? 4000 : 1000,
        price: audience === "investor" ? 35 : 12,
        blurb: "",
        deleted: false,
      } satisfies CatalogTopUp;
    }
    return flow.topUps.find(pack => pack.id === editor.id) ?? null;
  }, [audience, editor, flow.topUps]);

  return (
    <div className="sa-credits">
      <header>
        <h1 className="sa-page-title">Credits - Admin</h1>
        <p className="sa-page-lede">
          Founder and investor flows are separate. Investor plans carry a larger pool; action costs and top-up wording follow the same split. Soft-delete hides rows from that flow’s product. Sync to Stripe creates new Prices when amounts change.
        </p>
      </header>

      <div className="sa-subtabs" role="tablist" aria-label="Credits section">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "plans"}
          className={`sa-subtab${tab === "plans" ? " is-active" : ""}`}
          onClick={() => setTab("plans")}
        >
          Plans
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "actions"}
          className={`sa-subtab${tab === "actions" ? " is-active" : ""}`}
          onClick={() => setTab("actions")}
        >
          Action costs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "topups"}
          className={`sa-subtab${tab === "topups" ? " is-active" : ""}`}
          onClick={() => setTab("topups")}
        >
          Top-ups
        </button>
      </div>

      <div className="sa-flow-tabs" role="tablist" aria-label="Credit flow">
        <button
          type="button"
          role="tab"
          aria-selected={audience === "founder"}
          className={`sa-flow-tab${audience === "founder" ? " is-active" : ""}`}
          onClick={() => { setAudience("founder"); setEditor(null); }}
        >
          Founder
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={audience === "investor"}
          className={`sa-flow-tab${audience === "investor" ? " is-active" : ""}`}
          onClick={() => { setAudience("investor"); setEditor(null); }}
        >
          Investor
        </button>
      </div>

      {tab === "plans" ? (
        <div className="overview-panel sa-table-wrap">
          <table className="sa-table sa-credits-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Monthly / Daily</th>
                <th>Fee ($ / mo)</th>
                <th>Stripe Prices</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visiblePlans.map(plan => (
                <tr key={plan.id}>
                  <td>
                    <div className="sa-plan-name">
                      <strong>{plan.name}</strong>
                      <span>{plan.slug}</span>
                    </div>
                  </td>
                  <td className="sa-muted">{plan.monthly} / {plan.daily}</td>
                  <td className="sa-muted">{formatFee(plan)}</td>
                  <td className="sa-muted">
                    {plan.stripePrices.length ? (
                      <div className="sa-stripe-ids">
                        {plan.stripePrices.map(id => <code key={id}>{id}</code>)}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="sa-row-actions">
                    <button type="button" className="sa-row-edit" onClick={() => setEditor({ kind: "plan", id: plan.id })}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "actions" ? (
        <div className="overview-panel sa-table-wrap">
          <table className="sa-table sa-credits-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Credits</th>
                <th>Product</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {flow.actions.map(action => (
                <tr key={action.id} className={action.deleted ? "is-hidden" : undefined}>
                  <td>
                    <div className="sa-plan-name">
                      <strong>{action.label}</strong>
                      <span>{action.id}</span>
                    </div>
                  </td>
                  <td className="sa-muted">{action.cost}</td>
                  <td className="sa-muted">{action.deleted ? "Hidden" : "Live"}</td>
                  <td className="sa-row-actions">
                    <button type="button" className="sa-row-edit" onClick={() => setEditor({ kind: "action", id: action.id })}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "topups" ? (
        <>
          <div className="sa-credits-toolbar">
            <button
              type="button"
              className="sa-row-edit"
              onClick={() => setEditor({ kind: "topup", id: `pack-${Date.now()}`, isNew: true })}
            >
              Add pack
            </button>
          </div>
          <div className="overview-panel sa-table-wrap">
            <table className="sa-table sa-credits-table">
              <thead>
                <tr>
                  <th>Pack</th>
                  <th>Credits</th>
                  <th>Price</th>
                  <th>Wording</th>
                  <th>Product</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {flow.topUps.map(pack => (
                  <tr key={pack.id} className={pack.deleted ? "is-hidden" : undefined}>
                    <td>
                      <div className="sa-plan-name">
                        <strong>{pack.label}</strong>
                        <span>{pack.popular ? "Most popular" : pack.id}</span>
                      </div>
                    </td>
                    <td className="sa-muted">{pack.credits.toLocaleString()}</td>
                    <td className="sa-muted">${pack.price}</td>
                    <td className="sa-muted sa-wording">{pack.blurb}</td>
                    <td className="sa-muted">{pack.deleted ? "Hidden" : "Live"}</td>
                    <td className="sa-row-actions">
                      <button type="button" className="sa-row-edit" onClick={() => setEditor({ kind: "topup", id: pack.id })}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {editingPlan ? (
        <PlanEditor plan={editingPlan} flow={flow} audience={audience} onClose={() => setEditor(null)} />
      ) : null}
      {editingAction ? (
        <ActionEditor action={editingAction} flow={flow} audience={audience} onClose={() => setEditor(null)} />
      ) : null}
      {editor?.kind === "topup" && editingTopUp ? (
        <TopUpEditor
          pack={editingTopUp}
          flow={flow}
          audience={audience}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
