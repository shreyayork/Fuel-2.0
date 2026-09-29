import { isValidEmail } from "@/lib/is-valid-email";
import { parseListLimitParam, type ListPageSize } from "@/lib/list-pagination";
import { shouldRevertCanceledPro } from "@/lib/credits/logic";

export const SUPER_ADMIN_USERS_CURSOR_VERSION = 2 as const;
export const SUPER_ADMIN_USERS_QUERY_MAX = 100;
export const COGNITO_USER_ATTR_ALLOWLIST = [
  "email",
  "email_verified",
  "given_name",
  "family_name",
  "name",
] as const;

export type CognitoListStreamId = "t" | "email" | "given" | "family" | "name";

export type SuperAdminUsersSortDir = "asc" | "desc";

export type CognitoAdminUser = {
  username: string;
  email: string;
  name: string | null;
  emailVerified: boolean | null;
  status: string | null;
  enabled: boolean | null;
  createdAt: string | null;
};

export type SuperAdminUsersCursor = {
  v: typeof SUPER_ADMIN_USERS_CURSOR_VERSION;
  q: string;
  tokens: Partial<Record<CognitoListStreamId, string>>;
  done: CognitoListStreamId[];
  /**
   * Offset into a signed-up-sorted buffer (empty Cognito scan, DB fallback,
   * or search pages after merge).
   */
  o?: number;
  /** Bound sort direction — cursor invalid when the client changes sort. */
  s?: SuperAdminUsersSortDir;
};

export type SuperAdminUserLifecycle =
  | "disabled"
  | "email_unconfirmed"
  | "onboarding_incomplete"
  | "onboarding_completed"
  | "account_created";

export type SuperAdminPlanKind =
  | "none"
  | "free"
  | "pro"
  | "pro_canceling"
  | "expired";

export type SuperAdminPlanSummary = {
  kind: SuperAdminPlanKind;
  label: string;
  planSlug: string | null;
  cancelAtPeriodEnd: boolean;
  periodEndsAt: string | null;
  topUpBalance: number | null;
};

export type SuperAdminWorkspace = {
  accountId: string;
  name: string;
  type: "ORGANIZATION" | "PERSONAL";
  role: "owner" | "admin" | "member";
  isCreator: boolean;
  companyName: string | null;
  plan: SuperAdminPlanSummary;
  memberCreatedAt: string | null;
};

export type SuperAdminMembershipRow = {
  email: string;
  accountId: string;
  accountName: string;
  accountType: "ORGANIZATION" | "PERSONAL";
  role: "owner" | "admin" | "member";
  isCreator: boolean;
  companyName: string | null;
  planSlug: string | null;
  cancelAtPeriodEnd: boolean;
  periodEndsAt: number | null;
  topUpBalance: number | null;
  memberCreatedAt: string | null;
};

export type SuperAdminUserRow = {
  email: string;
  username: string;
  name: string | null;
  emailVerified: boolean | null;
  cognitoStatus: string | null;
  enabled: boolean | null;
  signedUpAt: string | null;
  lifecycle: {
    key: SuperAdminUserLifecycle;
    label: string;
    accountCreated: boolean;
    onboardingCompleted: boolean;
  };
  workspace: SuperAdminWorkspace | null;
  workspaces: SuperAdminWorkspace[];
  plan: SuperAdminPlanSummary;
};

export type SuperAdminUsersWarning =
  | "memberships_unavailable"
  | "cognito_unavailable";

export type SuperAdminUsersResponse = {
  users: SuperAdminUserRow[];
  nextCursor: string | null;
  warning?: SuperAdminUsersWarning;
};

export type CognitoListStream = {
  id: CognitoListStreamId;
  filter?: string;
};

