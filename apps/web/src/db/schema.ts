import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  real,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  foreignKey,
  pgEnum,
  customType,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// pgvector integration — generated as `vector(dim)` in SQL.
const vector = (name: string, dim: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dim})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(",")}]`;
    },
    fromDriver(value: string): number[] {
      // node-pg usually returns vectors as strings; some drivers pass arrays.
      const raw = typeof value === "string" ? value : String(value ?? "");
      const trimmed = raw.replace(/^\[/, "").replace(/\]$/, "");
      return trimmed ? trimmed.split(",").map(Number) : [];
    },
  })(name);

// Ensure pgvector is active before the column is created.
export const enableVector = sql`CREATE EXTENSION IF NOT EXISTS vector`;

export const companyList = pgEnum("company_list", ["portfolio", "pipeline"]);
export const companyInvestmentType = pgEnum("company_investment_type", [
  "investment",
  "operating",
]);
export const teamType = pgEnum("team_type", [
  "investment",
  "operating",
  "external",
]);
export const initiativeKind = pgEnum("initiative_kind", [
  "continuous",
  "onetime",
]);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").notNull(),
  domain: text("domain"),
  stage: text("stage").notNull(),
  industry: text("industry").notNull(),
  list: companyList("list").notNull(),
  type: companyInvestmentType("type").notNull(),
  arr: real("arr").notNull(),
  arrGrowth: real("arr_growth").notNull(),
  burn: real("burn"),
  runway: integer("runway"),
  nrr: real("nrr").notNull(),
  fitScore: integer("fit_score").notNull(),
  hq: text("hq"),
  founded: integer("founded"),
  employees: integer("employees"),
  raising: boolean("raising").default(false).notNull(),
  targetRound: text("target_round"),
  hubspotStage: text("hubspot_stage"),
  hubspotId: text("hubspot_id"),
  hubspotOwner: text("hubspot_owner"),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  role: text("role").notNull(),
  team: teamType("team").notNull(),
  focus: text("focus").notNull(),
});

export const initiatives = pgTable("initiatives", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  kind: initiativeKind("kind").notNull(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  // continuous
  health: text("health"),
  automation: integer("automation"),
  since: text("since"),
  value: text("value"),
  signal: jsonb("signal").$type<number[]>(),
  // onetime
  pct: integer("pct"),
  due: text("due"),
  // ownership
  ownerId: integer("owner_id")
    .notNull()
    .references(() => people.id),
});

export const initiativeTeam = pgTable(
  "initiative_team",
  {
    initiativeId: integer("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.initiativeId, t.personId] })],
);

// Fixture-era signal feed (news-style events rendered on the fixture
// CompanyProfile). Renamed from "signals" so the new catalog can claim
// that name — this table is read-only for the fixture UI and will be
// removed when the fixture surfaces go away.
export const fixtureSignals = pgTable("fixture_signals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  at: text("at").notNull(),
  kind: text("kind").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const benchmarks = pgTable("benchmarks", {
  id: serial("id").primaryKey(),
  metric: text("metric").notNull().unique(),
  p25: text("p25").notNull(),
  p50: text("p50").notNull(),
  p75: text("p75").notNull(),
  you: text("you").notNull(),
  youIdx: real("you_idx").notNull(),
  invert: boolean("invert").default(false).notNull(),
});

// --- Benchmark cohorts: richer variant of `benchmarks` keyed on a cohort
//     (e.g. "b2b_saas:seed:us") so the explorer can filter by business
//     model / stage / vertical / geo. The legacy fixture-based `benchmarks`
//     table stays put for the existing compareToBenchmark skill until we
//     migrate it over. ---
export const benchmarkCohorts = pgTable("benchmark_cohorts", {
  id: text("id").primaryKey(),
  metric: text("metric").notNull(),
  /** e.g. "b2b_saas:seed:us" — stable stringification of dimensions. */
  cohortKey: text("cohort_key").notNull(),
  dimensions: jsonb("dimensions")
    .$type<{
      businessModel?: string | null;
      stage?: string | null;
      vertical?: string | null;
      geo?: string | null;
    }>()
    .notNull(),
  p25: real("p25"),
  p50: real("p50"),
  p75: real("p75"),
  p90: real("p90"),
  sampleSize: integer("sample_size"),
  /** Reporting period, e.g. "2026-q1". */
  period: text("period").notNull(),
  /** Source label: "york-portfolio" | "openview" | "bessemer" | "custom" | … */
  source: text("source").notNull(),
  /** True when lower values are better (burn multiple, CAC payback). */
  invertedGood: boolean("inverted_good").default(false).notNull(),
  unit: text("unit"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Signal catalog: the authoritative registry of every quant metric,
//     qualitative observation, and boolean flag we extract from context
//     (Slack messages, Granola transcripts, manual notes, etc). Global
//     rows are York's curated set; account rows are customer extensions. ---
export const signalKind = pgEnum("signal_kind", [
  "quantitative",
  "qualitative",
  "boolean",
]);
export const signalScope = pgEnum("signal_scope", ["global", "account"]);

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  // Natural-language note included in the extractor prompt to disambiguate.
  extractionHint: text("extraction_hint"),
  kind: signalKind("kind").notNull(),
  // Only meaningful for quantitative: "usd" | "pct" | "months" | "count" | "ratio" | "days" | "score".
  unit: text("unit"),
  category: text("category").notNull(),
  invertedGood: boolean("inverted_good").default(false).notNull(),
  scope: signalScope("scope").default("global").notNull(),
  accountId: text("account_id").references(() => accounts.id, {
    onDelete: "cascade",
  }),
  // Guardrails for extraction / validation: { min?, max?, regex?, allowedValues? }.
  validators: jsonb("validators").$type<{
    min?: number;
    max?: number;
    regex?: string;
    allowedValues?: string[];
  }>(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Signal observations: append-only event log. One context_item can
//     produce N rows. Latest-by-(company, signal, period) is the current
//     value; rolls up into benchmark_cohorts for York's internal cohort. ---
export const signalObservations = pgTable("signal_observations", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  companyUuid: text("company_uuid").notNull(),
  signalId: text("signal_id")
    .notNull()
    .references(() => signals.id, { onDelete: "cascade" }),
  // "2026-q1" — period the observation applies to.
  period: text("period").notNull(),
  asOf: text("as_of"),
  valueNumeric: real("value_numeric"),
  valueText: text("value_text"),
  valueBool: boolean("value_bool"),
  // -1 / 0 / 1 — qualitative aggregation signal.
  sentiment: integer("sentiment"),
  // e.g. "slack:C012:17458..." | "granola:meeting:abc" | "manual:mike@york.ie".
  source: text("source").notNull(),
  contextItemId: text("context_item_id").references(() => contextItems.id, {
    onDelete: "set null",
  }),
  agentRunId: text("agent_run_id").references(() => agentRuns.id, {
    onDelete: "set null",
  }),
  // 0-1 confidence from the extractor.
  confidence: real("confidence"),
  rawSnippet: text("raw_snippet"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  // Soft-supersede audit trail: when a later extraction (or manual override)
  // replaces this row, supersededAt gets stamped and supersededById points at
  // the successor. Current-value reads filter supersededAt IS NULL.
  supersededAt: timestamp("superseded_at"),
  supersededById: text("superseded_by_id"),
  // Who recorded this observation. Extracted rows copy the source
  // context_item's author_email; manual overrides carry the acting user's.
  authorEmail: text("author_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Signal selections: which signals an account (default) or watchlist
//     (override) cares about. Resolver order: watchlist > account > global
//     core set. ---
export const accountSignalSelections = pgTable(
  "account_signal_selections",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    signalId: text("signal_id")
      .notNull()
      .references(() => signals.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").default(0).notNull(),
    required: boolean("required").default(false).notNull(),
    target: jsonb("target").$type<{ op: string; value: number | string }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.signalId] })],
);

export const watchlistSignalSelections = pgTable(
  "watchlist_signal_selections",
  {
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    signalId: text("signal_id")
      .notNull()
      .references(() => signals.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").default(0).notNull(),
    required: boolean("required").default(false).notNull(),
    target: jsonb("target").$type<{ op: string; value: number | string }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.signalId] })],
);

// --- Watchlists ---
// External (fuel-data) companies are tracked by their graph UUID — we don't
// mirror them into our companies table since that's for the fixture portfolio.
export const watchlistScope = pgEnum("watchlist_scope", [
  "private",
  "account",
  "team",
]);
export const watchlistCadence = pgEnum("watchlist_cadence", [
  "off",
  "daily",
  "weekly",
  "monthly",
]);
// A "portfolio" kind represents a fund's holdings (Fund 1, Fund 2, etc.); "watchlist"
// is a non-invested tracking list (competitors, markets, deal flow). Structurally
// identical tables — the distinction is intent + presentation.
export const watchlistKind = pgEnum("watchlist_kind", [
  "portfolio",
  "watchlist",
]);

export const watchlists = pgTable("watchlists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  kind: watchlistKind("kind").notNull().default("watchlist"),
  fundName: text("fund_name"),
  scope: watchlistScope("scope").notNull().default("private"),
  cadence: watchlistCadence("cadence").notNull().default("weekly"),
  ownerEmail: text("owner_email").notNull(),
  accountId: text("account_id"),
  /** Subset of benchmark metric ids this portfolio surfaces (e.g.
   *  ["arr_usd","nrr_pct","monthly_burn_usd"]). Null = show the default set.
   *  Kept as jsonb to leave room for weighted entries later. */
  benchmarkMetricIds: jsonb("benchmark_metric_ids").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  legacyId: text("legacy_id").unique(),
});

export const watchlistCompanies = pgTable(
  "watchlist_companies",
  {
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    companyUuid: text("company_uuid").notNull(),
    name: text("name"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    addedByEmail: text("added_by_email"),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.companyUuid] })],
);

export const watchlistShares = pgTable(
  "watchlist_shares",
  {
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    role: text("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.userEmail] })],
);

export const watchlistFollowers = pgTable(
  "watchlist_followers",
  {
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    cadence: watchlistCadence("cadence").notNull().default("weekly"),
    starred: boolean("starred").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.userEmail] })],
);

export const watchlistTeams = pgTable(
  "watchlist_teams",
  {
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    teamId: text("team_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.teamId] })],
);

export type Watchlist = typeof watchlists.$inferSelect;
export type WatchlistCompany = typeof watchlistCompanies.$inferSelect;
export type WatchlistFollower = typeof watchlistFollowers.$inferSelect;

// --- Accounts / Teams ---
export const accountStatus = pgEnum("account_status", [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
]);
export const accountType = pgEnum("account_type", ["ORGANIZATION", "PERSONAL"]);
export const accountRole = pgEnum("account_role", ["owner", "admin", "member"]);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: accountType("type").notNull().default("ORGANIZATION"),
  status: accountStatus("status").notNull().default("TRIAL"),
  planId: text("plan_id"),
  stripeCustomerId: text("stripe_customer_id"),
  creatorEmail: text("creator_email").notNull(),
  trialStart: text("trial_start"),
  trialEnd: text("trial_end"),
  logoUrl: text("logo_url"),
  // Usage tiers — `plan_tier` is the human-facing label; `monthly_token_limit`
  // is the soft/hard cap expressed in the same unit as agent_runs.cost_tokens.
  // Null limit means unlimited (e.g. internal York account).
  planTier: text("plan_tier").notNull().default("free"),
  monthlyTokenLimit: integer("monthly_token_limit"),
  // Account-wide feature gate: when true, Pipeline + Portfolio nav items and
  // routes are surfaced; otherwise they're hidden. Set at onboarding
  // (investor vs founder); Settings shows status but does not toggle it.
  portfolioManagerEnabled: boolean("portfolio_manager_enabled")
    .notNull()
    .default(false),
  // Company Manager (CM) mode — the company this account *is*. When set on
  // a non-portfolio account, the landing page routes straight to that
  // company profile instead of /portfolio or /watchlists. Null = feature
  // not in use (all portfolio-manager accounts leave it null).
  primaryCompanyUuid: text("primary_company_uuid"),
  // Founder-signup domain claim: the email domain Google verified at
  // sign-in, stored when the account was provisioned through /onboard.
  // Multiple accounts can share the same domain — cold sign-ups always
  // create a standalone workspace. Teammates who want to share a
  // workspace go through the invite flow (account_members + invite_tokens).
  // The column is still useful for benchmark-contribution gating and
  // auditing. Null on accounts created any other way (invites, internal
  // seeds, PM-mode accounts).
  verifiedDomain: text("verified_domain"),
  verifiedDomainAt: timestamp("verified_domain_at"),
  // Onboarding v2 — persisted from the chat flow so we can act on them later:
  //   onboardingStage:        the stage the founder selected/confirmed (e.g. "Seed")
  //   onboardingIntegrations: integration IDs the founder picked in the selector
  //     (e.g. ["hubspot","slack"]). Used to pre-populate the integrations page and
  //     drive future auto-connect flows. Null when provisioned outside the v2 flow.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  legacyId: text("legacy_id").unique(),
  creditBalance: integer("credit_balance").notNull().default(100),
});

// --- Credits & pricing (F20A-104) ---
export const creditPlans = pgTable(
  "credit_plans",
  {
    /** founder | investor. Legacy rows are founder. */
    flow: text("flow").notNull().default("founder"),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    monthlyLimit: integer("monthly_limit").notNull(),
    dailyLimit: integer("daily_limit").notNull(),
    blockDurationMs: integer("block_duration_ms").notNull(),
    /** Display + Stripe sync amount for Pro monthly (cents). Null on free. */
    monthlyPriceCents: integer("monthly_price_cents"),
    /** Display + Stripe sync amount for Pro annual (cents). Null on free. */
    annualPriceCents: integer("annual_price_cents"),
    /**
     * Optional compare-at (list) price for admin strike-through vs monthly fee.
     * Display-only — not synced to Stripe. Null = no strike.
     */
    listPriceCents: integer("list_price_cents"),
    /**
     * Optional compare-at (list) price for admin strike-through vs annual fee.
     * Display-only — not synced to Stripe. Null = no strike.
     */
    annualListPriceCents: integer("annual_list_price_cents"),
    stripeMonthlyPriceId: text("stripe_monthly_price_id"),
    stripeAnnualPriceId: text("stripe_annual_price_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.flow, t.slug] }),
    check("credit_plans_flow_check", sql`${t.flow} IN ('founder', 'investor')`),
  ],
);

export const creditActionCosts = pgTable(
  "credit_action_costs",
  {
    flow: text("flow").notNull().default("founder"),
    actionSlug: text("action_slug").notNull(),
    label: text("label").notNull(),
    cost: integer("cost").notNull(),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.flow, t.actionSlug] }),
    check("credit_action_costs_flow_check", sql`${t.flow} IN ('founder', 'investor')`),
  ],
);

export const topupPacks = pgTable(
  "topup_packs",
  {
    flow: text("flow").notNull().default("founder"),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    credits: integer("credits").notNull(),
    priceCents: integer("price_cents").notNull(),
    /**
     * Optional compare-at (list) price for admin strike-through vs priceCents.
     * Display-only — not synced to Stripe. Null = no strike.
     */
    listPriceCents: integer("list_price_cents"),
    blurb: text("blurb").notNull(),
    discount: text("discount"),
    popular: boolean("popular").notNull().default(false),
    stripePriceId: text("stripe_price_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.flow, t.slug] }),
    check("topup_packs_flow_check", sql`${t.flow} IN ('founder', 'investor')`),
  ],
);

export type MonthlyUsageStats = {
  signals: number;
  docs: number;
  messages: number;
};

export const workspaceCreditLedger = pgTable(
  "workspace_credit_ledger",
  {
  accountId: text("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  /** Catalog audience. Spend and limits load credit_plans for this flow. */
  flow: text("flow").notNull().default("founder"),
  planSlug: text("plan_slug").notNull(),
  monthlyUsed: integer("monthly_used").notNull().default(0),
  dailyUsed: integer("daily_used").notNull().default(0),
  topUpBalance: integer("top_up_balance").notNull().default(0),
  blockUntil: timestamp("block_until"),
  /** UTC day the `daily_used` counter belongs to; rolls the counter over. */
  dailyPeriodStart: timestamp("daily_period_start"),
  /** UTC month the Free `monthly_used` counter belongs to. Pro uses Stripe bounds. */
  monthlyPeriodStart: timestamp("monthly_period_start"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  monthlyLowToastShown: boolean("monthly_low_toast_shown")
    .notNull()
    .default(false),
  stats: jsonb("stats")
    .$type<MonthlyUsageStats>()
    .notNull()
    .default({ signals: 0, docs: 0, messages: 0 }),
  stripeSubscriptionId: text("stripe_subscription_id"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  /** Earned Free-module ids: company | dev | gtm | rev. Empty until a founder finishes a module. */
  earnedModules: jsonb("earned_modules").$type<string[]>().notNull().default([]),
  /** True only after a full cohort-metric submit (onboarding or drawer). */
  benchmarkEarned: boolean("benchmark_earned").notNull().default(false),
  setupIncomplete: boolean("setup_incomplete").notNull().default(false),
  profilePromptDismissed: boolean("profile_prompt_dismissed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.flow, t.planSlug],
      foreignColumns: [creditPlans.flow, creditPlans.slug],
      name: "workspace_credit_ledger_flow_plan_fk",
    }),
    check(
      "workspace_credit_ledger_flow_check",
      sql`${t.flow} IN ('founder', 'investor')`,
    ),
  ],
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    actionSlug: text("action_slug"),
    amount: integer("amount").notNull(),
    source: text("source").notNull(),
    referenceId: text("reference_id"),
    /** Who consumed credits; null for system top-ups / legacy rows. */
    userEmail: text("user_email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("credit_transactions_account_idx").on(t.accountId, t.createdAt),
    index("credit_transactions_account_user_idx").on(
      t.accountId,
      t.userEmail,
      t.createdAt,
    ),
  ],
);

/** Stripe invoice snapshot for Account → Billing history (F20A-164). */
export const billingInvoiceTransactionType = pgEnum(
  "billing_invoice_transaction_type",
  ["subscription", "topup", "other"],
);

export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: text("id").primaryKey(),
    /** Fuel-facing auto-increment display id (not Stripe-derived). */
    displayNumber: integer("display_number")
      .generatedByDefaultAsIdentity()
      .notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeInvoiceId: text("stripe_invoice_id").notNull(),
    stripeInvoiceNumber: text("stripe_invoice_number"),
    invoiceDate: timestamp("invoice_date").notNull(),
    /** Stripe Invoice.Status as returned by Stripe (`draft`/`open`/`paid`/…). */
    status: text("status").notNull(),
    amountDue: integer("amount_due").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    total: integer("total").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    transactionType: billingInvoiceTransactionType("transaction_type")
      .notNull()
      .default("other"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    invoicePdf: text("invoice_pdf"),
    /** S3 object key for Fuel-branded invoice PDF (Stripe remains SoT for amounts). */
    fuelPdfStorageKey: text("fuel_pdf_storage_key"),
    fuelPdfGeneratedAt: timestamp("fuel_pdf_generated_at"),
    fuelInvoiceEmailSentAt: timestamp("fuel_invoice_email_sent_at"),
    fuelInvoiceEmailMessageId: text("fuel_invoice_email_message_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("billing_invoices_stripe_invoice_id_uidx").on(t.stripeInvoiceId),
    index("billing_invoices_account_date_idx").on(t.accountId, t.invoiceDate),
  ],
);

export const accountMembers = pgTable(
  "account_members",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    role: accountRole("role").notNull().default("member"),
    invitedAt: timestamp("invited_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.userEmail] })],
);

// --- Invite tokens: pending magic-link invites to an account. The raw token
//     lives only in the email link; what we store here is sha256(token), so
//     a DB leak doesn't hand out live invites. Acceptance flips acceptedAt;
//     admin revoke flips revokedAt; expiry is just a timestamp compare.
export const inviteTokens = pgTable(
  "invite_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: accountRole("role").notNull().default("member"),
    invitedByEmail: text("invited_by_email").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("invite_tokens_account_email_idx").on(t.accountId, t.email),
    index("invite_tokens_pending_idx")
      .on(t.accountId)
      .where(sql`"accepted_at" IS NULL AND "revoked_at" IS NULL`),
  ],
);
export type InviteToken = typeof inviteTokens.$inferSelect;

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  legacyId: text("legacy_id").unique(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userEmail] })],
);

// --- Hub integration: York IE project assignments per Fuel account. Many-to-many
//     — the same project_id may be linked to multiple accounts. ---
export const accountProjects = pgTable(
  "account_projects",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.projectId] })],
);

export type Account = typeof accounts.$inferSelect;
export type AccountMember = typeof accountMembers.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type AccountProject = typeof accountProjects.$inferSelect;

// --- Integrations ---
export const integrationProvider = pgEnum("integration_provider", [
  "hubspot",
  "granola",
  "slack",
  "email",
]);
export const integrationStatus = pgEnum("integration_status", [
  "connected",
  "disconnected",
  "error",
]);

export const integrationConnections = pgTable("integration_connections", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  provider: integrationProvider("provider").notNull(),
  // The user who installed it. Per-user for Granola; account-level installers
  // for HubSpot (token is still shared across the account).
  installedByEmail: text("installed_by_email").notNull(),
  scope: text("scope"), // "account" | "user"
  status: integrationStatus("status").notNull().default("connected"),
  // Encrypted blob containing access_token, refresh_token, expires_at, etc.
  // Using jsonb for speed-of-development; wrap in KMS at prod.
  credentials: jsonb("credentials").$type<Record<string, unknown>>().notNull(),
  accountExternalId: text("account_external_id"), // HubSpot portal ID, Slack workspace ID, etc.
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncAt: timestamp("last_sync_at"),
});

// --- Context items (the unified private data model) ---
export const contextItemKind = pgEnum("context_item_kind", [
  "note",
  "email",
  "slack_message",
  "meeting_transcript",
  "hubspot_activity",
  "funding_event",
  "signal",
  "document",
  "other",
]);

export const contextItems = pgTable(
  "context_items",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    // fuel-data organization UUID when the item is about a company; null for
    // account-level or person-level items.
    companyUuid: text("company_uuid"),
    kind: contextItemKind("kind").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    authorEmail: text("author_email"),
    // Where the item came from. For manual notes: "user"; for HubSpot: "hubspot:activity:123"; etc.
    source: text("source").notNull(),
    sourceExternalId: text("source_external_id"),
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // Cross-user merge key for meeting_transcript rows: hash of occurredAt (to
    // the minute) + sorted attendee emails. When two team members sync Granola
    // notes for the same calendar event, the second sync finds this row via
    // meetingKey and appends instead of creating a duplicate.
    meetingKey: text("meeting_key"),
    contributors: jsonb("contributors").$type<string[]>(),
    // Embedding populated asynchronously by an embedding worker. Optional so we
    // can ingest without blocking on the embedding call. Dim 1024 matches
    // Amazon Titan Text Embeddings v2.
    embedding: vector("embedding", 1024),
    // File attachments uploaded with this item (decks, financial models,
    // email attachments pulled through from HubSpot). Kept inline because
    // attachments are always read alongside their parent item and the
    // Data Room aggregate view queries the jsonb path directly.
    // See migration 0037 for the per-entry shape.
    attachments: jsonb("attachments").$type<
      Array<{
        id: string;
        filename: string;
        contentType: string;
        byteSize: number;
        storageKey: string;
        uploadedAt: string;
        uploadedByEmail: string;
      }>
    >(),
    // When signal extraction last ran against this item — set on every
    // onContextItemCreated call whether it produced observations or not.
    // retroExtract's `onlyMissing` key is this (IS NULL), not the absence
    // of observations, so empty-extraction items don't get re-asked
    // against Claude Haiku on every pass.
    lastExtractedAt: timestamp("last_extracted_at"),
  },
  (t) => [
    // Natural uniqueness key for ingested items. Concurrent writers
    // (webhook + cron, overlapping cron ticks) rely on this to make their
    // INSERT ... ON CONFLICT DO UPDATE behavior deterministic. Postgres
    // treats NULL source_external_id as distinct, so manual user notes
    // with no external id coexist under the same (account_id, source).
    uniqueIndex("context_items_source_unique").on(
      t.accountId,
      t.source,
      t.sourceExternalId,
    ),
  ],
);

// --- Agent runs ---
export const agentRuns = pgTable("agent_runs", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  userEmail: text("user_email").notNull(),
  // "intelligence_brief" | "playbook_match" | "digest" | etc.
  kind: text("kind").notNull(),
  subjectCompanyUuid: text("subject_company_uuid"),
  prompt: text("prompt"),
  output: text("output"),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  // Billable units for this run — model tokens (input+output) plus the sum
  // of cost_tokens from each successful tool invocation. Used for rollups
  // against account/user limits.
  costTokens: integer("cost_tokens").notNull().default(0),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const agentSkillInvocations = pgTable("agent_skill_invocations", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => agentRuns.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  status: text("status").notNull().default("ok"),
  // Per-invocation billable unit (read from the skill's `costTokens`).
  costTokens: integer("cost_tokens").notNull().default(0),
  latencyMs: integer("latency_ms"),
  errorMessage: text("error_message"),
  invokedAt: timestamp("invoked_at").defaultNow().notNull(),
});

// --- Integration pipeline configs (which HubSpot deal pipelines feed
//     the Fuel /pipeline view). Account-scoped. ---
export const integrationPipelineConfigs = pgTable(
  "integration_pipeline_configs",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    provider: integrationProvider("provider").notNull(),
    providerPipelineId: text("provider_pipeline_id").notNull(),
    providerPipelineName: text("provider_pipeline_name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // Free-form label the user can set for display inside Fuel.
    label: text("label"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSyncAt: timestamp("last_sync_at"),
    syncState: jsonb("sync_state").$type<Record<string, unknown>>(),
  },
);

// --- User-level key/value preferences (mirrors Fuel 1.0's UserPreferences
//     DDB model). Keys include `active_account` (account switcher),
//     `workspace_tour` (JSON `{ takenAt, snoozedUntil }` for org tour), and
//     `york_partner_dismiss` (JSON offer-id map `{ mode, until }`). ---
export const userPreferences = pgTable(
  "user_preferences",
  {
    userEmail: text("user_email").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userEmail, t.key] })],
);

// --- Per-user recently viewed companies (sidebar). Identity is Cognito email
//     (no users table). Catalog rows carry account_id for active-account
//     filtering; fuel-data/global rows leave it null. Claimed/primary company
//     is excluded at read + write time by the service layer. ---
export const recentlyViewedCompanies = pgTable(
  "recently_viewed_companies",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    companyUuid: text("company_uuid").notNull(),
    accountId: text("account_id"),
    name: text("name").notNull(),
    domain: text("domain"),
    logoUrl: text("logo_url"),
    viewedAt: timestamp("viewed_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("recently_viewed_user_company_unique").on(
      t.userEmail,
      t.companyUuid,
    ),
    index("recently_viewed_user_viewed_idx").on(t.userEmail, t.viewedAt),
  ],
);

// --- Integration channel subscriptions (Slack-first). One row per
//     (connection, provider channel). Message events on enabled rows ingest
//     into context_items; others drop. ---
export const integrationChannelSubscriptions = pgTable(
  "integration_channel_subscriptions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    provider: integrationProvider("provider").notNull(),
    providerChannelId: text("provider_channel_id").notNull(),
    providerChannelName: text("provider_channel_name").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    lastEventAt: timestamp("last_event_at"),
    syncState: jsonb("sync_state").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

// --- Integration activity configs: per-(account, connection) opt-in for
//     non-deal CRM ingest. Today: HubSpot notes + emails into context_items.
//     One row per HubSpot connection; both toggles default off. The cron +
//     webhook check this row to decide whether to fetch activities at all.
export const integrationActivityConfigs = pgTable(
  "integration_activity_configs",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    provider: integrationProvider("provider").notNull(),
    syncEmails: boolean("sync_emails").notNull().default(false),
    syncNotes: boolean("sync_notes").notNull().default(false),
    // "company" | "contact" | "both" — which association walks we use when
    // mapping an activity to a Fuel company via the resolution cache.
    associationScope: text("association_scope").notNull().default("both"),
    backfillSince: timestamp("backfill_since"),
    lastEmailSyncAt: timestamp("last_email_sync_at"),
    lastNoteSyncAt: timestamp("last_note_sync_at"),
    syncState: jsonb("sync_state").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

// --- Integration company links: resolution cache mapping provider-side
//     company/contact ids to fuel-data uuids. Populated by both the deal
//     reconcile pass and the activity sync so that per-activity lookups are
//     O(1) after the first resolve. `fuel_data_uuid IS NULL` with
//     `resolution_source = 'unresolved'` encodes a cached miss that the
//     caller can TTL-expire (~14d) before retrying.
export const integrationCompanyLinks = pgTable("integration_company_links", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  connectionId: text("connection_id")
    .notNull()
    .references(() => integrationConnections.id, { onDelete: "cascade" }),
  provider: integrationProvider("provider").notNull(),
  // "company" | "contact"
  providerObjectType: text("provider_object_type").notNull(),
  providerObjectId: text("provider_object_id").notNull(),
  providerDomain: text("provider_domain"),
  fuelDataUuid: text("fuel_data_uuid"),
  // "catalog" | "fuel-data" | "unresolved"
  resolutionSource: text("resolution_source"),
  lastResolvedAt: timestamp("last_resolved_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Pipeline companies (synced from a CRM pipeline config). Cache of the
//     deals + associated companies we've pulled via a provider API, keyed by
//     providerDealId so re-syncs upsert in place. ---
export const pipelineCompanies = pgTable("pipeline_companies", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  pipelineConfigId: text("pipeline_config_id")
    .notNull()
    .references(() => integrationPipelineConfigs.id, { onDelete: "cascade" }),
  provider: integrationProvider("provider").notNull(),
  providerDealId: text("provider_deal_id").notNull(),
  providerCompanyId: text("provider_company_id"),
  providerPipelineId: text("provider_pipeline_id").notNull(),
  providerPipelineStageId: text("provider_pipeline_stage_id"),

  companyName: text("company_name"),
  companyDomain: text("company_domain"),
  // Every domain signal we saw for this deal (company.domain, company.website,
  // non-free contact-email domains, deduped). The fuel-data/catalog match
  // walks this list; `companyDomain` is just the first for display.
  companyDomains: jsonb("company_domains").$type<string[]>(),
  companyIndustry: text("company_industry"),
  companyCity: text("company_city"),
  companyCountry: text("company_country"),
  companyEmployees: text("company_employees"),

  dealName: text("deal_name"),
  dealAmount: real("deal_amount"),
  dealCloseDate: timestamp("deal_close_date"),

  // fuel-data UUID once we resolve the company (by domain match, etc.).
  fuelDataUuid: text("fuel_data_uuid"),

  rawDeal: jsonb("raw_deal").$type<Record<string, unknown>>(),
  rawCompany: jsonb("raw_company").$type<Record<string, unknown>>(),

  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Playbooks: canonical operating frameworks (diligence, GTM, board
//     prep, etc). Global playbooks (accountId = null) are York IE's
//     house library; account-scoped are customer-authored. Running a
//     playbook opens the agent drawer with the playbook content as
//     system-augmentation and produces an Artifact of kind "playbook_run". ---
export const playbookVisibility = pgEnum("playbook_visibility", [
  "global",
  "account",
  "team",
]);

export const playbooks = pgTable("playbooks", {
  id: text("id").primaryKey(),
  accountId: text("account_id").references(() => accounts.id, {
    onDelete: "cascade",
  }),
  // Human-readable discriminator for catalog hierarchy: R&D | GTM | G&A | Investing | Other.
  category: text("category").notNull(),
  // Secondary tier under category, e.g. "Diligence" under "Investing".
  subcategory: text("subcategory"),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  // One-line summary shown in the catalog.
  description: text("description").notNull(),
  // Full markdown body — runbook steps, templates, prompts, etc.
  content: text("content").notNull(),
  // When set, the playbook is designed to run against a company subject.
  // Future "deal" / "pipeline" / "person" flavours slot in naturally.
  targetKind: text("target_kind").$type<
    "company" | "deal" | "pipeline" | null
  >(),
  tags: jsonb("tags").$type<string[]>(),
  visibility: playbookVisibility("visibility").notNull().default("global"),
  authorEmail: text("author_email"),
  /**
   * Titan v2 embedding of title + description + content. Populated on insert
   * (both seed + user-authored), so the `searchPlaybooks` skill can do
   * pgvector cosine similarity. Agents discover relevant playbooks by
   * intent — we do NOT cram the catalog into prompts. Scales to thousands.
   */
  embedding: vector("embedding", 1024),
  /**
   * Execution mode. `chat` (default) opens the agent drawer and lets the
   * agent drive the conversation — output is a `playbook_run` artifact.
   * `guided` marks playbooks whose primary CTA is a human form (today:
   * KPI Benchmark → Overview Edit Benchmark drawer). User-verified
   * `portfolio_updates(status='submitted')` still come only from that
   * drawer — AI cannot bypass this.
   */
  mode: text("mode").$type<"chat" | "guided">().notNull().default("chat"),
  /**
   * Guided-mode step schema. Null when `mode='chat'`. Retained for admin
   * validation / seed shape; field ids map to `portfolio_updates` columns.
   * Shape: see `lib/playbooks/guided.ts:GuidedStep`.
   */
  steps: jsonb("steps").$type<Array<Record<string, unknown>>>(),
  deletedAt: timestamp("deleted_at"),
  /** System playbooks (e.g. overview-generation) are hidden from the catalog. */
  isSystem: boolean("is_system").notNull().default(false),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Catalog companies: Fuel-native company records that live alongside
//     fuel-data (Neptune/OpenSearch / Crunchbase-derived). Used when a deal
//     in the HubSpot pipeline points at a company that's not in Crunchbase;
//     "Add to Fuel" fills this out by scraping website + LinkedIn +
//     Crunchbase via Bright Data. IDs are prefixed `cat_<uuid>` so the
//     /company/[uuid] loader can distinguish them from fuel-data UUIDs. ---
export const catalogCompanies = pgTable("catalog_companies", {
  id: text("id").primaryKey(), // "cat_" + uuid
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  website: text("website"),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  logoUrl: text("logo_url"),
  industry: text("industry"),
  categories: jsonb("categories").$type<string[]>(),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationCountry: text("location_country"),
  employeeCount: text("employee_count"),
  foundedOn: text("founded_on"),
  totalFundingUsd: real("total_funding_usd"),
  numFundingRounds: integer("num_funding_rounds"),
  linkedinUrl: text("linkedin_url"),
  crunchbaseUrl: text("crunchbase_url"),
  twitterUrl: text("twitter_url"),
  // Business model taxonomy — drives which KPI fields show in the guided
  // wizard + how `estimateCompanyKpis` is prompted. Validated in app code,
  // not the DB; values today: saas | operating_services | investment_firm
  // | operating_and_investment | other.
  businessModel: text("business_model"),
  // Per-source raw payloads (normalized jsonb), so the company page can
  // show rich detail and we can re-derive fields later without re-scraping.
  // `sources.onboarding` holds the v2 wizard snapshot: profileForm,
  // fundingRounds, operating (dev/gtm/revops), investor, benchmark, cohortKey.
  sources: jsonb("sources").$type<Record<string, unknown>>(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Enrichment cache: read-through dedupe for paid external data-source
//     lookups (Bright Data scrapers, future SERP/BuiltWith/etc). Keyed on
//     (source, subject_key). Skills check cache first; miss → provider call
//     → write. Keeps us from re-paying for the same LinkedIn profile across
//     three agent turns in a row. ---
export const enrichmentCache = pgTable("enrichment_cache", {
  id: text("id").primaryKey(),
  // Provider identifier + dataset, e.g. "brightdata:linkedin_company",
  // "brightdata:linkedin_profile", "brightdata:crunchbase_company".
  source: text("source").notNull(),
  // Normalized URL or canonical ID (e.g. LinkedIn slug). Unique per source.
  subjectKey: text("subject_key").notNull(),
  response: jsonb("response").$type<Record<string, unknown> | unknown[]>(),
  error: text("error"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  // Cost charged at fetch time — useful for billing analytics / caching wins.
  costTokens: integer("cost_tokens").notNull().default(0),
});

// --- Durable pre-claim onboarding enrichment jobs. Cognito sub scopes rows
//     until claim creates an account; account/company links are attached later.
export const onboardEnrichmentRuns = pgTable(
  "onboard_enrichment_runs",
  {
    id: text("id").primaryKey(),
    cognitoSub: text("cognito_sub").notNull(),
    userEmail: text("user_email").notNull(),
    domain: text("domain").notNull(),
    fuelDataCompanyId: text("fuel_data_company_id"),
    targetSource: text("target_source").notNull(),
    status: text("status").notNull().default("pending"),
    steps: jsonb("steps").$type<Record<string, string>>().notNull().default({}),
    enrichmentPayload: jsonb("enrichment_payload").$type<Record<string, unknown>>(),
    extractedPayload: jsonb("extracted_payload").$type<Record<string, unknown>>(),
    benchmarkHints: jsonb("benchmark_hints").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    catalogCompanyId: text("catalog_company_id").references(
      () => catalogCompanies.id,
      { onDelete: "set null" },
    ),
    claimedAt: timestamp("claimed_at"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("onboard_enrichment_runs_active_unique")
      .on(t.cognitoSub, t.domain)
      .where(sql`${t.status} in ('pending', 'queued', 'running')`),
    index("onboard_enrichment_runs_user_idx").on(t.cognitoSub, t.startedAt),
    index("onboard_enrichment_runs_account_idx").on(
      t.accountId,
      t.catalogCompanyId,
    ),
  ],
);

// --- Artifacts: any long-form AI-generated (or human-authored) output
//     attached to one or more subjects (companies, pipelines, deals…). Briefs
//     are one `kind`; diligence reports, meeting summaries, comparisons, and
//     playbook runs will land here too. ---
export const artifactVisibility = pgEnum("artifact_visibility", [
  "private",
  "account",
  "team",
]);

export const artifacts = pgTable("artifacts", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  // Free-form discriminator so we can add new kinds (diligence_report,
  // meeting_summary, comparison, playbook_run, market_map, …) without a
  // schema migration.
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  // Optional structured sections (parsed from markdown or emitted by a
  // structured agent) — kept opaque for now.
  sections: jsonb("sections").$type<Record<string, unknown>>(),
  // Typed references: [{type:"company", uuid}], [{type:"pipeline", id}],
  // [{type:"deal", id}], etc. Indexed with GIN for fast containment queries.
  subjects: jsonb("subjects")
    .$type<Array<{ type: string; [k: string]: unknown }>>()
    .notNull(),
  agentRunId: text("agent_run_id").references(() => agentRuns.id, {
    onDelete: "set null",
  }),
  authorEmail: text("author_email").notNull(),
  visibility: artifactVisibility("visibility").notNull().default("account"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Portfolio quarterly updates: York's quarterly collection from portfolio
//     companies. Mirrors the benchmark metric ids on the numeric side so we
//     can overlay a company submission against its cohort; adds qualitative
//     markdown (challenges, notable hires/customers/updates), vendor
//     categoricals (banking, legal, cloud, cap-table, D&O, CRM), and an
//     intro-opt-in flag. One row per (account, company, period) — unique
//     constraint lets the UI "update this quarter" instead of creating dupes. ---
export const portfolioUpdateStatus = pgEnum("portfolio_update_status", [
  "draft",
  "submitted",
]);

export const portfolioUpdates = pgTable("portfolio_updates", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  // fuel-data UUID or cat_-prefixed catalog UUID.
  companyUuid: text("company_uuid").notNull(),
  // "2026-q1" | "2026-q2" …
  period: text("period").notNull(),
  asOf: text("as_of"),

  // --- Numeric (mirror benchmark metric ids) ---
  fteCount: integer("fte_count"),
  paidCustomerCount: integer("paid_customer_count"),
  arrUsd: real("arr_usd"),
  arrGrowthYoyPct: real("arr_growth_yoy_pct"),
  nrrPct: real("nrr_pct"),
  logoRetentionPct: real("logo_retention_pct"),
  grossMarginPct: real("gross_margin_pct"),
  cacPaybackMonths: real("cac_payback_months"),
  burnMultiple: real("burn_multiple"),
  ruleOf40Pct: real("rule_of_40_pct"),
  cashOnHandUsd: real("cash_on_hand_usd"),
  monthlyBurnUsd: real("monthly_burn_usd"),

  // --- Qualitative (markdown) ---
  notableCustomers: text("notable_customers"),
  notableHires: text("notable_hires"),
  otherUpdates: text("other_updates"),
  challenges: text("challenges"),

  // --- Vendor relationships (free-form text; we keep them as strings so the
  //     user can type whatever their bank / law firm is without a fixed list). ---
  bankingPartner: text("banking_partner"),
  legalCounsel: text("legal_counsel"),
  cloudProvider: text("cloud_provider"),
  capTablePlatform: text("cap_table_platform"),
  doInsuranceProvider: text("do_insurance_provider"),
  crmPlatform: text("crm_platform"),

  // --- Intros ---
  openToInvestorIntros: boolean("open_to_investor_intros")
    .notNull()
    .default(false),

  // --- Long-tail signal values (Record<signal_id, value>). Hardcoded
  //     columns above stay for the existing form UI; new signals flow
  //     through here without a schema migration. ---
  signals:
    jsonb("signals").$type<Record<string, number | string | boolean | null>>(),
  // IDs of signal_observations that seeded this draft so the footnote view
  // can re-open the provenance.
  sourceObservationIds: jsonb("source_observation_ids").$type<string[]>(),

  // --- Metadata ---
  submittedByEmail: text("submitted_by_email").notNull(),
  status: portfolioUpdateStatus("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PortfolioUpdate = typeof portfolioUpdates.$inferSelect;

// --- MCP API tokens (per-user, used to authenticate Claude/MCP clients) ---
export const mcpApiTokens = pgTable("mcp_api_tokens", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  // sha256 of the raw secret. Raw secret is only shown once at creation.
  tokenHash: text("token_hash").notNull().unique(),
  // first 8 chars of the raw token, for display ("fuel_abc12345…")
  tokenPrefix: text("token_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Null means no expiration. Expired tokens authenticate as unauthorized.
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  // Snapshot of the caller's Cognito groups at token creation time. Null
  // means "unknown / dev token". Group changes upstream are reflected only
  // when a new token is minted — acceptable trade-off for rare super-admin use.
  groups: jsonb("groups").$type<string[]>(),
  // "manual" (minted on /account/developer) vs "oauth" (issued via the
  // OAuth token endpoint by claude.ai's Custom Connector flow).
  issuedVia: text("issued_via").notNull().default("manual"),
  // For OAuth-issued tokens: the DCR client they belong to.
  clientId: text("client_id"),
});

// --- MCP OAuth: dynamic client registration (RFC 7591) ---
export const mcpOauthClients = pgTable("mcp_oauth_clients", {
  clientId: text("client_id").primaryKey(),
  // bcrypt hash of client_secret, or NULL for public clients.
  clientSecretHash: text("client_secret_hash"),
  name: text("name").notNull(),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method")
    .notNull()
    .default("none"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

// --- MCP OAuth: short-lived authorization codes (~5 min TTL) ---
export const mcpOauthAuthorizationCodes = pgTable(
  "mcp_oauth_authorization_codes",
  {
    code: text("code").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => mcpOauthClients.clientId, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    scope: text("scope"),
    // PKCE per RFC 7636. Only S256 is accepted (no `plain`).
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method")
      .notNull()
      .default("S256"),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export type ContextItem = typeof contextItems.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentSkillInvocation = typeof agentSkillInvocations.$inferSelect;
export type McpApiToken = typeof mcpApiTokens.$inferSelect;
export type McpOauthClient = typeof mcpOauthClients.$inferSelect;
export type McpOauthAuthorizationCode =
  typeof mcpOauthAuthorizationCodes.$inferSelect;
export type IntegrationPipelineConfig =
  typeof integrationPipelineConfigs.$inferSelect;
export type IntegrationChannelSubscription =
  typeof integrationChannelSubscriptions.$inferSelect;
export type IntegrationActivityConfig =
  typeof integrationActivityConfigs.$inferSelect;
export type IntegrationCompanyLink =
  typeof integrationCompanyLinks.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type RecentlyViewedCompany = typeof recentlyViewedCompanies.$inferSelect;
export type PipelineCompany = typeof pipelineCompanies.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type EnrichmentCacheRow = typeof enrichmentCache.$inferSelect;
export type CatalogCompany = typeof catalogCompanies.$inferSelect;
export type Playbook = typeof playbooks.$inferSelect;
export type BenchmarkCohort = typeof benchmarkCohorts.$inferSelect;

export type Company = typeof companies.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Initiative = typeof initiatives.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type SignalObservation = typeof signalObservations.$inferSelect;
export type CompanyIntelligence = typeof companyIntelligence.$inferSelect;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type CreditPlan = typeof creditPlans.$inferSelect;
export type CreditActionCost = typeof creditActionCosts.$inferSelect;
export type TopupPack = typeof topupPacks.$inferSelect;
export type WorkspaceCreditLedger = typeof workspaceCreditLedger.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type AccountSignalSelection =
  typeof accountSignalSelections.$inferSelect;
export type WatchlistSignalSelection =
  typeof watchlistSignalSelections.$inferSelect;
export type FixtureSignal = typeof fixtureSignals.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;

// --- Advisors: people an account (or Super Admin) wants to track,
//     link to portfolio companies, and share via player cards.
//     accountId = null → instance-level (visible to every account),
//     same merge pattern as playbooks. Duplicate names across scopes
//     are allowed; both rows surface in the merged list. ---
export const advisorStatus = pgEnum("advisor_status", ["active", "archived"]);

export const advisors = pgTable(
  "advisors",
  {
    id: text("id").primaryKey(),
    // Null = Super Admin–curated instance advisor (all accounts).
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    // Neptune person vertex id when picked from fuel-data search;
    // null for manual entries.
    fuelDataPersonId: text("fuel_data_person_id"),
    name: text("name").notNull(),
    title: text("title"),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    linkedinUrl: text("linkedin_url"),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    expertise: jsonb("expertise").$type<string[]>(),
    focusIndustries: jsonb("focus_industries").$type<string[]>(),
    location: text("location"),
    // If true, /advisor/<id>/card renders a limited view without login.
    publicCard: boolean("public_card").notNull().default(false),
    privateNotes: text("private_notes"),
    linkedinData: jsonb("linkedin_data").$type<Record<string, unknown>>(),
    linkedinFetchedAt: timestamp("linkedin_fetched_at"),
    curatedByEmail: text("curated_by_email").notNull(),
    status: advisorStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("advisors_account_id_idx").on(t.accountId)],
);

export const companyAdvisors = pgTable(
  "company_advisors",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    // fuel-data UUID or cat_-prefixed catalog UUID.
    companyUuid: text("company_uuid").notNull(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisors.id, { onDelete: "cascade" }),
    role: text("role"),
    addedByEmail: text("added_by_email").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.companyUuid, t.advisorId] }),
    index("company_advisors_company_uuid_idx").on(t.accountId, t.companyUuid),
  ],
);

export type Advisor = typeof advisors.$inferSelect;
export type CompanyAdvisor = typeof companyAdvisors.$inferSelect;

// --- Company initiatives (v2) ---
// Account-scoped, keyed off a real fuel-data or catalog UUID. Kept
// separate from the legacy fixture-only `initiatives` table so each
// can evolve independently without a big bang migration.
export const companyInitiatives = pgTable(
  "company_initiatives",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** fuel-data organization UUID or cat_-prefixed catalog UUID. */
    companyUuid: text("company_uuid").notNull(),
    kind: initiativeKind("kind").notNull(),
    name: text("name").notNull(),
    /** "gtm" | "product" | "finance" | "people" | "ops" | "other" */
    area: text("area").notNull().default("other"),
    description: text("description"),
    /** "active" | "paused" | "completed" | "archived" */
    status: text("status").notNull().default("active"),
    ownerEmail: text("owner_email").notNull(),
    /**
     * Free-text assignee names (Design multi-chip "Assigned to").
     * `ownerEmail` remains the account-scoped owner for membership checks.
     */
    assignees: jsonb("assignees").$type<string[]>().notNull().default([]),
    /** Free-form target ("2026-q2", "end of July 2026"). */
    due: text("due"),
    /** Links back to the artifact (brief, playbook run) that proposed
     *  this initiative; null if the initiative was created manually. */
    sourceArtifactId: text("source_artifact_id").references(() => artifacts.id, {
      onDelete: "set null",
    }),
    /**
     * Stable key for the bullet inside that artifact (normalized title).
     * With sourceArtifactId, prevents duplicate creates from the same Research suggestion.
     */
    sourceSuggestionKey: text("source_suggestion_key"),
    /** Provenance: overview | onboarding | manual | agent */
    source: text("source"),
    overviewSnapshotId: text("overview_snapshot_id"),
    /** dev | mkt | rev when AI-suggested from overview */
    overviewCategoryId: text("overview_category_id"),
    suggestedFromWeaknessId: text("suggested_from_weakness_id"),
    /**
     * Denormalized initiative progress links (baseline | current | target).
     * Shape: [{ id, role, intelligenceId, title, highlight, type, date }]
     */
    intelligenceLinks: jsonb("intelligence_links")
      .$type<
        Array<{
          id: string;
          role: "baseline" | "current" | "target";
          intelligenceId: string;
          title: string;
          highlight: string;
          type: string;
          date: string;
        }>
      >()
      .notNull()
      .default([]),
    /**
     * Source documents when a suggestion is driven by an uploaded Data Room file
     * (Path B — document-only, tagged intelligence optional).
     * Shape: [{ id, documentVersionId, title, typeLabel? }]
     */
    sourceDocuments: jsonb("source_documents")
      .$type<
        Array<{
          id: string;
          documentVersionId: string | null;
          title: string;
          typeLabel?: string | null;
        }>
      >()
      .notNull()
      .default([]),
    /** Why Fuel suggested this initiative (AI source rationale). */
    sourceRationale: text("source_rationale"),
    /** Value of completing the initiative (AI-generated founder-facing benefit). */
    benefit: text("benefit"),
    /** Suggestion priority hint (e.g. high | medium | low). */
    priority: text("priority"),
    /** AI suggestion metrics (optional; Overview / document-sourced drafts). */
    baselineMetric: text("baseline_metric"),
    targetMetric: text("target_metric"),
    benchmarkCohort: text("benchmark_cohort"),
    /**
     * How York IE can help — nested on overview suggestions or generated after manual save.
     * Shape: { section_title, bullets: [{ title, milestone, help, primary_service, track }], cta_label }
     * bullets: 1–2 catalog services (not per milestone). title is a personalized heading;
     * help is an approved outcome refined to the initiative; primary_service is the catalog name;
     * milestone mirrors title for stored-shape compatibility.
     */
    yorkHelp: jsonb("york_help").$type<{
      section_title: string;
      bullets: Array<{
        title?: string;
        milestone: string;
        help: string;
        primary_service: string;
        track: "rd" | "gtm" | "ga";
      }>;
      cta_label: string;
    } | null>(),
    /** idle | generating | ready | failed */
    yorkHelpStatus: text("york_help_status").notNull().default("idle"),
    /** Hash of fields that feed York help — skip regenerate when unchanged. */
    yorkHelpContentHash: text("york_help_content_hash"),
    yorkHelpDismissedUntil: timestamp("york_help_dismissed_until"),
    yorkHelpDismissForever: boolean("york_help_dismiss_forever").notNull().default(false),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("company_initiatives_company_idx").on(t.accountId, t.companyUuid),
    index("company_initiatives_owner_idx").on(t.accountId, t.ownerEmail),
    uniqueIndex("company_initiatives_artifact_suggestion_uidx")
      .on(t.accountId, t.sourceArtifactId, t.sourceSuggestionKey)
      .where(
        sql`${t.sourceArtifactId} is not null and ${t.sourceSuggestionKey} is not null`,
      ),
  ],
);

export const companyInitiativeAdvisors = pgTable(
  "company_initiative_advisors",
  {
    initiativeId: text("initiative_id")
      .notNull()
      .references(() => companyInitiatives.id, { onDelete: "cascade" }),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisors.id, { onDelete: "cascade" }),
    role: text("role"),
    addedByEmail: text("added_by_email").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.initiativeId, t.advisorId] })],
);

export type CompanyInitiative = typeof companyInitiatives.$inferSelect;
export type CompanyInitiativeAdvisor =
  typeof companyInitiativeAdvisors.$inferSelect;

// --- Initiative instrumentation ---
// baseline = "where we started when we kicked this off" (usually auto-seeded
// from the motivating signal observation when the initiative is created
// from a suggestion). target = "where we want to be by <due date>".
// signal_observations flow in continuously from email/note extraction +
// quarterly submissions, so "current" is just the most recent observation
// on the linked signal — computed in-app, not stored here.
export const initiativeSignals = pgTable(
  "initiative_signals",
  {
    initiativeId: text("initiative_id")
      .notNull()
      .references(() => companyInitiatives.id, { onDelete: "cascade" }),
    signalId: text("signal_id")
      .notNull()
      .references(() => signals.id, { onDelete: "cascade" }),
    /** "baseline" | "target" — composite PK enforces at most one of each
     *  per (initiative, signal). */
    role: text("role").notNull(),
    valueNumeric: doublePrecision("value_numeric"),
    valueText: text("value_text"),
    valueBool: boolean("value_bool"),
    /** Target rows only. Free-form ("2026-q3") like initiative.due. */
    targetDate: text("target_date"),
    /** For baselines seeded from a specific observation — lets the
     *  dashboard link to the email/note the number came from. */
    sourceObservationId: text("source_observation_id").references(
      () => signalObservations.id,
      { onDelete: "set null" },
    ),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.initiativeId, t.signalId, t.role] }),
    index("initiative_signals_initiative_idx").on(t.initiativeId),
  ],
);

// Qualitative milestones that don't map to a numeric signal — "hire 5
// BDRs", "sign LOI with anchor customer", "launch outbound stack".
export const initiativeMilestones = pgTable(
  "initiative_milestones",
  {
    id: text("id").primaryKey(),
    initiativeId: text("initiative_id")
      .notNull()
      .references(() => companyInitiatives.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    /** "todo" | "in_progress" | "done" | "blocked" */
    status: text("status").notNull().default("todo"),
    dueDate: text("due_date"),
    /** Optional operator note (max 280 chars in UI). */
    note: text("note"),
    completedAt: timestamp("completed_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("initiative_milestones_initiative_idx").on(
      t.initiativeId,
      t.sortOrder,
    ),
    check(
      "initiative_milestones_due_date_format_check",
      sql`${t.dueDate} IS NULL OR ${t.dueDate} ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-[0-9]{4}$'`,
    ),
  ],
);

