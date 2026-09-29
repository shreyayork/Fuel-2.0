import type {
  ActionCostRow,
  BillingInvoiceListResponse,
  CreditActionType,
  CreditSnapshot,
  CreditUsageReport,
  ProPlanDto,
  SubscribedBilling,
  TopUpPackDto,
  UsagePeriod,
} from "@/lib/credits/types";

export async function fetchCreditSnapshot(): Promise<CreditSnapshot> {
  const res = await fetch("/api/credits/snapshot", { cache: "no-store" });
  if (!res.ok) throw new Error("snapshot_fetch_failed");
  const json = (await res.json()) as { snapshot: CreditSnapshot };
  return json.snapshot;
}

export async function fetchCreditUsage(
  period: UsagePeriod,
  user: string = "all",
  customRange?: { start: string; end: string } | null,
): Promise<CreditUsageReport> {
  const params = new URLSearchParams({ period });
  // Pre-encode so plus-addressed emails (local+tag@domain) survive intermediaries
  // that apply form-urlencoded decoding (`+` → space) before Next sees the URL.
  // The API normalizes via normalizeUsageUserFilter (decode + restore `+`).
  params.set("user", user === "all" ? "all" : encodeURIComponent(user));
  if (customRange?.start && customRange?.end) {
    params.set("from", customRange.start);
    params.set("to", customRange.end);
  }
  const res = await fetch(`/api/credits/usage?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("usage_fetch_failed");
  return (await res.json()) as CreditUsageReport;
}

/** Sync ledger from Stripe after Checkout redirect (covers missed webhooks). */
export async function reconcileCreditsAfterCheckout(): Promise<CreditSnapshot | null> {
  const res = await fetch("/api/credits/reconcile", {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { snapshot: CreditSnapshot };
  return json.snapshot;
}

export async function fetchActionCosts(): Promise<ActionCostRow[]> {
  const res = await fetch("/api/credits/action-costs", { cache: "no-store" });
  if (!res.ok) throw new Error("action_costs_fetch_failed");
  const json = (await res.json()) as { costs: ActionCostRow[] };
  return json.costs;
}

export async function fetchTopUpPacks(): Promise<TopUpPackDto[]> {
  const res = await fetch("/api/credits/topup-packs", { cache: "no-store" });
  if (!res.ok) throw new Error("topup_packs_fetch_failed");
  const json = (await res.json()) as { packs: TopUpPackDto[] };
  return json.packs;
}

export async function fetchProPlan(): Promise<ProPlanDto> {
  const res = await fetch("/api/credits/pro-plan", { cache: "no-store" });
  if (!res.ok) throw new Error("pro_plan_fetch_failed");
  const json = (await res.json()) as { plan: ProPlanDto };
  return json.plan;
}

export async function fetchSubscribedBilling(): Promise<SubscribedBilling | null> {
  const res = await fetch("/api/credits/subscribed-billing", { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { billing: SubscribedBilling | null };
  return json.billing;
}

export async function postTryAction(
  action: CreditActionType,
  referenceId?: string,
): Promise<
  | { allowed: true; snapshot: CreditSnapshot }
  | {
      allowed: false;
      reason: "blocked" | "insufficient";
      snapshot: CreditSnapshot;
    }
> {
  const res = await fetch("/api/credits/try-action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, referenceId }),
  });
  if (!res.ok) throw new Error("try_action_failed");
  return (await res.json()) as
    | { allowed: true; snapshot: CreditSnapshot }
    | {
        allowed: false;
        reason: "blocked" | "insufficient";
        snapshot: CreditSnapshot;
      };
}

export async function startSubscriptionCheckout(
  billingCycle: "monthly" | "annual",
  promotionCode?: string,
): Promise<string> {
  const res = await fetch("/api/credits/checkout/subscription", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      billingCycle,
      ...(promotionCode?.trim()
        ? { promotionCode: promotionCode.trim() }
        : {}),
    }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      message?: string;
    };
    if (json.error === "coupon_invalid" && json.message) {
      throw new Error(json.message);
    }
    throw new Error(json.error ?? json.message ?? "checkout_failed");
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}

export async function validateCheckoutPromotion(
  code: string,
  billingCycle: "monthly" | "annual",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch("/api/credits/checkout/validate-promo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, billingCycle }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    error?: string;
  };
  if (res.ok && json.ok) return { ok: true };
  return {
    ok: false,
    message:
      json.message ??
      "That coupon code is not valid.",
  };
}

export async function startTopUpCheckout(packSlug: string): Promise<string> {
  const res = await fetch("/api/credits/checkout/topup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ packSlug }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (json.error === "topups_require_pro") {
      throw new Error("topups_require_pro");
    }
    throw new Error("topup_checkout_failed");
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}

export async function openBillingPortal(): Promise<string> {
  const res = await fetch("/api/credits/portal", { method: "POST" });
  if (!res.ok) throw new Error("portal_failed");
  const json = (await res.json()) as { url: string };
  return json.url;
}

export async function fetchBillingInvoices(opts?: {
  limit?: number;
  offset?: number;
}): Promise<BillingInvoiceListResponse> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const res = await fetch(`/api/credits/invoices${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (res.status === 403) {
    throw new Error("invoices_forbidden");
  }
  if (!res.ok) throw new Error("invoices_fetch_failed");
  return (await res.json()) as BillingInvoiceListResponse;
}

/**
 * Resolve a short-lived signed URL for the Fuel-branded invoice PDF.
 * `downloadPath` comes from the invoice DTO — never a raw storage key.
 */
export async function fetchInvoicePdfDownload(
  downloadPath: string,
): Promise<{ url: string; filename: string }> {
  const res = await fetch(downloadPath, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 403) throw new Error("invoices_forbidden");
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "invoice_pdf_download_failed");
  }
  return (await res.json()) as { url: string; filename: string };
}