/** Strip Cognito Filter metacharacters so values cannot break the query. */
export function sanitizeCognitoFilterValue(raw: string): string {
  return raw.replace(/["\\]/g, "").trim().slice(0, SUPER_ADMIN_USERS_QUERY_MAX);
}

export function normalizeUsersSearch(raw: string | null | undefined): string {
  let value = (raw ?? "").trim();
  if (!value) return "";
  if (/%[0-9A-Fa-f]{2}/.test(value)) {
    try {
      value = decodeURIComponent(value).trim();
    } catch {
      // Keep the trimmed value if decoding fails.
    }
  }
  // Emails never contain spaces; CloudFront may have turned `+` into one.
  if (value.includes("@")) {
    value = value.replace(/ /g, "+");
  }
  return value.slice(0, SUPER_ADMIN_USERS_QUERY_MAX);
}

/**
 * Cognito name filters are case-sensitive; stored names are usually Title Case.
 * Normalize search prefixes so "ann" still matches "Ann".
 */
export function cognitoNameSearchPrefix(raw: string): string {
  const q = sanitizeCognitoFilterValue(raw);
  if (!q) return "";
  return q.replace(/\S+/g, (word) => {
    if (word.length === 1) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/**
 * Cognito ListUsers Filter is one attribute per call and prefix (`^=`) or
 * exact (`=`). Partial matching is prefix-based — not contains.
 * `+` in emails is preserved (plus-addressing).
 */
export function buildCognitoListStreams(query: string): CognitoListStream[] {
  const q = sanitizeCognitoFilterValue(query);
  if (!q) return [{ id: "t" }];

  if (q.includes("@")) {
    const email = q.toLowerCase();
    const op = isValidEmail(email) ? "=" : "^=";
    return [{ id: "email", filter: `email ${op} "${email}"` }];
  }

  const emailPrefix = q.toLowerCase();
  const namePrefix = cognitoNameSearchPrefix(q);
  return [
    { id: "email", filter: `email ^= "${emailPrefix}"` },
    { id: "given", filter: `given_name ^= "${namePrefix}"` },
    { id: "family", filter: `family_name ^= "${namePrefix}"` },
    { id: "name", filter: `name ^= "${namePrefix}"` },
  ];
}

export function parseUsersSortDir(raw: string | null | undefined): SuperAdminUsersSortDir {
  return raw === "asc" ? "asc" : "desc";
}

/** Newest signup first by default; null/invalid dates sort last in both dirs. */
export function compareSignedUpAt(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: SuperAdminUsersSortDir,
): number {
  const ta = a ? Date.parse(a) : Number.NaN;
  const tb = b ? Date.parse(b) : Number.NaN;
  const aOk = Number.isFinite(ta);
  const bOk = Number.isFinite(tb);
  if (!aOk && !bOk) return 0;
  if (!aOk) return 1;
  if (!bOk) return -1;
  const diff = ta - tb;
  return dir === "asc" ? diff : -diff;
}

export function sortBySignedUpAt<T extends { createdAt?: string | null; signedUpAt?: string | null }>(
  rows: T[],
  dir: SuperAdminUsersSortDir,
): T[] {
  return [...rows].sort((left, right) =>
    compareSignedUpAt(
      left.signedUpAt ?? left.createdAt,
      right.signedUpAt ?? right.createdAt,
      dir,
    ),
  );
}

export function displayNameFromAttrs(opts: {
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
}): string | null {
  const combined = opts.name?.trim();
  if (combined) return combined;
  const joined = [opts.givenName, opts.familyName].filter(Boolean).join(" ").trim();
  return joined || null;
}

export function mapCognitoListUser(input: {
  username?: string;
  attributes?: Array<{ Name?: string; Value?: string }>;
  userStatus?: string;
  enabled?: boolean;
  userCreateDate?: Date;
}): CognitoAdminUser | null {
  const attrs: Partial<Record<(typeof COGNITO_USER_ATTR_ALLOWLIST)[number], string>> = {};
  for (const attr of input.attributes ?? []) {
    const name = attr.Name;
    if (!name || !attr.Value) continue;
    if ((COGNITO_USER_ATTR_ALLOWLIST as readonly string[]).includes(name)) {
      attrs[name as (typeof COGNITO_USER_ATTR_ALLOWLIST)[number]] = attr.Value;
    }
  }
  const email = attrs.email?.trim().toLowerCase();
  if (!email) return null;
  const emailVerified =
    attrs.email_verified == null ? null : attrs.email_verified.toLowerCase() === "true";
  return {
    username: input.username ?? email,
    email,
    name: displayNameFromAttrs({
      name: attrs.name,
      givenName: attrs.given_name,
      familyName: attrs.family_name,
    }),
    emailVerified,
    status: input.userStatus ?? null,
    enabled: input.enabled ?? null,
    createdAt: input.userCreateDate ? input.userCreateDate.toISOString() : null,
  };
}

export function deriveUserLifecycle(opts: {
  enabled: boolean | null;
  cognitoStatus: string | null;
  accountCreated: boolean;
  onboardingCompleted: boolean;
}): { key: SuperAdminUserLifecycle; label: string } {
  if (opts.enabled === false) {
    return { key: "disabled", label: "Disabled" };
  }
  if (opts.cognitoStatus === "UNCONFIRMED") {
    return { key: "email_unconfirmed", label: "Email unconfirmed" };
  }
  if (!opts.accountCreated) {
    return { key: "onboarding_incomplete", label: "Onboarding incomplete" };
  }
  if (opts.onboardingCompleted) {
    return { key: "onboarding_completed", label: "Onboarding completed" };
  }
  return { key: "account_created", label: "Account created" };
}

export function summarizePlan(input: {
  hasAccount: boolean;
  planSlug: string | null;
  cancelAtPeriodEnd: boolean;
  periodEndsAt: number | null;
  topUpBalance: number | null;
  now?: number;
}): SuperAdminPlanSummary {
  if (!input.hasAccount) {
    return {
      kind: "none",
      label: "No plan",
      planSlug: null,
      cancelAtPeriodEnd: false,
      periodEndsAt: null,
      topUpBalance: null,
    };
  }
  const periodEndsAt = input.periodEndsAt != null ? new Date(input.periodEndsAt).toISOString() : null;
  const topUpBalance = input.topUpBalance;
  if (!input.planSlug) {
    return {
      kind: "none",
      label: "No plan",
      planSlug: null,
      cancelAtPeriodEnd: false,
      periodEndsAt,
      topUpBalance,
    };
  }
  if (
    shouldRevertCanceledPro({
      plan: input.planSlug,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      periodEndsAt: input.periodEndsAt,
      now: input.now,
    })
  ) {
    return {
      kind: "expired",
      label: "Expired",
      planSlug: input.planSlug,
      cancelAtPeriodEnd: true,
      periodEndsAt,
      topUpBalance,
    };
  }
  if (input.planSlug === "pro" && input.cancelAtPeriodEnd) {
    return {
      kind: "pro_canceling",
      label: "Pro · Canceling",
      planSlug: "pro",
      cancelAtPeriodEnd: true,
      periodEndsAt,
      topUpBalance,
    };
  }
  if (input.planSlug === "pro") {
    return {
      kind: "pro",
      label: "Pro",
      planSlug: "pro",
      cancelAtPeriodEnd: false,
      periodEndsAt,
      topUpBalance,
    };
  }
  if (input.planSlug === "free") {
    return {
      kind: "free",
      label: "Free",
      planSlug: "free",
      cancelAtPeriodEnd: false,
      periodEndsAt,
      topUpBalance,
    };
  }
  return {
    kind: "none",
    label: input.planSlug,
    planSlug: input.planSlug,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    periodEndsAt,
    topUpBalance,
  };
}

export function pickPrimaryMembership(
  memberships: SuperAdminMembershipRow[],
): SuperAdminMembershipRow | null {
  if (memberships.length === 0) return null;
  return (
    memberships.find((m) => m.isCreator) ??
    memberships.find((m) => m.role === "owner") ??
    memberships[0] ??
    null
  );
}

function toWorkspace(row: SuperAdminMembershipRow, now?: number): SuperAdminWorkspace {
  return {
    accountId: row.accountId,
    name: row.accountName,
    type: row.accountType,
    role: row.role,
    isCreator: row.isCreator,
    companyName: row.companyName,
    memberCreatedAt: row.memberCreatedAt,
    plan: summarizePlan({
      hasAccount: true,
      planSlug: row.planSlug,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      periodEndsAt: row.periodEndsAt,
      topUpBalance: row.topUpBalance,
      now,
    }),
  };
}

export function assembleSuperAdminUserRows(
  cognitoUsers: CognitoAdminUser[],
  memberships: SuperAdminMembershipRow[],
  opts?: { now?: number },
): SuperAdminUserRow[] {
  const byEmail = new Map<string, SuperAdminMembershipRow[]>();
  for (const row of memberships) {
    const key = row.email.trim().toLowerCase();
    const list = byEmail.get(key) ?? [];
    list.push(row);
    byEmail.set(key, list);
  }

  return cognitoUsers.map((user) => {
    const mems = byEmail.get(user.email) ?? [];
    const workspaces = mems.map((m) => toWorkspace(m, opts?.now));
    const primaryMem = pickPrimaryMembership(mems);
    const primary = primaryMem ? toWorkspace(primaryMem, opts?.now) : null;
    const accountCreated = mems.length > 0;
    const onboardingCompleted = mems.some((m) => m.isCreator);
    const lifecycle = deriveUserLifecycle({
      enabled: user.enabled,
      cognitoStatus: user.status,
      accountCreated,
      onboardingCompleted,
    });
    const plan = primary?.plan ?? summarizePlan({
      hasAccount: false,
      planSlug: null,
      cancelAtPeriodEnd: false,
      periodEndsAt: null,
      topUpBalance: null,
      now: opts?.now,
    });
    return {
      email: user.email,
      username: user.username,
      name: user.name,
      emailVerified: user.emailVerified,
      cognitoStatus: user.status,
      enabled: user.enabled,
      signedUpAt: user.createdAt,
      lifecycle: {
        ...lifecycle,
        accountCreated,
        onboardingCompleted,
      },
      workspace: primary,
      workspaces,
      plan,
    };
  });
}

export function encodeUsersCursor(cursor: SuperAdminUsersCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

const COGNITO_STREAM_IDS: readonly CognitoListStreamId[] = [
  "t",
  "email",
  "given",
  "family",
  "name",
];

function isCognitoListStreamId(value: unknown): value is CognitoListStreamId {
  return (
    value === "t" ||
    value === "email" ||
    value === "given" ||
    value === "family" ||
    value === "name"
  );
}

export function decodeUsersCursor(
  raw: string,
  expectedQ: string,
  expectedSort: SuperAdminUsersSortDir,
): SuperAdminUsersCursor | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return "invalid";
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(trimmed, "base64url").toString("utf8"));
  } catch {
    return "invalid";
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return "invalid";
  const obj = json as Record<string, unknown>;
  if (obj.v !== SUPER_ADMIN_USERS_CURSOR_VERSION) return "invalid";
  if (typeof obj.q !== "string" || obj.q !== expectedQ) return "invalid";
  const sort = parseUsersSortDir(typeof obj.s === "string" ? obj.s : "desc");
  if (sort !== expectedSort) return "invalid";
  const tokens: SuperAdminUsersCursor["tokens"] = {};
  if (obj.tokens && typeof obj.tokens === "object" && !Array.isArray(obj.tokens)) {
    for (const id of COGNITO_STREAM_IDS) {
      const value = (obj.tokens as Record<string, unknown>)[id];
      if (typeof value === "string" && value.length > 0) tokens[id] = value;
    }
  }
  const done: CognitoListStreamId[] = [];
  if (Array.isArray(obj.done)) {
    for (const item of obj.done) {
      if (isCognitoListStreamId(item)) done.push(item);
    }
  }
  const o = typeof obj.o === "number" && Number.isFinite(obj.o) && obj.o >= 0 ? Math.trunc(obj.o) : undefined;
  return { v: SUPER_ADMIN_USERS_CURSOR_VERSION, q: expectedQ, tokens, done, o, s: sort };
}

export function parseSuperAdminUsersQuery(searchParams: URLSearchParams):
  | {
      ok: true;
      q: string;
      limit: ListPageSize;
      sort: SuperAdminUsersSortDir;
      cursor: SuperAdminUsersCursor | null;
    }
  | { ok: false; error: "invalid_cursor" } {
  const q = normalizeUsersSearch(searchParams.get("q"));
  const limit = parseListLimitParam(searchParams.get("limit"));
  const sort = parseUsersSortDir(searchParams.get("sort"));
  const rawCursor = searchParams.get("cursor");
  if (rawCursor == null || rawCursor === "") {
    return { ok: true, q, limit, sort, cursor: null };
  }
  const decoded = decodeUsersCursor(rawCursor, q, sort);
  if (decoded === "invalid") return { ok: false, error: "invalid_cursor" };
  return { ok: true, q, limit, sort, cursor: decoded };
}

export function escapeIlikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, "");
}

export function buildNextUsersCursor(opts: {
  q: string;
  sort: SuperAdminUsersSortDir;
  streams: Array<{ id: CognitoListStreamId; token?: string; done: boolean }>;
  localOffset?: number;
}): SuperAdminUsersCursor | null {
  const tokens: SuperAdminUsersCursor["tokens"] = {};
  const done: CognitoListStreamId[] = [];
  let anyOpen = false;
  for (const stream of opts.streams) {
    if (stream.done) {
      done.push(stream.id);
      continue;
    }
    anyOpen = true;
    if (stream.token) tokens[stream.id] = stream.token;
  }
  if (!anyOpen && opts.localOffset == null) return null;
  if (!anyOpen && opts.localOffset != null) {
    return {
      v: SUPER_ADMIN_USERS_CURSOR_VERSION,
      q: opts.q,
      tokens,
      done,
      o: opts.localOffset,
      s: opts.sort,
    };
  }
  return {
    v: SUPER_ADMIN_USERS_CURSOR_VERSION,
    q: opts.q,
    tokens,
    done,
    o: opts.localOffset,
    s: opts.sort,
  };
}

/** Offset cursor for a fully materialised, signed-up-sorted page. */
export function buildOffsetUsersCursor(opts: {
  q: string;
  sort: SuperAdminUsersSortDir;
  nextOffset: number;
}): SuperAdminUsersCursor {
  return {
    v: SUPER_ADMIN_USERS_CURSOR_VERSION,
    q: opts.q,
    tokens: {},
    done: [],
    o: opts.nextOffset,
    s: opts.sort,
  };
}