export type InitiativeSignal = typeof initiativeSignals.$inferSelect;
export type InitiativeMilestone = typeof initiativeMilestones.$inferSelect;

// --- Investor bookmarks: thin Postgres cache for "investors my account
//     is following". Investor IDs are Neptune vertex ids; names are cached
//     for list display so we don't have to hit Neptune on every page. ---
export const investorBookmarks = pgTable(
  "investor_bookmarks",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    investorId: text("investor_id").notNull(),
    investorName: text("investor_name").notNull(),
    addedByEmail: text("added_by_email").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.investorId] }),
    index("investor_bookmarks_account_idx").on(t.accountId),
  ],
);

export type InvestorBookmark = typeof investorBookmarks.$inferSelect;

// --- Service Providers: hand-curated by super admins. Categorized (legal,
//     banking, CRM, etc.). Visibility=global shows to all authenticated users
//     across accounts; visibility=internal shows only to the York IE account. ---
export const serviceProviderCategory = pgEnum("service_provider_category", [
  "legal",
  "accounting",
  "banking",
  "debt",
  "cap_table",
  "payroll",
  "benefits",
  "cloud",
  "data_infra",
  "ai_platform",
  "crm",
  "marketing",
  "recruiting",
  "insurance",
  "other",
]);

export const serviceProviderVisibility = pgEnum("service_provider_visibility", [
  "global",
  "internal",
]);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    referenceId: text("reference_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("credit_ledger_account_idx").on(t.accountId, t.createdAt)],
);

