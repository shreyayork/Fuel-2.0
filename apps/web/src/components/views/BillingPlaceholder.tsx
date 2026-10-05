"use client";

import { useEffect, useState } from "react";
import { Chip } from "../atoms";
import { useTheme } from "../ThemeContext";
import { useCredits } from "../credits/CreditProvider";
import {
  daysUntilPeriodEnd,
  formatDaysRemaining,
  formatPeriodEndLabel,
  totalRemaining,
} from "@/lib/credits/logic";
import { BILLING_POLICY } from "@/lib/credits/constants";
import {
  cancelSubscription,
  fetchBillingInvoices,
  fetchInvoicePdfDownload,
  fetchInvoicePdfView,
  openBillingPortal,
  resumeSubscription,
} from "@/lib/credits/client";
import {
  formatAccountPlanLabel,
  formatAccountStatusLabel,
} from "@/lib/accounts/display";
import type { Account } from "@/db/schema";
import type { BillingInvoiceDto } from "@/lib/credits/types";
import {
  BILLING_INVOICE_PAGE_SIZE,
  BILLING_INVOICES_EMPTY_COPY,
} from "@/lib/credits/invoices-shared";
import { creditGhostButton, creditPrimaryButton } from "../credits/styles";
import { CreditButtonLabel } from "../credits/CreditButtonLabel";
import { MagicShimmer } from "../ai/MagicShimmer";
import type { Theme } from "@/lib/theme";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdStyle,
  dataThStyle,
} from "./adminStyles";

type BillingPendingAction = "portal" | "cancel" | "resume" | null;

const INVOICE_TABLE_COLS = [
  "Invoice ID",
  "Invoice Number",
  "Invoice Date",
  "Invoice Status",
  "Action",
] as const;

const SKELETON_ROW_COUNT = 5;

function formatInvoiceDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusTone(
  status: string,
): "positive" | "warn" | "ghost" | "negative" {
  const s = status.toLowerCase();
  if (s === "paid") return "positive";
  if (s === "open") return "warn";
  if (s === "void" || s === "uncollectible") return "negative";
  return "ghost";
}

