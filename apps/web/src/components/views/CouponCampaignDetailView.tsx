"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import { ctaPrimaryStyle, ctaTertiaryStyle, type Theme } from "@/lib/theme";
import type { CouponCampaign, CouponRecipient } from "@/db/schema";
import type { CampaignStats } from "@/lib/credits/coupon-campaigns";
import { campaignBlocksModifications } from "@/lib/credits/coupon-campaign-status";
import { BackNav, Chip } from "../atoms";
import { AdminPageHeader } from "./AdminPageHeader";
import { useTheme } from "../ThemeContext";
import { useToast } from "../toast/ToastProvider";
import {
  adminEmptyStyle,
  adminTableFrameStyle,
  adminTableScrollStyle,
  adminTableStyle,
  adminTdActionsStyle,
  adminTdStyle,
  adminThStyle,
} from "./adminStyles";
import {
  generateCouponCodesAction,
  sendCouponEmailsAction,
  setCouponCampaignActiveAction,
  type CouponsActionResult,
} from "@/app/(super-admin)/super-admin/coupons/actions";
import { shouldSendScopedBatchOnly } from "@/lib/credits/coupon-emails";

function button(
  t: Theme,
  variant: "primary" | "ghost" | "danger" = "ghost",
  opts?: { disabled?: boolean },
): CSSProperties {
  const chrome =
    variant === "primary"
      ? ctaPrimaryStyle(t)
      : variant === "ghost"
        ? ctaTertiaryStyle(t)
        : {
            background: "transparent",
            border: `1px solid ${t.warn}`,
            color: t.warn,
          };
  return {
    ...chrome,
    padding: "6px 12px",
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: opts?.disabled ? "not-allowed" : "pointer",
    opacity: opts?.disabled ? 0.55 : 1,
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

function stepCard(t: Theme): CSSProperties {
  return {
    display: "grid",
    gap: 10,
    padding: 14,
    background: t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
  };
}

function stepTitle(t: Theme): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 600,
    color: t.ink,
    margin: 0,
  };
}

function helperText(t: Theme): CSSProperties {
  return {
    margin: 0,
    fontSize: 12,
    color: t.muted,
    fontFamily: t.sans,
    lineHeight: 1.45,
  };
}

function sendTone(
  status: CouponRecipient["sendStatus"],
): "positive" | "warn" | "ghost" | "negative" {
  if (status === "sent") return "positive";
  if (status === "failed") return "negative";
  // pending = unsent — warn so it scans vs muted ghost
  return "warn";
}

function sendLabel(status: CouponRecipient["sendStatus"]): string {
  if (status === "pending") return "unsent";
  return status;
}