// --- Company intelligence: document-derived and manual insights (F20A-95) ---
export const companyIntelligence = pgTable(
  "company_intelligence",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyUuid: text("company_uuid").notNull(),
    category: text("category").notNull(),
    headline: text("headline").notNull(),
    keyDetail: text("key_detail"),
    summary: text("summary").notNull(),
    confidence: real("confidence").notNull(),
    source: text("source").notNull(),
    generationPath: text("generation_path"),
    period: text("period"),
    contextItemId: text("context_item_id").references(() => contextItems.id, {
      onDelete: "set null",
    }),
    documentVersionId: text("document_version_id").references(
      () => dataRoomDocumentVersions.id,
      { onDelete: "set null" },
    ),
    rawSnippet: text("raw_snippet"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isBenchmark: boolean("is_benchmark").notNull().default(false),
    dismissedAt: timestamp("dismissed_at"),
    authorEmail: text("author_email"),
    agentRunId: text("agent_run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("company_intelligence_company_idx").on(
      t.accountId,
      t.companyUuid,
      t.createdAt,
    ),
    index("company_intelligence_context_idx").on(t.contextItemId),
    index("company_intelligence_document_idx").on(t.documentVersionId),
  ],
);

// --- Data Room: private document vault per company workspace ---
export const dataRoomDocumentVersions = pgTable(
  "data_room_document_versions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyUuid: text("company_uuid").notNull(),
    typeId: text("type_id").notNull(),
    typeLabel: text("type_label").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageKey: text("storage_key").notNull(),
    source: text("source").notNull().default("data_room"),
    uploadedAt: timestamp("uploaded_at").notNull(),
    uploadedByEmail: text("uploaded_by_email").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    supersededAt: timestamp("superseded_at"),
    contextItemId: text("context_item_id").references(() => contextItems.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("data_room_versions_company_type_idx").on(
      t.accountId,
      t.companyUuid,
      t.typeId,
    ),
    index("data_room_versions_current_idx").on(
      t.accountId,
      t.companyUuid,
      t.isCurrent,
    ),
    uniqueIndex("data_room_versions_one_current_per_type")
      .on(t.accountId, t.companyUuid, t.typeId)
      .where(sql`${t.isCurrent} = true`),
  ],
);

