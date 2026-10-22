export type AdvisorConnectionStatus =
  | "not_connected"
  | "request_pending"
  | "invite_sent"
  | "connected"
  | "declined"
  | "expired"
  | "revoked";

export type AdvisorConnectionPermissions = {
  sharedProfile: boolean;
  approvedBenchmarks: boolean;
  sharedIntelligence: boolean;
  sharedInitiatives: boolean;
  sharedDataRoomFiles: boolean;
  sharedPublishedBrief: boolean;
};

export type AdvisorConnectionRecord = {
  companyId: string;
  companyName: string;
  companyDomain: string;
  advisorId: string;
  advisorName: string;
  source?: "invite" | "request" | "crunchbase";
  status: AdvisorConnectionStatus;
  recipientEmail?: string;
  inviteToken?: string;
  inviteExpiresAt?: number;
  requestedAt?: number;
  respondedAt?: number;
  revokedAt?: number;
  termsVersion?: string;
  permissions?: AdvisorConnectionPermissions;
};

export const DEFAULT_ADVISOR_ID = "york-ie";
export const DEFAULT_ADVISOR_NAME = "York IE";
/** Portfolio demo company — York IE connection replay for investor sign-in. */
export const DEMO_INVESTOR_CONNECTION_COMPANY_ID = "patriotpay";
export const DEMO_INVESTOR_CONNECTION_DOMAIN = "patriotpay.com";
export const DEMO_INVESTOR_CONNECTION_NAME = "Patriot Pay";
export const ADVISOR_CONNECTION_TERMS_VERSION = "2026-10";
export const ADVISOR_CONNECTION_CHANGE_EVENT = "fuel-advisor-connections-changed";

export const DEFAULT_ADVISOR_PERMISSIONS: AdvisorConnectionPermissions = {
  sharedProfile: true,
  approvedBenchmarks: true,
  sharedIntelligence: false,
  sharedInitiatives: true,
  sharedDataRoomFiles: true,
  sharedPublishedBrief: true,
};

const STORAGE_KEY = "fuel-advisor-connections:v1";
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function readAll(): Record<string, AdvisorConnectionRecord> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, AdvisorConnectionRecord> : {};
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, AdvisorConnectionRecord>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(ADVISOR_CONNECTION_CHANGE_EVENT));
  } catch {
    /* Demo environments may block storage. */
  }
}

function normalizedCompanyId(companyId: string) {
  return companyId.trim().toLowerCase() || "unknown-company";
}