function InvoiceTableHeader({ t }: { t: Theme }) {
  return (
    <thead>
      <tr>
        {INVOICE_TABLE_COLS.map((label) => (
          <th key={label} style={dataThStyle(t)}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function InvoiceTableSkeleton({ t }: { t: Theme }) {
  const widths = ["56px", "96px", "88px", "72px", "148px"] as const;
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
        <tr key={`skel-${row}`} aria-hidden>
          {widths.map((width, col) => (
            <td key={col} style={dataTdStyle(t, { top: false })}>
              <MagicShimmer theme={t} width={width} height={14} rounded={4} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function InvoiceHistorySection({ canView }: { canView: boolean }) {
  const t = useTheme();
  const [loading, setLoading] = useState(canView);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoiceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const onView = async (invoice: BillingInvoiceDto) => {
    if (!invoice.fuelPdfViewPath || viewingId || downloadingId) return;

    const viewer = window.open("about:blank", "_blank");
    if (!viewer) {
      setInvoiceError("Unable to open invoice PDF. Allow pop-ups and try again.");
      return;
    }
    viewer.opener = null;
    viewer.document.title = "Loading invoice…";

    setViewingId(invoice.invoiceId);
    setInvoiceError(null);
    try {
      const pdf = await fetchInvoicePdfView(invoice.fuelPdfViewPath);
      const objectUrl = URL.createObjectURL(pdf);
      viewer.location.replace(objectUrl);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      viewer.close();
      setInvoiceError("Unable to view invoice PDF. Try again later.");
    } finally {
      setViewingId(null);
    }
  };

  const onDownload = async (invoice: BillingInvoiceDto) => {
    if (!invoice.fuelPdfDownloadPath || downloadingId || viewingId) return;
    setDownloadingId(invoice.invoiceId);
    setInvoiceError(null);
    try {
      const { url, filename } = await fetchInvoicePdfDownload(
        invoice.fuelPdfDownloadPath,
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setInvoiceError("Unable to download invoice PDF. Try again later.");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchBillingInvoices({ limit: BILLING_INVOICE_PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setInvoices(res.invoices);
        setTotal(res.total);
        setHasMore(res.hasMore);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg === "invoices_forbidden") {
          setError("forbidden");
        } else {
          setError("Unable to load invoices. Try again later.");
        }
        setInvoices([]);
        setTotal(0);
        setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, offset]);

  if (!canView) {
    return (
      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: 600,
            color: t.ink,
            marginBottom: 8,
          }}
        >
          Invoice history
        </div>
        <p style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, margin: 0 }}>
          Only account owners and admins can view invoices.
        </p>
      </div>
    );
  }

  const showTable = loading || invoices.length > 0;
  const showEmpty = !loading && !error && invoices.length === 0;
  const showError = !loading && Boolean(error) && error !== "forbidden";

  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 12, padding: 20 }}>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 15,
          fontWeight: 600,
          color: t.ink,
          marginBottom: 14,
        }}
      >
        Invoice history
      </div>

      {showError ? (
        <p style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, margin: 0 }}>
          {error}
        </p>
      ) : null}

      {showEmpty ? (
        <p style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, margin: 0 }}>
          {BILLING_INVOICES_EMPTY_COPY}
        </p>
      ) : null}

      {invoiceError ? (
        <p
          role="status"
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
            margin: "0 0 12px",
          }}
        >
          {invoiceError}
        </p>
      ) : null}

      {showTable ? (
        <>
          <div
            className="fuel-data-table-frame fuel-table-wrap"
            style={dataTableFrameStyle(t)}
            aria-busy={loading || undefined}
          >
            <table className="fuel-data-table" style={dataTableStyle()}>
              <InvoiceTableHeader t={t} />
              <tbody>
                {loading ? (
                  <InvoiceTableSkeleton t={t} />
                ) : (
                  invoices.map((inv) => {
                    const canViewFuelPdf = Boolean(inv.fuelPdfViewPath);
                    const canDownload = Boolean(inv.fuelPdfDownloadPath);
                    const isViewing = viewingId === inv.invoiceId;
                    const isDownloading = downloadingId === inv.invoiceId;
                    const invoiceActionBusy =
                      viewingId !== null || downloadingId !== null;
                    return (
                      <tr key={`${inv.invoiceId}-${inv.invoiceNumber ?? "none"}`}>
                        <td style={dataTdStyle(t, { primary: true, mono: true })}>
                          {inv.invoiceId}
                        </td>
                        <td
                          style={{
                            ...dataTdStyle(t, { mono: true }),
                            color: inv.invoiceNumber ? t.ink : t.muted,
                          }}
                        >
                          {inv.invoiceNumber ?? "—"}
                        </td>
                        <td style={dataTdStyle(t, { nowrap: true })}>
                          {formatInvoiceDate(inv.invoiceDate)}
                        </td>
                        <td style={dataTdStyle(t)}>
                          <Chip t={t} tone={statusTone(inv.invoiceStatus)}>
                            {inv.invoiceStatus}
                          </Chip>
                        </td>
                        <td style={dataTdStyle(t)}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {canViewFuelPdf ? (
                              <button
                                type="button"
                                onClick={() => void onView(inv)}
                                disabled={invoiceActionBusy}
                                aria-busy={isViewing || undefined}
                                style={{
                                  ...creditGhostButton(t),
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: invoiceActionBusy
                                    ? "not-allowed"
                                    : "pointer",
                                  opacity:
                                    invoiceActionBusy && !isViewing ? 0.6 : 1,
                                }}
                              >
                                <CreditButtonLabel
                                  t={t}
                                  loading={isViewing}
                                  variant="ghost"
                                >
                                  View
                                </CreditButtonLabel>
                              </button>
                            ) : (
                              <span
                                style={{
                                  ...creditGhostButton(t),
                                  opacity: 0.45,
                                  cursor: "not-allowed",
                                }}
                                aria-disabled
                              >
                                View
                              </span>
                            )}
                            {canDownload ? (
                              <button
                                type="button"
                                onClick={() => void onDownload(inv)}
                                disabled={invoiceActionBusy}
                                aria-busy={isDownloading || undefined}
                                style={creditGhostButton(t, {
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: 118,
                                  minHeight: 38,
                                  boxSizing: "border-box",
                                  cursor: invoiceActionBusy
                                    ? "not-allowed"
                                    : "pointer",
                                  opacity:
                                    invoiceActionBusy && !isDownloading ? 0.6 : 1,
                                })}
                              >
                                <CreditButtonLabel
                                  t={t}
                                  loading={isDownloading}
                                  variant="ghost"
                                >
                                  Download
                                </CreditButtonLabel>
                              </button>
                            ) : (
                              <span
                                style={{
                                  ...creditGhostButton(t),
                                  opacity: 0.45,
                                  cursor: "not-allowed",
                                }}
                                title="PDF unavailable"
                                aria-disabled
                              >
                                Download unavailable
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                {total === 0
                  ? "0 invoices"
                  : `Showing ${offset + 1}–${offset + invoices.length} of ${total}`}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={creditGhostButton(t, {
                    opacity: offset <= 0 ? 0.5 : 1,
                    cursor: offset <= 0 ? "not-allowed" : "pointer",
                  })}
                  disabled={offset <= 0}
                  onClick={() =>
                    setOffset((o) => Math.max(0, o - BILLING_INVOICE_PAGE_SIZE))
                  }
                >
                  Previous
                </button>
                <button
                  type="button"
                  style={creditGhostButton(t, {
                    opacity: !hasMore ? 0.5 : 1,
                    cursor: !hasMore ? "not-allowed" : "pointer",
                  })}
                  disabled={!hasMore}
                  onClick={() => setOffset((o) => o + BILLING_INVOICE_PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function BillingPlaceholder({
  account,
  canViewInvoices = false,
}: {
  account: Account;
  canViewInvoices?: boolean;
}) {
  const t = useTheme();
  const { snapshot, openUpgrade, refreshSnapshot } = useCredits();
  const [pendingAction, setPendingAction] = useState<BillingPendingAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = pendingAction !== null;

  const isPro = snapshot?.plan === "pro";
  const planLabel = isPro
    ? snapshot?.billingCycle === "annual"
      ? "Pro · Annual"
      : snapshot?.billingCycle === "monthly"
        ? "Pro · Monthly"
        : "Pro"
    : "Free";
  const remaining = snapshot ? totalRemaining(snapshot) : null;
  const cancelPending = Boolean(snapshot?.cancelAtPeriodEnd);
  const daysLeft =
    cancelPending && snapshot
      ? daysUntilPeriodEnd(snapshot.periodEndsAt)
      : null;
  const cancelEndLabel =
    cancelPending && snapshot
      ? formatPeriodEndLabel(snapshot.periodEndsAt)
      : null;

  const onPortal = async () => {
    setPendingAction("portal");
    setMessage(null);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch {
      setMessage("Billing portal is not available yet. Connect Stripe to enable.");
      setPendingAction(null);
    }
  };

  const onCancel = async () => {
    setPendingAction("cancel");
    setMessage(null);
    try {
      await cancelSubscription();
      await refreshSnapshot();
      setMessage(
        snapshot?.billingCycle === "annual"
          ? BILLING_POLICY.annualCancel
          : BILLING_POLICY.cancelNoRefund,
      );
    } catch {
      setMessage("Unable to cancel subscription. Check Stripe configuration.");
    } finally {
      setPendingAction(null);
    }
  };

  const onResume = async () => {
    setPendingAction("resume");
    setMessage(null);
    try {
      await resumeSubscription();
      await refreshSnapshot();
      setMessage("Cancellation withdrawn — Pro renews as scheduled.");
    } catch {
      setMessage("Unable to resume subscription.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="fuel-billing-plan-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
      >
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 600,
              color: t.ink,
              marginBottom: 10,
            }}
          >
            Current plan
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "8px 0 18px", flexWrap: "wrap" }}>
            <Chip t={t} tone={isPro ? "positive" : "ghost"}>
              {planLabel}
            </Chip>
            {cancelPending ? (
              <Chip t={t} tone="warn">
                Cancels in {formatDaysRemaining(daysLeft)}
              </Chip>
            ) : null}
            <span style={{ fontFamily: t.sans, fontSize: 14, color: t.ink }}>
              {remaining != null ? `${remaining.toLocaleString()} credits available` : "Loading credits…"}
            </span>
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, lineHeight: 1.5, marginBottom: 16 }}>
            {isPro ? (
              cancelPending ? (
                <>
                  Subscription cancelled. {formatDaysRemaining(daysLeft)} of Pro left
                  (through {cancelEndLabel}). When the cycle ends you move to Free —
                  no prorated refund.
                </>
              ) : snapshot?.billingCycle === "annual" ? (
                <>
                  {BILLING_POLICY.annualCancel} Portal is for cards & invoices; cancel
                  here without leaving Fuel.
                </>
              ) : (
                <>
                  {BILLING_POLICY.cancelNoRefund} Portal is for cards & invoices; cancel
                  here without leaving Fuel.
                </>
              )
            ) : (
              "Upgrade to Pro for 2,000 monthly credits, faster daily resets, and top-up packs."
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!isPro ? (
              <button
                type="button"
                style={creditPrimaryButton(t)}
                onClick={() => openUpgrade("pro", "healthy")}
              >
                Upgrade to Pro
              </button>
            ) : (
              <>
                <button
                  type="button"
                  style={creditPrimaryButton(t, {
                    cursor: busy ? "wait" : "pointer",
                    opacity: busy && pendingAction !== "portal" ? 0.7 : 1,
                  })}
                  disabled={busy}
                  aria-busy={pendingAction === "portal"}
                  onClick={() => void onPortal()}
                >
                  <CreditButtonLabel t={t} loading={pendingAction === "portal"}>
                    {pendingAction === "portal" ? "Opening billing portal…" : "Manage payment method"}
                  </CreditButtonLabel>
                </button>
                {cancelPending ? (
                  <button
                    type="button"
                    style={creditGhostButton(t, {
                      cursor: busy ? "wait" : "pointer",
                      opacity: busy && pendingAction !== "resume" ? 0.7 : 1,
                    })}
                    disabled={busy}
                    aria-busy={pendingAction === "resume"}
                    onClick={() => void onResume()}
                  >
                    <CreditButtonLabel t={t} variant="ghost" loading={pendingAction === "resume"}>
                      {pendingAction === "resume"
                        ? "Withdrawing cancellation…"
                        : "Keep Pro · withdraw cancel"}
                    </CreditButtonLabel>
                  </button>
                ) : (
                  <button
                    type="button"
                    style={creditGhostButton(t, {
                      cursor: busy ? "wait" : "pointer",
                      opacity: busy && pendingAction !== "cancel" ? 0.7 : 1,
                    })}
                    disabled={busy}
                    aria-busy={pendingAction === "cancel"}
                    onClick={() => void onCancel()}
                  >
                    <CreditButtonLabel t={t} variant="ghost" loading={pendingAction === "cancel"}>
                      {pendingAction === "cancel" ? "Cancelling…" : "Cancel subscription"}
                    </CreditButtonLabel>
                  </button>
                )}
                <button
                  type="button"
                  style={creditGhostButton(t)}
                  onClick={() => openUpgrade("pro", "healthy")}
                >
                  Change plan
                </button>
              </>
            )}
          </div>
          {message ? (
            <p style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 12 }}>{message}</p>
          ) : null}
          {isPro ? (
            <p style={{ fontFamily: t.sans, fontSize: 11, color: t.mutedSoft, marginTop: 12, lineHeight: 1.45 }}>
              {BILLING_POLICY.billingError}
            </p>
          ) : null}
        </div>
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 600,
              color: t.ink,
              marginBottom: 10,
            }}
          >
            Account
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
            <div>Status: {formatAccountStatusLabel(account)}</div>
            <div>Plan: {formatAccountPlanLabel(account)}</div>
            <div>Stripe customer: {account.stripeCustomerId ?? "not connected"}</div>
            {snapshot ? (
              <div style={{ marginTop: 10 }}>
                Daily usage: {snapshot.dailyUsed} / {snapshot.dailyLimit}
                <br />
                Monthly usage: {snapshot.monthlyUsed} / {snapshot.monthlyLimit}
                {snapshot.topUpBalance > 0 ? (
                  <>
                    <br />
                    Top-up balance: {snapshot.topUpBalance.toLocaleString()}
                  </>
                ) : null}
                {snapshot.monthlyResetLabel !== "—" ? (
                  <>
                    <br />
                    Period ends: {snapshot.monthlyResetLabel}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <InvoiceHistorySection canView={canViewInvoices} />
    </div>
  );
}