export function CouponCampaignDetailView({
  campaign,
  recipients,
  stats,
}: {
  campaign: CouponCampaign;
  recipients: CouponRecipient[];
  stats: CampaignStats;
}) {
  const t = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [alsoEmailNow, setAlsoEmailNow] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pendingEmailCount = stats.pendingSend + stats.failedSend;
  const allEmailsSent =
    stats.issued > 0 && pendingEmailCount === 0 && stats.sent === stats.issued;
  const modsBlocked = campaignBlocksModifications(campaign);

  const friendlyActionError = (raw: string): string => {
    if (raw === "campaign_archived") {
      return "This campaign is archived — modifications are disabled.";
    }
    if (raw === "campaign_expired_archived") {
      return "This campaign expired and was archived. Add emails is no longer allowed.";
    }
    if (raw === "campaign_inactive") {
      return "This campaign is inactive. Activate it before generating codes.";
    }
    return raw;
  };

  const toastResult = (result: CouponsActionResult) => {
    if (result.ok) {
      showToast({
        message: result.message ?? "Done.",
        variant: "success",
      });
    } else {
      showToast({ message: friendlyActionError(result.error), variant: "error" });
    }
  };

  const run = (fn: () => Promise<CouponsActionResult>) => {
    startTransition(async () => {
      const result = await fn();
      toastResult(result);
      router.refresh();
    });
  };

  const onGenerate = () => {
    if (!emails.trim()) return;
    if (alsoEmailNow) {
      if (
        !confirm(
          "Generate codes for the emails above, then send email only to newly created recipients from this batch?",
        )
      ) {
        return;
      }
    }
    const fd = new FormData();
    fd.set("campaignId", campaign.id);
    fd.set("emails", emails);
    startTransition(async () => {
      const result = await generateCouponCodesAction(fd);
      if (!result.ok) {
        showToast({ message: friendlyActionError(result.error), variant: "error" });
        router.refresh();
        return;
      }

      let message = result.message ?? "Codes generated.";
      const batchIds = result.createdRecipientIds ?? [];
      let variant: "success" | "warning" | "error" = "success";

      if (!alsoEmailNow) {
        message = `${message} Emails not yet sent — use Send when ready.`;
      } else if (!shouldSendScopedBatchOnly(batchIds)) {
        message = `${message} No new recipients to email (all skipped or failed at Stripe).`;
        variant = "warning";
      } else {
        const sendFd = new FormData();
        sendFd.set("campaignId", campaign.id);
        sendFd.set("recipientIds", batchIds.join(","));
        sendFd.set("mode", "unsent");
        const sendResult = await sendCouponEmailsAction(sendFd);
        if (sendResult.ok) {
          message = `${result.message ?? "Codes generated."} ${sendResult.message ?? "Emails sent."}`;
        } else {
          message = `${result.message ?? "Codes generated."} Email send failed: ${sendResult.error}`;
          variant = "error";
        }
      }

      showToast({ message, variant });
      setEmails("");
      router.refresh();
    });
  };

  const onSendUnsent = () => {
    if (modsBlocked) return;
    if (pendingEmailCount < 1) return;
    if (
      !confirm(
        `Send coupon email to ${pendingEmailCount} recipient(s) with unsent or failed status?`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("campaignId", campaign.id);
    fd.set("mode", "unsent");
    run(() => sendCouponEmailsAction(fd));
  };

  const onResend = (recipientId: string) => {
    if (modsBlocked) return;
    const fd = new FormData();
    fd.set("campaignId", campaign.id);
    fd.set("recipientId", recipientId);
    run(() => sendCouponEmailsAction(fd));
  };

  const onToggleActive = () => {
    if (modsBlocked) return;
    const active = campaign.status !== "active";
    const fd = new FormData();
    fd.set("campaignId", campaign.id);
    fd.set("active", active ? "true" : "false");
    run(() => setCouponCampaignActiveAction(fd));
  };

  return (
    <div>
      <BackNav t={t} href="/super-admin/coupons" label="Coupons" style={{ marginBottom: 8 }} />
      <div
        style={{
          marginTop: 8,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <AdminPageHeader
          t={t}
          title={campaign.name}
          description={`${campaign.stripeCouponId} · ${campaign.audience} · prefix ${campaign.codePrefix} · ${campaign.status}`}
          actions={
            campaign.status !== "archived" && !modsBlocked ? (
              <button
                type="button"
                style={button(t, "ghost")}
                disabled={isPending}
                onClick={onToggleActive}
              >
                {campaign.status === "active" ? "Deactivate" : "Activate"}
              </button>
            ) : undefined
          }
        />
      </div>

      {campaign.audience === "global" && campaign.globalPromotionCode ? (
        <div
          style={{
            ...stepCard(t),
            marginBottom: 16,
          }}
        >
          <p style={stepTitle(t)}>Shared global code</p>
          <p style={{ ...helperText(t), fontFamily: t.mono, color: t.ink }}>
            {campaign.globalPromotionCode}
          </p>
          <p style={helperText(t)}>
            Max redemptions:{" "}
            {campaign.maxRedemptions == null
              ? "unlimited"
              : campaign.maxRedemptions}
            . Benefit/discount cannot be edited after create.
          </p>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {(
          [
            ["Issued", stats.issued],
            ["Unsent", stats.pendingSend],
            ["Sent", stats.sent],
            ["Failed send", stats.failedSend],
            ["Redeemed", stats.redeemed],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: 12,
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 11, color: t.muted, fontFamily: t.sans }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: t.ink,
                fontFamily: t.sans,
                marginTop: 4,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {campaign.status === "active" &&
      campaign.audience === "targeted" &&
      !modsBlocked ? (
        <div
          style={{
            display: "grid",
            gap: 14,
            padding: 16,
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            marginBottom: 20,
          }}
        >
          <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
            Recipients
          </div>
          <p style={helperText(t)}>
            Paste emails (comma, space, or newline). Duplicates skipped. Existing emails in
            this campaign are not re-minted. Max 500 per generate run. Overlap with other
            campaigns is allowed.
          </p>

          <style>{`
            .coupon-recipient-cols {
              display: grid;
              gap: 14px;
              align-items: start;
            }
            @media (min-width: 720px) {
              .coupon-recipient-cols {
                grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
                gap: 0;
              }
              .coupon-recipient-cols > .coupon-recipient-col-send {
                border-left: 1px solid ${t.rule};
                padding-left: 16px;
                margin-left: 16px;
              }
            }
          `}</style>

          <div className="coupon-recipient-cols">
            <div style={stepCard(t)}>
              <p style={stepTitle(t)}>Generate promotion codes</p>
              <p style={helperText(t)}>
                Creates Stripe codes and table rows only — does not send email unless you
                check the option below.
              </p>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={5}
                placeholder={"user@example.com\nother@york.ie"}
                style={{
                  ...input(t),
                  resize: "vertical",
                  fontFamily: t.mono,
                  maxHeight: 240,
                }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: t.inkSoft,
                }}
              >
                <input
                  type="checkbox"
                  checked={alsoEmailNow}
                  onChange={(e) => setAlsoEmailNow(e.target.checked)}
                  disabled={isPending}
                  style={{ marginTop: 2 }}
                />
                <span>
                  Also email these recipients now (sends only to newly generated
                  emails from this textarea — not other unsent/failed in the campaign).
                </span>
              </label>
              <div>
                <button
                  type="button"
                  style={button(t, "primary", {
                    disabled: isPending || !emails.trim(),
                  })}
                  disabled={isPending || !emails.trim()}
                  onClick={onGenerate}
                >
                  {isPending
                    ? alsoEmailNow
                      ? "Generating & sending…"
                      : "Generating codes…"
                    : alsoEmailNow
                      ? "Generate codes & send emails"
                      : "Generate promotion codes"}
                </button>
                <p style={{ ...helperText(t), marginTop: 8 }}>
                  Codes only by default. Emails are a separate step unless the checkbox is
                  on.
                </p>
              </div>
            </div>

            <div className="coupon-recipient-col-send" style={stepCard(t)}>
              <p style={stepTitle(t)}>Send emails</p>
              <p style={helperText(t)}>
                Bulk-sends to every recipient still marked unsent or failed. Use per-row
                Resend for a single person.
              </p>
              <div>
                <button
                  type="button"
                  style={button(t, "primary", {
                    disabled: isPending || pendingEmailCount === 0,
                  })}
                  disabled={isPending || pendingEmailCount === 0}
                  onClick={onSendUnsent}
                  title={
                    pendingEmailCount === 0
                      ? allEmailsSent
                        ? "All emails sent"
                        : "No unsent or failed recipients"
                      : undefined
                  }
                >
                  {pendingEmailCount === 0
                    ? allEmailsSent
                      ? "All emails sent"
                      : "No pending emails to send"
                    : `Send emails to pending recipients (${pendingEmailCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modsBlocked ? (
        <p style={{ fontFamily: t.sans, fontSize: 12, color: t.warn, marginBottom: 16 }}>
          {campaign.status === "archived"
            ? "Campaign archived — generation and email actions disabled. Existing codes still follow Stripe rules."
            : "Campaign expired — archived automatically. Generation and email actions disabled."}
        </p>
      ) : null}

      {recipients.length === 0 ? (
        <div style={adminEmptyStyle(t)}>No recipients yet.</div>
      ) : (
        <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
          <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
            <table className="fuel-admin-table" style={adminTableStyle()}>
              <thead>
                <tr>
                  {["Email", "Code", "Send", "Redeemed", ""].map((h) => (
                    <th key={h} style={adminThStyle(t)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipients.map((row) => (
                  <tr key={row.id}>
                    <td style={adminTdStyle(t, { mono: true })}>{row.email}</td>
                    <td style={adminTdStyle(t, { mono: true })}>{row.promotionCode}</td>
                    <td style={adminTdStyle(t)}>
                      <Chip t={t} tone={sendTone(row.sendStatus)}>
                        {sendLabel(row.sendStatus)}
                      </Chip>
                      {row.sendError ? (
                        <div style={{ fontSize: 10, color: t.warn, marginTop: 4 }}>
                          {row.sendError}
                        </div>
                      ) : null}
                    </td>
                    <td style={adminTdStyle(t)}>
                      {row.redeemedAt ? (
                        <Chip t={t} tone="positive">
                          {new Date(row.redeemedAt).toLocaleDateString()}
                        </Chip>
                      ) : (
                        <span style={{ color: t.muted }}>—</span>
                      )}
                    </td>
                    <td style={adminTdActionsStyle(t)}>
                      <button
                        type="button"
                        style={button(t, "ghost", {
                          disabled: isPending || modsBlocked,
                        })}
                        disabled={isPending || modsBlocked}
                        title={
                          modsBlocked
                            ? "Archived or expired campaigns cannot resend email"
                            : undefined
                        }
                        onClick={() => onResend(row.id)}
                      >
                        Resend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
