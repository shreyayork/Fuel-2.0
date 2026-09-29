"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties, type ReactNode } from "react";
import type { Theme } from "@/lib/theme";
import type { CampaignListRow } from "@/lib/credits/coupon-campaigns";
import { campaignBlocksModifications } from "@/lib/credits/coupon-campaign-status";
import {
  datetimeLocalToIsoUtc,
  toDatetimeLocalValue,
} from "@/lib/datetime-local";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  archiveCouponCampaignAction,
  createCouponCampaignAction,
  setCouponCampaignActiveAction,
  type CouponsActionResult,
} from "@/app/(super-admin)/super-admin/coupons/actions";

function button(
  t: Theme,
  variant: "primary" | "ghost" | "danger" = "ghost",
): CSSProperties {
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

function input(t: Theme): CSSProperties {
  return {
    padding: "8px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 13,
    width: "100%",
  };
}

function cell(t: Theme): CSSProperties {
  return {
    padding: "10px 12px",
    fontFamily: t.sans,
    fontSize: 13,
    color: t.inkSoft,
    borderBottom: `1px solid ${t.ruleSoft}`,
    verticalAlign: "middle",
  };
}

function benefitLabel(row: CampaignListRow): string {
  if (row.benefitType === "percent_off" && row.percentOff != null) {
    return `${row.percentOff}% · ${row.duration}`;
  }
  if (row.benefitType === "amount_off" && row.amountOffCents != null) {
    return `$${(row.amountOffCents / 100).toFixed(2)} · ${row.duration}`;
  }
  return row.duration;
}

function inputReadonly(t: Theme): CSSProperties {
  return {
    ...input(t),
    opacity: 0.85,
    cursor: "default",
  };
}

function fieldValue(label: string, value: string, t: Theme): ReactNode {
  return (
    <div style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
      <span>{label}</span>
      <div
        style={{
          ...inputReadonly(t),
          boxSizing: "border-box",
          minHeight: 36,
          display: "flex",
          alignItems: "center",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export function CouponsAdminView({ rows }: { rows: CampaignListRow[] }) {
  const t = useTheme();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<CampaignListRow | null>(null);
  const [benefitType, setBenefitType] = useState<"percent_off" | "amount_off">(
    "percent_off",
  );
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">(
    "once",
  );
  const [audience, setAudience] = useState<"targeted" | "global">("targeted");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setViewing(null);
    setBenefitType("percent_off");
    setDuration("once");
    setAudience("targeted");
    setCreating(true);
  };

  const openViewPopup = (row: CampaignListRow) => {
    setCreating(false);
    setViewing(row);
  };

  const onCreate = (formData: FormData) => {
    setStatus(null);
    // datetime-local has no TZ — convert in the browser so the server (often
    // UTC) does not reinterpret the admin's wall clock as server-local.
    const redeemByRaw = String(formData.get("redeemBy") ?? "").trim();
    if (redeemByRaw) {
      const iso = datetimeLocalToIsoUtc(redeemByRaw);
      if (!iso) {
        setStatus("Invalid expiration date.");
        return;
      }
      formData.set("redeemBy", iso);
    }
    startTransition(async () => {
      const result: CouponsActionResult =
        await createCouponCampaignAction(formData);
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setCreating(false);
      setStatus(result.message ?? "Created.");
      if (result.campaignId) {
        router.push(`/super-admin/coupons/${result.campaignId}`);
        router.refresh();
        return;
      }
      router.refresh();
    });
  };

  const onArchive = (campaignId: string) => {
    const fd = new FormData();
    fd.set("campaignId", campaignId);
    startTransition(async () => {
      const result = await archiveCouponCampaignAction(fd);
      setStatus(result.ok ? (result.message ?? "Archived.") : result.error);
      router.refresh();
    });
  };

  const onSetActive = (campaignId: string, active: boolean) => {
    const fd = new FormData();
    fd.set("campaignId", campaignId);
    fd.set("active", active ? "true" : "false");
    startTransition(async () => {
      const result = await setCouponCampaignActiveAction(fd);
      setStatus(result.ok ? (result.message ?? "Updated.") : result.error);
      router.refresh();
    });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <SectionHead
          t={t}
          title="Coupons"
          subtitle="Create Stripe coupon campaigns, mint unique promotion codes, and email them to recipients."
        />
        <button
          type="button"
          style={button(t, "primary")}
          disabled={isPending}
          onClick={openCreate}
        >
          New campaign
        </button>
      </div>

      {status ? (
        <p style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginBottom: 12 }}>
          {status}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div
          style={{
            padding: 24,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            background: t.panel,
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 13,
          }}
        >
          No campaigns yet. Create one to mint Stripe Coupons + Promotion Codes from
          Super Admin (no Dashboard required for day-to-day issuance).
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Audience", "Benefit", "Issued", "Sent", "Redeemed", "Status", ""].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      ...cell(t),
                      color: t.muted,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const modsBlocked = campaignBlocksModifications(row);
              const detailHref = `/super-admin/coupons/${row.id}`;
              return (
                <tr key={row.id}>
                  <td style={cell(t)}>
                    <Link
                      href={detailHref}
                      style={{
                        color: t.accent,
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td style={cell(t)}>
                    <Chip
                      t={t}
                      tone={row.audience === "global" ? "accent" : "ghost"}
                    >
                      {row.audience}
                    </Chip>
                    {row.audience === "global" && row.globalPromotionCode ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: t.muted,
                          marginTop: 4,
                          fontFamily: t.mono,
                        }}
                      >
                        {row.globalPromotionCode}
                      </div>
                    ) : null}
                  </td>
                  <td style={cell(t)}>{benefitLabel(row)}</td>
                  <td style={cell(t)}>{row.stats.issued}</td>
                  <td style={cell(t)}>{row.stats.sent}</td>
                  <td style={cell(t)}>{row.stats.redeemed}</td>
                  <td style={cell(t)}>
                    <Chip
                      t={t}
                      tone={
                        row.status === "active"
                          ? "positive"
                          : row.status === "inactive"
                            ? "warn"
                            : "ghost"
                      }
                    >
                      {row.status}
                    </Chip>
                  </td>
                  <td style={cell(t)}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={button(t, "ghost")}
                        disabled={isPending}
                        onClick={() => openViewPopup(row)}
                      >
                        View
                      </button>
                      {!modsBlocked && row.status === "active" ? (
                        <button
                          type="button"
                          style={button(t, "ghost")}
                          disabled={isPending}
                          onClick={() => onSetActive(row.id, false)}
                        >
                          Deactivate
                        </button>
                      ) : null}
                      {!modsBlocked && row.status === "inactive" ? (
                        <button
                          type="button"
                          style={button(t, "ghost")}
                          disabled={isPending}
                          onClick={() => onSetActive(row.id, true)}
                        >
                          Activate
                        </button>
                      ) : null}
                      {!modsBlocked ? (
                        <button
                          type="button"
                          style={button(t, "danger")}
                          disabled={isPending}
                          onClick={() => onArchive(row.id)}
                        >
                          Archive
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {creating ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => !isPending && setCreating(false)}
        >
          <form
            action={onCreate}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontFamily: t.sans, fontSize: 16, color: t.ink }}>
              New coupon campaign
            </h3>
            <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
              Name
              <input name="name" required style={input(t)} placeholder="Fuel 1.0 migrants 40%" />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
              Description (optional)
              <input name="description" style={input(t)} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
              Code prefix
              <input name="codePrefix" defaultValue="FUEL1" style={input(t)} />
            </label>
            <fieldset style={{ border: `1px solid ${t.rule}`, borderRadius: 6, padding: 12 }}>
              <legend style={{ fontSize: 12, color: t.muted, padding: "0 6px" }}>
                Audience
              </legend>
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: t.inkSoft }}>
                  <input
                    type="radio"
                    name="audience"
                    value="targeted"
                    checked={audience === "targeted"}
                    onChange={() => setAudience("targeted")}
                  />{" "}
                  Targeted (unique per email)
                </label>
                <label style={{ fontSize: 12, color: t.inkSoft }}>
                  <input
                    type="radio"
                    name="audience"
                    value="global"
                    checked={audience === "global"}
                    onChange={() => setAudience("global")}
                  />{" "}
                  Global (shared multi-use)
                </label>
              </div>
              {audience === "global" ? (
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
                  Max redemptions (blank = unlimited)
                  <input
                    name="maxRedemptions"
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    style={input(t)}
                  />
                </label>
              ) : (
                <p style={{ fontSize: 11, color: t.muted, margin: 0 }}>
                  Each recipient gets a unique one-time promotion code.
                </p>
              )}
            </fieldset>
            <fieldset style={{ border: `1px solid ${t.rule}`, borderRadius: 6, padding: 12 }}>
              <legend style={{ fontSize: 12, color: t.muted, padding: "0 6px" }}>
                Benefit
              </legend>
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: t.inkSoft }}>
                  <input
                    type="radio"
                    name="benefitType"
                    value="percent_off"
                    checked={benefitType === "percent_off"}
                    onChange={() => setBenefitType("percent_off")}
                  />{" "}
                  Percent off
                </label>
                <label style={{ fontSize: 12, color: t.inkSoft }}>
                  <input
                    type="radio"
                    name="benefitType"
                    value="amount_off"
                    checked={benefitType === "amount_off"}
                    onChange={() => setBenefitType("amount_off")}
                  />{" "}
                  Fixed amount (USD)
                </label>
              </div>
              {benefitType === "percent_off" ? (
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
                  Percent (1–100)
                  <input
                    name="percentOff"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={40}
                    required
                    style={input(t)}
                  />
                </label>
              ) : (
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
                  Amount off (dollars)
                  <input
                    name="amountOffDollars"
                    type="number"
                    min={0.01}
                    step={0.01}
                    defaultValue={10}
                    required
                    style={input(t)}
                  />
                </label>
              )}
            </fieldset>
            <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
              Duration
              <select
                name="duration"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value as "once" | "repeating" | "forever")
                }
                style={input(t)}
              >
                <option value="once">Once (first invoice)</option>
                <option value="repeating">Repeating (N months)</option>
                <option value="forever">Forever</option>
              </select>
            </label>
            {duration === "repeating" ? (
              <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
                Months
                <input
                  name="durationInMonths"
                  type="number"
                  min={1}
                  defaultValue={3}
                  style={input(t)}
                />
              </label>
            ) : null}
            <label style={{ display: "grid", gap: 4, fontSize: 12, color: t.muted }}>
              Redeem by (optional)
              <input name="redeemBy" type="datetime-local" style={input(t)} />
            </label>
            <fieldset style={{ border: `1px solid ${t.rule}`, borderRadius: 6, padding: 12 }}>
              <legend style={{ fontSize: 12, color: t.muted, padding: "0 6px" }}>
                Restrict to Pro prices (optional)
              </legend>
              <label style={{ display: "block", fontSize: 12, color: t.inkSoft }}>
                <input type="checkbox" name="applyMonthly" /> Monthly Pro price
              </label>
              <label style={{ display: "block", fontSize: 12, color: t.inkSoft, marginTop: 6 }}>
                <input type="checkbox" name="applyAnnual" /> Annual Pro price
              </label>
              <p style={{ fontSize: 11, color: t.muted, margin: "8px 0 0" }}>
                Leave unchecked to apply to any Pro Checkout line item. Discount
                values cannot be edited after create — activate/deactivate only.
              </p>
            </fieldset>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                style={button(t, "ghost")}
                disabled={isPending}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button type="submit" style={button(t, "primary")} disabled={isPending}>
                {isPending ? "Creating…" : "Create in Stripe"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {viewing ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setViewing(null)}
        >
          <div
            role="dialog"
            aria-label="Campaign details"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontFamily: t.sans, fontSize: 16, color: t.ink }}>
              Campaign details
            </h3>
            {fieldValue("Name", viewing.name, t)}
            {fieldValue("Description", viewing.description ?? "", t)}
            {fieldValue("Code prefix", viewing.codePrefix, t)}
            {fieldValue("Status", viewing.status, t)}
            {fieldValue("Audience", viewing.audience, t)}
            {viewing.audience === "global"
              ? fieldValue(
                  "Global promotion code",
                  viewing.globalPromotionCode ?? "",
                  t,
                )
              : null}
            {viewing.audience === "global"
              ? fieldValue(
                  "Max redemptions",
                  viewing.maxRedemptions == null
                    ? "Unlimited"
                    : String(viewing.maxRedemptions),
                  t,
                )
              : null}
            {fieldValue("Benefit", benefitLabel(viewing), t)}
            {fieldValue(
              "Duration",
              viewing.duration === "repeating"
                ? `Repeating (${viewing.durationInMonths ?? "?"} months)`
                : viewing.duration === "forever"
                  ? "Forever"
                  : "Once (first invoice)",
              t,
            )}
            {fieldValue(
              "Redeem by",
              viewing.redeemBy
                ? toDatetimeLocalValue(viewing.redeemBy).replace("T", " ")
                : "",
              t,
            )}
            {fieldValue(
              "Issued / Sent / Redeemed",
              `${viewing.stats.issued} / ${viewing.stats.sent} / ${viewing.stats.redeemed}`,
              t,
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Link
                href={`/super-admin/coupons/${viewing.id}`}
                style={{
                  ...button(t, "ghost"),
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
              >
                Open full page
              </Link>
              <button
                type="button"
                style={button(t, "primary")}
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