function freshToken(companyId: string) {
  const seed = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${normalizedCompanyId(companyId)}.${seed}`;
}

function normalizeExpiry(record: AdvisorConnectionRecord): AdvisorConnectionRecord {
  if (
    record.status === "invite_sent"
    && record.inviteExpiresAt
    && record.inviteExpiresAt <= Date.now()
  ) {
    return { ...record, status: "expired" };
  }
  return record;
}

export function sharedAdvisorAccess(companyId: string): AdvisorConnectionPermissions | null {
  const connection = getAdvisorConnection(companyId);
  if (connection?.status !== "connected") return null;
  return { ...DEFAULT_ADVISOR_PERMISSIONS, ...connection.permissions };
}

export function getAdvisorConnection(companyId: string): AdvisorConnectionRecord | null {
  const records = readAll();
  const key = normalizedCompanyId(companyId);
  const record = records[key];
  if (!record) return null;
  const normalized = normalizeExpiry(record);
  if (normalized !== record) {
    records[key] = normalized;
    writeAll(records);
  }
  return normalized;
}

export function getAdvisorConnectionForCompany(
  companyId: string,
  companyDomain?: string,
): AdvisorConnectionRecord | null {
  const direct = getAdvisorConnection(companyId);
  if (direct) return direct;
  const domain = companyDomain?.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
  if (!domain) return null;
  const match = Object.values(readAll()).find(record => record.companyDomain.toLowerCase() === domain);
  return match ? normalizeExpiry(match) : null;
}

export function getAdvisorConnectionByInviteToken(token: string): AdvisorConnectionRecord | null {
  if (!token.trim()) return null;
  const records = readAll();
  const match = Object.values(records).find(record => record.inviteToken === token);
  if (!match) return null;
  const normalized = normalizeExpiry(match);
  if (normalized !== match) {
    records[normalizedCompanyId(match.companyId)] = normalized;
    writeAll(records);
  }
  return normalized;
}

export function createAdvisorConnectionRequest(company: {
  id: string;
  name: string;
  domain: string;
  source?: "request" | "crunchbase";
}): AdvisorConnectionRecord {
  const records = readAll();
  const key = normalizedCompanyId(company.id);
  const next: AdvisorConnectionRecord = {
    companyId: company.id,
    companyName: company.name,
    companyDomain: company.domain,
    advisorId: DEFAULT_ADVISOR_ID,
    advisorName: DEFAULT_ADVISOR_NAME,
    source: company.source ?? "request",
    status: "request_pending",
    requestedAt: Date.now(),
  };
  records[key] = next;
  writeAll(records);
  return next;
}

export function createAdvisorInvite(company: {
  id: string;
  name: string;
  domain: string;
  email: string;
}): AdvisorConnectionRecord {
  const records = readAll();
  const key = normalizedCompanyId(company.id);
  const now = Date.now();
  const next: AdvisorConnectionRecord = {
    companyId: company.id,
    companyName: company.name,
    companyDomain: company.domain,
    advisorId: DEFAULT_ADVISOR_ID,
    advisorName: DEFAULT_ADVISOR_NAME,
    source: "invite",
    status: "invite_sent",
    recipientEmail: company.email.trim(),
    inviteToken: freshToken(company.id),
    inviteExpiresAt: now + INVITE_TTL_MS,
    requestedAt: now,
  };
  records[key] = next;
  writeAll(records);
  return next;
}

export function acceptAdvisorConnection(
  companyId: string,
  permissions: AdvisorConnectionPermissions = DEFAULT_ADVISOR_PERMISSIONS,
): AdvisorConnectionRecord | null {
  const records = readAll();
  const key = normalizedCompanyId(companyId);
  const current = records[key];
  if (!current) return null;
  const next: AdvisorConnectionRecord = {
    ...current,
    status: "connected",
    respondedAt: Date.now(),
    revokedAt: undefined,
    termsVersion: ADVISOR_CONNECTION_TERMS_VERSION,
    permissions,
  };
  records[key] = next;
  writeAll(records);
  return next;
}

export function declineAdvisorConnection(companyId: string): AdvisorConnectionRecord | null {
  const records = readAll();
  const key = normalizedCompanyId(companyId);
  const current = records[key];
  if (!current) return null;
  const next = { ...current, status: "declined" as const, respondedAt: Date.now() };
  records[key] = next;
  writeAll(records);
  return next;
}

export function revokeAdvisorConnection(companyId: string): AdvisorConnectionRecord | null {
  const records = readAll();
  const key = normalizedCompanyId(companyId);
  const current = records[key];
  if (!current) return null;
  const next = { ...current, status: "revoked" as const, revokedAt: Date.now() };
  records[key] = next;
  writeAll(records);
  return next;
}

export function advisorInviteUrl(record: AdvisorConnectionRecord): string {
  if (!record.inviteToken) return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("advisorInvite", record.inviteToken);
  return url.toString();
}

export function readAdvisorInviteTokenFromUrl(): string | null {
  try {
    return new URL(window.location.href).searchParams.get("advisorInvite");
  } catch {
    return null;
  }
}

export function clearAdvisorInviteTokenFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("advisorInvite")) return;
    url.searchParams.delete("advisorInvite");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore malformed preview URLs */
  }
}

function reopenAdvisorConnectionRecord(record: AdvisorConnectionRecord): AdvisorConnectionRecord {
  const now = Date.now();
  const isInvite = record.source === "invite" || Boolean(record.inviteToken);
  const {
    respondedAt: _respondedAt,
    revokedAt: _revokedAt,
    termsVersion: _termsVersion,
    permissions: _permissions,
    ...preserved
  } = record;
  if (isInvite) {
    return {
      ...preserved,
      status: "invite_sent",
      inviteExpiresAt: now + INVITE_TTL_MS,
      requestedAt: now,
    };
  }
  return {
    ...preserved,
    status: "request_pending",
    requestedAt: now,
  };
}

/** Re-open York IE ↔ company invites/requests so founder demo flow replays (investor invited founder). */
export function resetAdvisorInviteWorkflowDemoState() {
  const records = readAll();
  const reset = Object.fromEntries(
    Object.entries(records).map(([key, record]) => [key, reopenAdvisorConnectionRecord(record)]),
  );
  writeAll(reset);
  const patriot = getAdvisorConnectionForCompany(
    DEMO_INVESTOR_CONNECTION_COMPANY_ID,
    DEMO_INVESTOR_CONNECTION_DOMAIN,
  );
  if (!patriot || patriot.source === "crunchbase") {
    createAdvisorInvite({
      id: DEMO_INVESTOR_CONNECTION_COMPANY_ID,
      name: DEMO_INVESTOR_CONNECTION_NAME,
      domain: DEMO_INVESTOR_CONNECTION_DOMAIN,
      email: "founders@patriotpay.com",
    });
  }
}

/** @deprecated Use resetAdvisorInviteWorkflowDemoState */
export function resetAdvisorConnectionTestState() {
  resetAdvisorInviteWorkflowDemoState();
}

export function formatAdvisorConnectionStatus(status: AdvisorConnectionStatus): string {
  const labels: Record<AdvisorConnectionStatus, string> = {
    not_connected: "Not connected",
    request_pending: "Request pending",
    invite_sent: "Invite sent",
    connected: "Connected",
    declined: "Declined",
    expired: "Expired",
    revoked: "Revoked",
  };
  return labels[status];
}