export const serviceProviders = pgTable(
  "service_providers",
  {
    id: text("id").primaryKey(),
    category: serviceProviderCategory("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    domain: text("domain"),
    website: text("website"),
    logoUrl: text("logo_url"),
    linkedinUrl: text("linkedin_url"),
    notes: text("notes"),
    visibility: serviceProviderVisibility("visibility")
      .notNull()
      .default("global"),
    tags: jsonb("tags").$type<string[]>(),
    curatedByEmail: text("curated_by_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("service_providers_category_idx").on(t.category),
    index("service_providers_visibility_idx").on(t.visibility),
  ],
);

export type ServiceProvider = typeof serviceProviders.$inferSelect;

// --- Overview page (F20A-105): AI-generated operating dashboard per company ---
export const overviewSnapshots = pgTable(
  "overview_snapshots",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyUuid: text("company_uuid").notNull(),
    advisorSummary: text("advisor_summary").notNull(),
    signalTags: jsonb("signal_tags")
      .$type<
        Array<{
          category_id: string;
          label: string;
          urgency: string;
          suffix: string;
          risk_count: number;
        }>
      >()
      .notNull()
      .default([]),
    recommendedActions: jsonb("recommended_actions")
      .$type<
        Array<{
          title: string;
          sub: string;
          cta: string;
          done: boolean;
          action_type: string;
        }>
      >()
      .notNull()
      .default([]),
    journeyStage: text("journey_stage"),
    journeyLabel: text("journey_label"),
    contextCompletionPct: integer("context_completion_pct").default(0),
    playbookId: text("playbook_id").references(() => playbooks.id, {
      onDelete: "set null",
    }),
    agentRunId: text("agent_run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    aiModel: text("ai_model"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("overview_snapshots_company_unique").on(t.accountId, t.companyUuid),
    index("overview_snapshots_account_idx").on(t.accountId),
  ],
);

export const overviewCategoryScores = pgTable(
  "overview_category_scores",
  {
    id: text("id").primaryKey(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => overviewSnapshots.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyUuid: text("company_uuid").notNull(),
    categoryId: text("category_id").notNull(),
    label: text("label").notNull(),
    fullLabel: text("full_label").notNull(),
    score: integer("score").notNull().default(50),
    statusLabel: text("status_label").notNull(),
    statusTone: text("status_tone").notNull(),
    confidenceLevel: text("confidence_level").notNull().default("Medium"),
    focusNarrative: text("focus_narrative"),
    insight: text("insight"),
    strengths: jsonb("strengths").$type<Array<Record<string, unknown>>>().notNull().default([]),
    weaknesses: jsonb("weaknesses").$type<Array<Record<string, unknown>>>().notNull().default([]),
    benchmarkChips: jsonb("benchmark_chips").$type<string[]>().notNull().default([]),
    stats: jsonb("stats").$type<Array<{ label: string; value: string }>>().notNull().default([]),
    scoreContributors: jsonb("score_contributors")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    intelligenceCount: integer("intelligence_count").default(0),
    initiativeCount: integer("initiative_count").default(0),
    playbookCount: integer("playbook_count").default(0),
    detailAnsweredCount: integer("detail_answered_count").default(0),
    detailQuestionCount: integer("detail_question_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("overview_category_scores_snapshot_cat").on(t.snapshotId, t.categoryId),
    index("overview_category_scores_company_idx").on(t.accountId, t.companyUuid),
  ],
);

export const companyDetailAnswers = pgTable(
  "company_detail_answers",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyUuid: text("company_uuid").notNull(),
    questionId: text("question_id").notNull(),
    answer: text("answer"),
    quarterLabel: text("quarter_label"),
    source: text("source").notNull().default("overview"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("company_detail_answers_unique").on(
      t.accountId,
      t.companyUuid,
      t.questionId,
    ),
    index("company_detail_answers_company_idx").on(t.accountId, t.companyUuid),
  ],
);

export const overviewPlaybookSuggestions = pgTable(
  "overview_playbook_suggestions",
  {
    id: text("id").primaryKey(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => overviewSnapshots.id, { onDelete: "cascade" }),
    playbookId: text("playbook_id")
      .notNull()
      .references(() => playbooks.id, { onDelete: "cascade" }),
    categoryId: text("category_id"),
    reason: text("reason"),
    rank: integer("rank").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("overview_playbook_suggestions_snapshot_idx").on(t.snapshotId)],
);

export type OverviewSnapshot = typeof overviewSnapshots.$inferSelect;
export type OverviewCategoryScore = typeof overviewCategoryScores.$inferSelect;
export type CompanyDetailAnswer = typeof companyDetailAnswers.$inferSelect;
export type OverviewPlaybookSuggestion = typeof overviewPlaybookSuggestions.$inferSelect;

// --- York IE partner chip headlines (F20A-162): Super Admin editable catalog ---
export const yorkChipHeadlines = pgTable(
  "york_chip_headlines",
  {
    id: text("id").primaryKey(),
    /** Overview category: dev | mkt | rev */
    category: text("category").notNull(),
    chipLabel: text("chip_label").notNull(),
    headline: text("headline").notNull(),
    updatedByEmail: text("updated_by_email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("york_chip_headlines_cat_label").on(t.category, t.chipLabel),
    index("york_chip_headlines_category_idx").on(t.category),
  ],
);

export type YorkChipHeadline = typeof yorkChipHeadlines.$inferSelect;

// --- Help & FAQ (platform-wide, Super Admin curated) ---
/** Label/body may include markdown links: `[text](https://…|/path|mailto:…)`. */
export type FaqPoint = {
  label: string;
  body: string;
};

export const faqEntries = pgTable(
  "faq_entries",
  {
    id: text("id").primaryKey(),
    question: text("question").notNull(),
    /** Opening lead answer shown above optional detail points. */
    answer: text("answer").notNull(),
    /** Scannable detail rows: bold label + body. */
    points: jsonb("points").$type<FaqPoint[]>().notNull().default([]),
    /** Closing aside — caveat or where to click. */
    footnote: text("footnote"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** When false, Super Admin can keep a draft off the live Help page. */
    published: boolean("published").notNull().default(false),
    curatedByEmail: text("curated_by_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("faq_entries_sort_order_idx").on(t.sortOrder),
    index("faq_entries_published_idx").on(t.published),
  ],
);

export type FaqEntry = typeof faqEntries.$inferSelect;

// --- Coupon campaigns (Super Admin → Stripe Coupon + Promotion Codes) ---
export const couponCampaignBenefitType = pgEnum("coupon_campaign_benefit_type", [
  "percent_off",
  "amount_off",
]);
export const couponCampaignDuration = pgEnum("coupon_campaign_duration", [
  "once",
  "repeating",
  "forever",
]);
export const couponCampaignStatus = pgEnum("coupon_campaign_status", [
  "active",
  "inactive",
  "archived",
]);
export const couponCampaignAudience = pgEnum("coupon_campaign_audience", [
  "targeted",
  "global",
]);
export const couponRecipientSendStatus = pgEnum("coupon_recipient_send_status", [
  "pending",
  "sent",
  "failed",
]);

export const couponCampaigns = pgTable(
  "coupon_campaigns",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    stripeCouponId: text("stripe_coupon_id").notNull().unique(),
    benefitType: couponCampaignBenefitType("benefit_type").notNull(),
    percentOff: integer("percent_off"),
    amountOffCents: integer("amount_off_cents"),
    currency: text("currency").notNull().default("usd"),
    duration: couponCampaignDuration("duration").notNull(),
    durationInMonths: integer("duration_in_months"),
    redeemBy: timestamp("redeem_by"),
    /** Stripe Price ids selected at create; mapped to Product ids for Coupon applies_to. */
    appliesToPriceIds: jsonb("applies_to_price_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    codePrefix: text("code_prefix").notNull().default("FUEL1"),
    /** targeted = unique per-email codes; global = shared multi-use promo. */
    audience: couponCampaignAudience("audience").notNull().default("targeted"),
    /** Shared Promotion Code for global campaigns (null when targeted). */
    globalPromotionCode: text("global_promotion_code"),
    globalStripePromotionCodeId: text("global_stripe_promotion_code_id"),
    /** Global max redemptions; null = unlimited. Ignored for targeted. */
    maxRedemptions: integer("max_redemptions"),
    status: couponCampaignStatus("status").notNull().default("active"),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("coupon_campaigns_status_idx").on(t.status),
    uniqueIndex("coupon_campaigns_global_code_uidx").on(t.globalPromotionCode),
    uniqueIndex("coupon_campaigns_global_stripe_promo_uidx").on(
      t.globalStripePromotionCodeId,
    ),
  ],
);

export const couponRecipients = pgTable(
  "coupon_recipients",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => couponCampaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    promotionCode: text("promotion_code").notNull(),
    stripePromotionCodeId: text("stripe_promotion_code_id").notNull(),
    sendStatus: couponRecipientSendStatus("send_status")
      .notNull()
      .default("pending"),
    sendError: text("send_error"),
    sentAt: timestamp("sent_at"),
    redeemedAt: timestamp("redeemed_at"),
    redeemedAccountId: text("redeemed_account_id"),
    redeemedCheckoutSessionId: text("redeemed_checkout_session_id"),
    stripeInvoiceId: text("stripe_invoice_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountDiscountCents: integer("amount_discount_cents"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("coupon_recipients_campaign_email_uidx").on(
      t.campaignId,
      t.email,
    ),
    // Targeted codes are unique; global campaigns reuse one promo across recipient
    // send-tracking rows, so stripe/code uniqueness is not enforced here.
    index("coupon_recipients_stripe_promo_idx").on(t.stripePromotionCodeId),
    index("coupon_recipients_code_idx").on(t.promotionCode),
    index("coupon_recipients_campaign_idx").on(t.campaignId),
    index("coupon_recipients_email_idx").on(t.email),
    index("coupon_recipients_stripe_invoice_idx").on(t.stripeInvoiceId),
  ],
);

export type CouponCampaign = typeof couponCampaigns.$inferSelect;
export type CouponRecipient = typeof couponRecipients.$inferSelect;
