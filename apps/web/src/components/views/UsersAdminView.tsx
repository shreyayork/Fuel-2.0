"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import { Chip, type ChipTone } from "../atoms";
import { useTheme } from "../ThemeContext";
import { AdminPageHeader } from "./AdminPageHeader";
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
import { MagicShimmer } from "../ai/MagicShimmer";
import {
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZES,
  type ListPageSize} from "@/lib/list-pagination";
import type {
  SuperAdminPlanKind,
  SuperAdminUserLifecycle,
  SuperAdminUserRow,
  SuperAdminUsersResponse,
  SuperAdminUsersSortDir} from "@/lib/super-admin/user-lifecycle";
import { sendCouponsToUsersAction } from "@/app/(super-admin)/super-admin/coupons/actions";
import type { SuperAdminUserInvoiceRow } from "@/lib/super-admin/user-invoices";
import { useToast } from "../toast/ToastProvider";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_ROW_COUNT = 8;

type CouponCampaignOption = {
  id: string;
  name: string;
  audience: string;
  status: string;
  globalPromotionCode: string | null;
};



/** Keep table readable while scrolling; avoids squeezing 8 columns into a sliver. */
const USERS_TABLE_MIN_WIDTH = 960;


/** Long values must not expand the page — ellipsis inside the scrollable table. */
function truncateCell(
  t: Theme,
  opts?: { mono?: boolean; strong?: boolean; maxWidth?: number },
): CSSProperties {
  return {
    ...adminTdStyle(t),
    ...(opts?.strong ? { color: t.ink, fontWeight: 500 } : null),
    ...(opts?.mono ? { fontFamily: t.mono, fontSize: 12 } : null),
    maxWidth: opts?.maxWidth ?? 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"};
}


function lifecycleTone(key: SuperAdminUserLifecycle): ChipTone {
  switch (key) {
    case "onboarding_completed":
      return "positive";
    case "account_created":
      return "accent";
    case "onboarding_incomplete":
      return "warn";
    case "email_unconfirmed":
      return "warn";
    case "disabled":
      return "negative";
  }
}

function planTone(kind: SuperAdminPlanKind): ChipTone {
  switch (kind) {
    case "pro":
      return "accent";
    case "pro_canceling":
      return "warn";
    case "expired":
      return "negative";
    case "free":
      return "ghost";
    case "none":
      return "ghost";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"});
}

function errorMessage(status: number, code: string | null): string {
  if (status === 429 || code === "rate_limited") {
    return "Cognito is rate-limiting. Try again in a moment.";
  }
  if (status === 503 || code === "unavailable") {
    return "Unable to load users. Cognito or the database may be unavailable.";
  }
  return "Unable to load users. Try again.";
}

export function UsersAdminView() {
  const t = useTheme();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortDir, setSortDir] = useState<SuperAdminUsersSortDir>("desc");
  const [limit, setLimit] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [users, setUsers] = useState<SuperAdminUserRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SuperAdminUserRow | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [campaigns, setCampaigns] = useState<CouponCampaignOption[]>([]);
  const [sendCampaignId, setSendCampaignId] = useState("");
  const [sendingCoupons, setSendingCoupons] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCursor(null);
    setHistory([]);
    setSelectedEmails(new Set());
  }, [debouncedSearch, limit, sortDir]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/super-admin/coupons")
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as { campaigns?: CouponCampaignOption[] };
        if (cancelled) return;
        const list = body.campaigns ?? [];
        setCampaigns(list.filter((c) => c.status === "active"));
      })
      .catch(() => {
        /* non-blocking */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(limit),
      sort: sortDir});
    if (debouncedSearch) {
      // Pre-encode so plus-addressed emails survive CloudFront `+` → space.
      params.set("q", encodeURIComponent(debouncedSearch));
    }
    if (cursor) params.set("cursor", cursor);
    void fetch(`/api/super-admin/users?${params.toString()}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | SuperAdminUsersResponse
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          const code = body && "error" in body ? body.error ?? null : null;
          setError(errorMessage(res.status, code));
          setUsers([]);
          setNextCursor(null);
          setWarning(null);
          return;
        }
        const data = body as SuperAdminUsersResponse;
        setUsers(data.users);
        setNextCursor(data.nextCursor);
        setWarning(
          data.warning === "memberships_unavailable"
            ? "Workspace membership could not be loaded. Showing Cognito signup data only."
            : data.warning === "cognito_unavailable"
              ? "Cognito is unavailable. Showing application memberships only."
              : null,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load users. Try again.");
        setUsers([]);
        setNextCursor(null);
        setWarning(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, limit, cursor, sortDir]);

  const onNext = () => {
    if (!nextCursor) return;
    setHistory((prev) => [...prev, cursor]);
    setCursor(nextCursor);
  };
  const onPrev = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1] ?? null;
    setHistory((h) => h.slice(0, -1));
    setCursor(prev);
  };

  const toggleSignedUpSort = () => {
    setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const allPageSelected =
    users.length > 0 && users.every((u) => selectedEmails.has(u.email));

  const toggleAllPage = () => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const u of users) next.delete(u.email);
      } else {
        for (const u of users) next.add(u.email);
      }
      return next;
    });
  };

  const onSendCoupons = () => {
    if (!sendCampaignId || selectedEmails.size === 0) return;
    const fd = new FormData();
    fd.set("campaignId", sendCampaignId);
    fd.set("emails", [...selectedEmails].join("\n"));
    setSendingCoupons(true);
    void sendCouponsToUsersAction(fd)
      .then((result) => {
        if (result.ok) {
          showToast({
            message: result.message ?? "Coupon emails sent.",
            variant: "success"});
          setSelectedEmails(new Set());
        } else {
          showToast({ message: result.error, variant: "error" });
        }
      })
      .finally(() => setSendingCoupons(false));
  };

  return (
    <div className="fuel-admin-page" style={{ ...adminPageStyle(), maxWidth: "100%" }}>
      <AdminPageHeader
        t={t}
        title="Users"
        description="Reconcile Cognito signups with accounts, onboarding, and plans."
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          minWidth: 0,
          maxWidth: "100%"}}
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name or email"
          autoComplete="off"
          aria-label="Search users by name or email"
          style={{ ...adminInputStyle(t), minWidth: 0, flex: "1 1 220px" }}
        />
        {selectedEmails.size > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              flex: "1 1 320px"}}
          >
            <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
              {selectedEmails.size} selected
            </span>
            <select
              value={sendCampaignId}
              onChange={(e) => setSendCampaignId(e.target.value)}
              aria-label="Coupon campaign"
              style={{ ...adminInputStyle(t), maxWidth: 280 }}
            >
              <option value="">Pick campaign…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.audience})
                </option>
              ))}
            </select>
            <button
              type="button"
              style={adminBtnStyle(t, "primary")}
              disabled={!sendCampaignId || sendingCoupons}
              onClick={onSendCoupons}
            >
              {sendingCoupons ? "Sending…" : "Send coupon emails"}
            </button>
          </div>
        ) : null}
      </div>

      {warning ? (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            border: `1px solid ${t.warn}`,
            borderRadius: 6,
            color: t.warn,
            fontFamily: t.sans,
            fontSize: 12,
            background: t.panel}}
        >
          {warning}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            padding: 24,
            textAlign: "center",
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.negative}}
        >
          {error}
        </div>
      ) : (
        <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
          <div
            className="fuel-admin-table-wrap"
            style={adminTableScrollStyle()}
            aria-busy={loading || undefined}
          >
            <table
              className="fuel-admin-table"
              style={{
                ...adminTableStyle(),
                minWidth: USERS_TABLE_MIN_WIDTH}}
            >
              <thead>
                <tr>
                  <th scope="col" style={adminThStyle(t)}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAllPage}
                      aria-label="Select all users on this page"
                      disabled={loading || users.length === 0}
                    />
                  </th>
                  {(["Name", "Email", "Lifecycle", "Workspace", "Role", "Plan"] as const).map(
                    (h) => (
                      <th key={h} scope="col" style={adminThStyle(t)}>
                        {h}
                      </th>
                    ),
                  )}
                  <th
                    scope="col"
                    style={adminThStyle(t)}
                    aria-sort={sortDir === "desc" ? "descending" : "ascending"}
                  >
                    <button
                      type="button"
                      onClick={toggleSignedUpSort}
                      aria-label={
                        sortDir === "desc"
                          ? "Signed up, newest first. Activate to sort oldest first."
                          : "Signed up, oldest first. Activate to sort newest first."
                      }
                      style={{
                        alignItems: "center",
                        background: "transparent",
                        border: "none",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        font: "inherit",
                        gap: 4,
                        letterSpacing: "inherit",
                        padding: 0,
                        textTransform: "inherit"}}
                    >
                      Signed up
                      <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    </button>
                  </th>
                  <th scope="col" style={adminThStyle(t)}>
                    <span
                      style={{
                        border: 0,
                        clip: "rect(0, 0, 0, 0)",
                        height: 1,
                        margin: -1,
                        overflow: "hidden",
                        padding: 0,
                        position: "absolute",
                        whiteSpace: "nowrap",
                        width: 1}}
                    >
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows t={t} />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...adminTdStyle(t), textAlign: "center", color: t.muted }}>
                      {debouncedSearch
                        ? "No users match that search."
                        : "No users in this pool yet."}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const name = user.name ?? "—";
                    const workspace = user.workspace?.name ?? "—";
                    return (
                      <tr key={user.email}>
                        <td style={adminTdStyle(t)}>
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(user.email)}
                            onChange={() => toggleEmail(user.email)}
                            aria-label={`Select ${user.email}`}
                          />
                        </td>
                        <td style={truncateCell(t, { strong: true, maxWidth: 160 })} title={name}>
                          {name}
                        </td>
                        <td
                          style={truncateCell(t, { mono: true, maxWidth: 240 })}
                          title={user.email}
                        >
                          {user.email}
                        </td>
                        <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                          <Chip t={t} tone={lifecycleTone(user.lifecycle.key)}>
                            {user.lifecycle.label}
                          </Chip>
                        </td>
                        <td style={truncateCell(t, { maxWidth: 140 })} title={workspace}>
                          {workspace}
                        </td>
                        <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                          {user.workspace?.role ?? "—"}
                        </td>
                        <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                          <Chip t={t} tone={planTone(user.plan.kind)}>
                            {user.plan.label}
                          </Chip>
                        </td>
                        <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                          {formatDate(user.signedUpAt)}
                        </td>
                        <td style={adminTdActionsStyle(t)}>
                          <button
                            type="button"
                            onClick={() => setSelected(user)}
                            style={adminBtnStyle(t, "ghost")}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!error && !loading && users.length > 0 ? (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            marginTop: 14}}
        >
          <span style={{ color: t.muted, fontFamily: t.sans, fontSize: 12 }}>
            {users.length} user{users.length === 1 ? "" : "s"} this page
          </span>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <label
              style={{
                alignItems: "center",
                color: t.muted,
                display: "inline-flex",
                fontFamily: t.sans,
                fontSize: 12,
                gap: 6}}
            >
              Per page
              <select
                aria-label="Users per page"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) as ListPageSize)}
                style={{
                  background: t.panel,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 6,
                  color: t.ink,
                  cursor: "pointer",
                  fontFamily: t.sans,
                  fontSize: 12,
                  padding: "5px 8px"}}
              >
                {LIST_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={history.length === 0}
              style={{
                ...adminBtnStyle(t),
                opacity: history.length === 0 ? 0.55 : 1,
                cursor: history.length === 0 ? "not-allowed" : "pointer"}}
              onClick={onPrev}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!nextCursor}
              style={{
                ...adminBtnStyle(t),
                opacity: !nextCursor ? 0.55 : 1,
                cursor: !nextCursor ? "not-allowed" : "pointer"}}
              onClick={onNext}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <UserDetailModal t={t} user={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function SkeletonRows({ t }: { t: Theme }) {
  const widths = ["24px", "88px", "140px", "96px", "110px", "56px", "64px", "80px", "44px"] as const;
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
        <tr key={`skel-${row}`} aria-hidden>
          {widths.map((width, col) => (
            <td key={col} style={adminTdStyle(t)}>
              <MagicShimmer theme={t} width={width} height={14} rounded={4} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function UserDetailModal({
  t,
  user,
  onClose}: {
  t: Theme;
  user: SuperAdminUserRow;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"user" | "payments">("user");
  const [invoices, setInvoices] = useState<SuperAdminUserInvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const syncInvoices = useCallback(() => {
    let cancelled = false;
    setInvoicesLoading(true);
    setInvoicesError(null);
    void fetch("/api/super-admin/users/invoices/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email })})
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          invoices?: SuperAdminUserInvoiceRow[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok) {
          setInvoicesError(
            body?.error === "stripe_not_configured"
              ? "Stripe is not configured — cannot load invoices."
              : "Unable to load invoices from Stripe.",
          );
          setInvoices([]);
          return;
        }
        setInvoices(body?.invoices ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setInvoicesError("Unable to load invoices from Stripe.");
        setInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setInvoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.email]);

  useEffect(() => {
    if (tab !== "payments") return;
    return syncInvoices();
  }, [tab, syncInvoices]);

  const tabBtn = (id: "user" | "payments", label: string): CSSProperties => ({
    padding: "6px 12px",
    background: tab === id ? t.ink : "transparent",
    color: tab === id ? t.bg : t.inkSoft,
    border: `1px solid ${tab === id ? t.ink : t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer"});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="super-admin-user-detail-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: t.overlay,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
        zIndex: 100}}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: tab === "payments" ? 820 : 640,
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 22,
          display: "grid",
          gap: 14,
          maxHeight: "calc(100vh - 96px)",
          overflowY: "auto"}}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div
              id="super-admin-user-detail-title"
              style={{ fontFamily: t.sans, fontSize: 16, fontWeight: 600, color: t.ink }}
            >
              {user.name ?? user.email}
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, marginTop: 4 }}>
              {user.email}
            </div>
          </div>
          <button type="button" onClick={onClose} style={adminBtnStyle(t, "ghost")}>
            Close
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={tabBtn("user", "User")} onClick={() => setTab("user")}>
            User
          </button>
          <button
            type="button"
            style={tabBtn("payments", "Invoice History")}
            onClick={() => setTab("payments")}
          >
            Invoice History
          </button>
        </div>

        {tab === "user" ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Chip t={t} tone={lifecycleTone(user.lifecycle.key)}>
                {user.lifecycle.label}
              </Chip>
              <Chip t={t} tone={planTone(user.plan.kind)}>
                {user.plan.label}
              </Chip>
              {user.emailVerified === true ? (
                <Chip t={t} tone="positive">
                  Email verified
                </Chip>
              ) : user.emailVerified === false ? (
                <Chip t={t} tone="warn">
                  Email not verified
                </Chip>
              ) : null}
            </div>

            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 160px) minmax(0, 1fr)",
                gap: "8px 12px",
                margin: 0,
                fontFamily: t.sans,
                fontSize: 13,
                minWidth: 0}}
            >
              <Detail label="Cognito status" value={user.cognitoStatus ?? "—"} t={t} />
              <Detail
                label="Enabled"
                value={user.enabled == null ? "—" : user.enabled ? "Yes" : "No"}
                t={t}
              />
              <Detail label="Signed up" value={formatDate(user.signedUpAt)} t={t} />
              <Detail
                label="Account created"
                value={user.lifecycle.accountCreated ? "Yes" : "No"}
                t={t}
              />
              <Detail
                label="Onboarding completed"
                value={
                  user.lifecycle.onboardingCompleted
                    ? "Yes (claimed a company)"
                    : "No"
                }
                t={t}
              />
              <Detail
                label="Top-up credits"
                value={
                  user.plan.topUpBalance == null
                    ? "—"
                    : String(user.plan.topUpBalance)
                }
                t={t}
              />
              <Detail
                label="Plan period end"
                value={formatDate(user.plan.periodEndsAt)}
                t={t}
              />
            </dl>

            <div>
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 8}}
              >
                Workspaces
              </div>
              {user.workspaces.length === 0 ? (
                <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted }}>
                  No Fuel account yet — user has not claimed a company.
                </div>
              ) : (
                <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
                  <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
                    <table
                      className="fuel-admin-table"
                      style={{
                        ...adminTableStyle(),
                        minWidth: 480}}
                    >
                      <thead>
                        <tr>
                          {["Workspace", "Role", "Type", "Company", "Plan"].map((h) => (
                            <th key={h} scope="col" style={adminThStyle(t)}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {user.workspaces.map((ws) => (
                          <tr key={ws.accountId}>
                            <td style={truncateCell(t, { maxWidth: 160 })} title={ws.name}>
                              {ws.name}
                            </td>
                            <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>{ws.role}</td>
                            <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                              {ws.type === "PERSONAL" ? "Personal" : "Organization"}
                            </td>
                            <td
                              style={truncateCell(t, { maxWidth: 140 })}
                              title={ws.companyName ?? "—"}
                            >
                              {ws.companyName ?? "—"}
                            </td>
                            <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                              {ws.plan.label}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
                marginBottom: 12}}
            >
              Invoice history for this user&apos;s accounts.
            </div>
            {invoicesLoading ? (
              <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted }}>
                Loading invoices…
              </div>
            ) : invoicesError ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontFamily: t.sans, fontSize: 13, color: t.negative }}>
                  {invoicesError}
                </div>
                <button
                  type="button"
                  style={{ ...adminBtnStyle(t, "ghost"), justifySelf: "start" }}
                  onClick={() => syncInvoices()}
                >
                  Retry
                </button>
              </div>
            ) : invoices.length === 0 ? (
              <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted }}>
                No invoices found for this user&apos;s accounts.
              </div>
            ) : (
              <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
                <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
                  <table
                    className="fuel-admin-table"
                    style={{
                      ...adminTableStyle(),
                      minWidth: 640}}
                  >
                    <thead>
                      <tr>
                        {["Invoice", "Date", "Status", "Total", "Coupon", ""].map((h) => (
                          <th
                            key={h || "actions"}
                            scope="col"
                            style={adminThStyle(t, h === "Total" ? { numeric: true } : undefined)}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const total = `${(inv.totalCents / 100).toFixed(2)} ${inv.currency.toUpperCase()}`;
                        return (
                          <tr key={inv.invoiceId}>
                            <td style={truncateCell(t, { mono: true, maxWidth: 100 })}>
                              #{inv.invoiceId}
                              {inv.invoiceNumber ? (
                                <div style={{ color: t.muted, fontSize: 11 }}>
                                  {inv.invoiceNumber}
                                </div>
                              ) : null}
                            </td>
                            <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                              {formatDate(inv.invoiceDate)}
                            </td>
                            <td style={{ ...adminTdStyle(t), whiteSpace: "nowrap" }}>
                              {inv.invoiceStatus}
                            </td>
                            <td style={adminTdStyle(t, { numeric: true })}>{total}</td>
                            <td style={adminTdStyle(t)}>
                              {inv.couponApplied ? (
                                <div>
                                  <Chip t={t} tone="accent">
                                    Coupon
                                  </Chip>
                                  {inv.couponCode ? (
                                    <div
                                      style={{
                                        fontFamily: t.mono,
                                        fontSize: 11,
                                        color: t.muted,
                                        marginTop: 4}}
                                    >
                                      {inv.couponCode}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <span style={{ color: t.muted }}>—</span>
                              )}
                            </td>
                            <td style={adminTdActionsStyle(t)}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                {inv.fuelPdfViewPath ? (
                                  <a
                                    href={inv.fuelPdfViewPath}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      ...adminBtnStyle(t, "ghost"),
                                      textDecoration: "none",
                                      display: "inline-block"}}
                                  >
                                    View
                                  </a>
                                ) : null}
                                {inv.fuelPdfDownloadPath ? (
                                  <a
                                    href={inv.fuelPdfDownloadPath}
                                    style={{
                                      ...adminBtnStyle(t, "ghost"),
                                      textDecoration: "none",
                                      display: "inline-block"}}
                                  >
                                    Download
                                  </a>
                                ) : null}
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
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  t,
  label,
  value}: {
  t: Theme;
  label: string;
  value: string;
}) {
  return (
    <>
      <dt style={{ color: t.muted, margin: 0 }}>{label}</dt>
      <dd style={{ color: t.inkSoft, margin: 0 }}>{value}</dd>
    </>
  );
}