/** Fetch the authorized Fuel PDF for inline browser viewing. */
export async function fetchInvoicePdfView(viewPath: string): Promise<Blob> {
  const res = await fetch(viewPath, { cache: "no-store" });
  if (res.status === 403) throw new Error("invoices_forbidden");
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "invoice_pdf_view_failed");
  }
  if (!res.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error("invoice_pdf_view_invalid_response");
  }
  return res.blob();
}

export async function cancelSubscription(): Promise<CreditSnapshot> {
  const res = await fetch("/api/credits/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "cancel" }),
  });
  if (!res.ok) throw new Error("cancel_failed");
  const json = (await res.json()) as { snapshot: CreditSnapshot };
  return json.snapshot;
}

export async function resumeSubscription(): Promise<CreditSnapshot> {
  const res = await fetch("/api/credits/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "resume" }),
  });
  if (!res.ok) throw new Error("resume_failed");
  const json = (await res.json()) as { snapshot: CreditSnapshot };
  return json.snapshot;
}

export async function changeBillingCycle(
  billingCycle: "monthly" | "annual",
  promotionCode?: string,
): Promise<
  | { snapshot: CreditSnapshot; applied: "immediate" | "at_period_end" }
  | { applied: "payment_required"; url: string }
> {
  const res = await fetch("/api/credits/change-cycle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      billingCycle,
      ...(promotionCode?.trim()
        ? { promotionCode: promotionCode.trim() }
        : {}),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(body?.message || body?.error || "cycle_change_failed");
  }
  const json = (await res.json()) as {
    snapshot?: CreditSnapshot;
    applied: "immediate" | "at_period_end" | "payment_required";
    url?: string;
  };
  if (json.applied === "payment_required") {
    if (!json.url) throw new Error("cycle_change_payment_url_missing");
    return { applied: "payment_required", url: json.url };
  }
  if (!json.snapshot) throw new Error("cycle_change_failed");
  return { snapshot: json.snapshot, applied: json.applied };
}

export async function markMonthlyLowToastShown(): Promise<void> {
  await fetch("/api/credits/mark-low-toast", { method: "POST" });
}

/** Apply a server-returned snapshot immediately (no extra round trip). */
export function emitCreditSnapshot(snapshot: CreditSnapshot): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("fuel:credits-snapshot", { detail: snapshot }));
}

/** Refetch credits from the API (fallback when snapshot is not in the response). */
export function refreshCreditsSnapshot(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("fuel:credits-refresh"));
}

export function syncCreditsAfterAction(snapshot?: CreditSnapshot): void {
  if (snapshot) {
    emitCreditSnapshot(snapshot);
    return;
  }
  refreshCreditsSnapshot();
}
