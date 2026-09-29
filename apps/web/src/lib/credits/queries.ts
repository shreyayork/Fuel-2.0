import "server-only";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  accounts,
  creditActionCosts,
  creditPlans,
  creditTransactions,
  topupPacks,
  workspaceCreditLedger,
  type MonthlyUsageStats,
} from "@/db/schema";
import {
  bumpStats,
  availableToday,
  dailyRemaining,
  monthlyResetLabelFromDate,
  resolveCreditRefund,
  reverseCreditDebitCounters,
  shouldRevertCanceledPro,
  shouldRollDailyWindow,
  shouldRollFreeMonthlyWindow,
  utcDayStart,
  utcMonthStart,
} from "./logic";
import { parseCreditCatalogFlow, type CreditCatalogFlow } from "./catalog-flow";
import {
  creditsPerBlock,
  isQualifiedForRefill,
  mergeEarnedModules,
  parseEarnedModules,
  remainingEarnableCredits,
  shouldResetFreeMonthlyUsage,
  spendableFreeMonthlyLimit,
  type ProfileEarnState,
  type ProfileModuleId,
} from "./profile-modules";
import { billableActionCosts } from "./constants";
import type {
  ActionCostRow,
  CreditActionType,
  CreditPlanSlug,
  CreditSnapshot,
  ProPlanDto,
  TopUpPackDto,
  TryActionResult,
} from "./types";

type Db = Awaited<ReturnType<typeof getDb>>;

const DEFAULT_STATS: MonthlyUsageStats = { signals: 0, docs: 0, messages: 0 };

function inferBillingCycle(
  periodStart: Date | null,
  periodEnd: Date | null,
): "monthly" | "annual" | null {
  if (!periodStart || !periodEnd) return null;
  const days = (periodEnd.getTime() - periodStart.getTime()) / 86_400_000;
  if (days >= 300) return "annual";
  if (days >= 20) return "monthly";
  return null;
}

function earnStateFromLedger(
  ledger: typeof workspaceCreditLedger.$inferSelect,
): ProfileEarnState {
  return {
    modules: parseEarnedModules(ledger.earnedModules),
    benchmark: ledger.benchmarkEarned,
    setupIncomplete: ledger.setupIncomplete,
    profilePromptDismissed: ledger.profilePromptDismissed,
  };
}

function toSnapshot(
  ledger: typeof workspaceCreditLedger.$inferSelect,
  plan: typeof creditPlans.$inferSelect,
  opts?: { justUnblocked?: boolean },
): CreditSnapshot {
  const planSlug = ledger.planSlug as CreditPlanSlug;
  const flow = parseCreditCatalogFlow(ledger.flow);
  const earn = earnStateFromLedger(ledger);
  const monthlyLimit =
    planSlug === "free"
      ? spendableFreeMonthlyLimit({
          flow,
          planMonthlyLimit: plan.monthlyLimit,
          state: earn,
        })
      : plan.monthlyLimit;
  return {
    plan: planSlug,
    billingCycle:
      planSlug === "pro"
        ? inferBillingCycle(ledger.currentPeriodStart, ledger.currentPeriodEnd)
        : null,
    cancelAtPeriodEnd: ledger.cancelAtPeriodEnd,
    periodEndsAt: ledger.currentPeriodEnd ? ledger.currentPeriodEnd.getTime() : null,
    monthlyUsed: ledger.monthlyUsed,
    monthlyLimit,
    dailyUsed: ledger.dailyUsed,
    dailyLimit: plan.dailyLimit,
    topUpBalance: ledger.topUpBalance,
    blockUntil: ledger.blockUntil ? ledger.blockUntil.getTime() : null,
    monthlyResetLabel: monthlyResetLabelFromDate(ledger.currentPeriodEnd),
    justUnblocked: opts?.justUnblocked ?? false,
    monthlyLowToastShown: ledger.monthlyLowToastShown,
    stats: ledger.stats ?? DEFAULT_STATS,
    profileModules: earn.modules,
    benchmarkEarned: earn.benchmark,
    setupIncomplete: earn.setupIncomplete,
    profilePromptDismissed: earn.profilePromptDismissed,
    remainingEarnable:
      flow === "investor" ? 0 : remainingEarnableCredits(earn, plan.monthlyLimit),
    qualifiedForRefill: flow === "investor" || isQualifiedForRefill(earn),
    planMonthlyLimit: plan.monthlyLimit,
    creditsPerBlock: creditsPerBlock(plan.monthlyLimit),
    catalogFlow: flow,
  };
}

export async function getActionCosts(flow: CreditCatalogFlow): Promise<ActionCostRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(creditActionCosts)
    .where(and(eq(creditActionCosts.flow, flow), eq(creditActionCosts.active, true)))
    .orderBy(asc(creditActionCosts.actionSlug));
  return billableActionCosts(
    rows.map((row) => ({
      action: row.actionSlug,
      label: row.label,
      cost: row.cost,
    })),
  );
}

export async function getActionCost(
  action: CreditActionType,
  flow: CreditCatalogFlow,
): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ cost: creditActionCosts.cost })
    .from(creditActionCosts)
    .where(
      and(
        eq(creditActionCosts.flow, flow),
        eq(creditActionCosts.actionSlug, action),
        eq(creditActionCosts.active, true),
      ),
    )
    .limit(1);
  if (!row) throw new Error(`unknown_action:${action}`);
  return row.cost;
}

export async function getTopUpPacks(flow: CreditCatalogFlow): Promise<TopUpPackDto[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(topupPacks)
    .where(and(eq(topupPacks.flow, flow), eq(topupPacks.active, true)))
    .orderBy(topupPacks.sortOrder);
  return rows.map((row) => ({
    slug: row.slug,
    label: row.label,
    credits: row.credits,
    price: row.priceCents / 100,
    listPrice:
      row.listPriceCents != null ? row.listPriceCents / 100 : undefined,
    blurb: row.blurb,
    discount: row.discount ?? undefined,
    popular: row.popular || undefined,
  }));
}

export async function getProPlanDto(flow: CreditCatalogFlow): Promise<ProPlanDto> {
  const db = await getDb();
  const [plan] = await db
    .select()
    .from(creditPlans)
    .where(and(eq(creditPlans.flow, flow), eq(creditPlans.slug, "pro")))
    .limit(1);
  if (!plan) throw new Error(`pro_plan_missing:${flow}`);
  return {
    monthlyPrice: (plan.monthlyPriceCents ?? (flow === "investor" ? 9900 : 3000)) / 100,
    annualPrice: (plan.annualPriceCents ?? (flow === "investor" ? 99000 : 30000)) / 100,
    monthlyListPrice:
      plan.listPriceCents != null ? plan.listPriceCents / 100 : undefined,
    annualListPrice:
      plan.annualListPriceCents != null
        ? plan.annualListPriceCents / 100
        : undefined,
    monthlyLimit: plan.monthlyLimit,
    dailyLimit: plan.dailyLimit,
    flow,
  };
}

async function getPlan(db: Db, slug: string, flow: CreditCatalogFlow) {
  const [plan] = await db
    .select()
    .from(creditPlans)
    .where(
      and(
        eq(creditPlans.flow, flow),
        eq(creditPlans.slug, slug),
        eq(creditPlans.active, true),
      ),
    )
    .limit(1);
  if (!plan) throw new Error(`plan_missing:${flow}:${slug}`);
  return plan;
}

/**
 * Brings a ledger's usage counters up to date before it is read or charged:
 * clears an expired daily block, rolls `dailyUsed` on the UTC day boundary, and
 * rolls Free `monthlyUsed` on the UTC month boundary.
 *
 * Applied lazily on every read/charge so correctness does not depend on the
 * reset cron having run — without the day roll the counter accumulated across
 * days and tripped `daily_limit` on a day the user spent far less (F20A-184).
 */
async function rollLedgerWindows(
  tx: Db,
  ledger: typeof workspaceCreditLedger.$inferSelect,
  now = new Date(),
): Promise<typeof workspaceCreditLedger.$inferSelect> {
  const patch: Partial<typeof workspaceCreditLedger.$inferSelect> = {};

  if (ledger.blockUntil && ledger.blockUntil.getTime() <= now.getTime()) {
    patch.blockUntil = null;
    patch.dailyUsed = 0;
  }

  if (shouldRollDailyWindow(ledger.dailyPeriodStart, now)) {
    patch.dailyUsed = 0;
    patch.dailyPeriodStart = utcDayStart(now);
  }

  if (shouldRollFreeMonthlyWindow(ledger.planSlug, ledger.monthlyPeriodStart, now)) {
    patch.monthlyPeriodStart = utcMonthStart(now);
    patch.monthlyLowToastShown = false;
    const earn = earnStateFromLedger(ledger);
    const flow = parseCreditCatalogFlow(ledger.flow);
    if (
      shouldResetFreeMonthlyUsage({
        planSlug: ledger.planSlug,
        monthAnchorStale: true,
        qualified: flow === "investor" || isQualifiedForRefill(earn),
      })
    ) {
      patch.monthlyUsed = 0;
    }
  }

  if (Object.keys(patch).length === 0) return ledger;

  const [updated] = await tx
    .update(workspaceCreditLedger)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(workspaceCreditLedger.accountId, ledger.accountId))
    .returning();
  return updated ?? { ...ledger, ...patch };
}

async function defaultFlowForAccount(db: Db, accountId: string): Promise<CreditCatalogFlow> {
  const [account] = await db
    .select({
      portfolioManagerEnabled: accounts.portfolioManagerEnabled,
      primaryCompanyUuid: accounts.primaryCompanyUuid,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (account?.portfolioManagerEnabled && account.primaryCompanyUuid == null) {
    return "investor";
  }
  return "founder";
}

export async function catalogFlowForAccount(accountId: string): Promise<CreditCatalogFlow> {
  const ledger = await ensureCreditLedger(accountId);
  return parseCreditCatalogFlow(ledger.flow);
}

export async function ensureCreditLedger(
  accountId: string,
  tx?: Db,
): Promise<typeof workspaceCreditLedger.$inferSelect> {
  const db = tx ?? (await getDb());
  const [existing] = await db
    .select()
    .from(workspaceCreditLedger)
    .where(eq(workspaceCreditLedger.accountId, accountId))
    .limit(1);
  if (existing) return existing;

  const now = new Date();
  const flow = await defaultFlowForAccount(db, accountId);
  const [created] = await db
    .insert(workspaceCreditLedger)
    .values({
      accountId,
      flow,
      planSlug: "free",
      monthlyUsed: 0,
      dailyUsed: 0,
      topUpBalance: 0,
      dailyPeriodStart: utcDayStart(now),
      monthlyPeriodStart: utcMonthStart(now),
      earnedModules: [],
      benchmarkEarned: false,
      setupIncomplete: false,
      profilePromptDismissed: false,
      stats: DEFAULT_STATS,
    })
    .returning();
  if (!created) throw new Error("ledger_init_failed");
  return created;
}

/**
 * If Pro was canceled at period end and that period is over, downgrade to Free.
 * Returns the free snapshot when a downgrade ran; otherwise null.
 */
export async function revertExpiredCanceledProIfNeeded(
  accountId: string,
  now = Date.now(),
): Promise<CreditSnapshot | null> {
  const ledger = await ensureCreditLedger(accountId);
  if (
    !shouldRevertCanceledPro({
      plan: ledger.planSlug,
      cancelAtPeriodEnd: ledger.cancelAtPeriodEnd,
      periodEndsAt: ledger.currentPeriodEnd ? ledger.currentPeriodEnd.getTime() : null,
      now,
    })
  ) {
    return null;
  }
  return revertToFreePlan(accountId);
}

/** Batch downgrade for cron — canceled Pro accounts past current_period_end. */
export async function revertExpiredCanceledSubscriptions(
  now = new Date(),
): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ accountId: workspaceCreditLedger.accountId })
    .from(workspaceCreditLedger)
    .where(
      and(
        eq(workspaceCreditLedger.planSlug, "pro"),
        eq(workspaceCreditLedger.cancelAtPeriodEnd, true),
        lte(workspaceCreditLedger.currentPeriodEnd, now),
      ),
    );
  for (const row of rows) {
    await revertToFreePlan(row.accountId);
  }
  return rows.length;
}

export async function getCreditSnapshot(accountId: string): Promise<CreditSnapshot> {
  const downgraded = await revertExpiredCanceledProIfNeeded(accountId);
  if (downgraded) return downgraded;

  const db = await getDb();
  const ledger = await ensureCreditLedger(accountId);
  const plan = await getPlan(db, ledger.planSlug, parseCreditCatalogFlow(ledger.flow));
  const rolled = await rollLedgerWindows(db, ledger);
  return toSnapshot(rolled, plan);
}

export async function tryCreditAction(
  accountId: string,
  action: CreditActionType,
  options?: { referenceId?: string; userEmail?: string | null },
): Promise<TryActionResult> {
  // Enforce Free limits as soon as the canceled Pro term ends — do not wait
  // for Stripe's customer.subscription.deleted webhook.
  await revertExpiredCanceledProIfNeeded(accountId);

  const db = await getDb();
  const primed = await ensureCreditLedger(accountId);
  const cost = await getActionCost(action, parseCreditCatalogFlow(primed.flow));
  const referenceId = options?.referenceId;
  const userEmail = options?.userEmail ?? null;

  // Free actions: allow without ledger write (0-cost = excluded from dialog).
  if (cost === 0) {
    return { allowed: true, snapshot: await getCreditSnapshot(accountId) };
  }

  return db.transaction(async (tx) => {
    const ledger = await ensureCreditLedger(accountId, tx);
    const plan = await getPlan(tx, ledger.planSlug, parseCreditCatalogFlow(ledger.flow));
    let activeLedger = await rollLedgerWindows(tx, ledger);

    // Purchased top-ups clear a daily pause so top-up balance can be spent, but
    // must NOT reset dailyUsed — that would re-open included Pro/Free daily room
    // and let monthly credits bleed past the daily cap.
    const now = Date.now();
    if (
      activeLedger.topUpBalance > 0 &&
      activeLedger.blockUntil != null &&
      activeLedger.blockUntil.getTime() > now
    ) {
      const [unblocked] = await tx
        .update(workspaceCreditLedger)
        .set({
          blockUntil: null,
          updatedAt: sql`now()`,
        })
        .where(eq(workspaceCreditLedger.accountId, accountId))
        .returning();
      activeLedger = unblocked ?? {
        ...activeLedger,
        blockUntil: null,
      };
    }

    const snapshot = toSnapshot(activeLedger, plan);
    const spendable = availableToday(snapshot);
    const monthlyLeft = Math.max(0, snapshot.monthlyLimit - snapshot.monthlyUsed);

    if (spendable < cost) {
      // Included daily room + top-ups exhausted while monthly Pro still remains → daily pause.
      if (
        spendable <= 0 &&
        (monthlyLeft > 0 ||
          (snapshot.blockUntil != null && snapshot.blockUntil > now))
      ) {
        return { allowed: false, reason: "blocked" as const, snapshot };
      }
      return {
        allowed: false,
        reason: "insufficient" as const,
        snapshot,
        balance: spendable,
        required: cost,
      };
    }

    // Consume included daily Pro/Free room first, then top-ups. Only the included
    // portion increments dailyUsed — top-ups have no daily cap.
    let monthlyUsed = activeLedger.monthlyUsed;
    let topUpBalance = activeLedger.topUpBalance;
    let dailyUsed = activeLedger.dailyUsed;
    const proRoomToday = dailyRemaining(snapshot);
    const fromPro = Math.min(cost, proRoomToday);
    const fromTopUp = cost - fromPro;
    monthlyUsed += fromPro;
    dailyUsed += fromPro;
    if (fromTopUp > 0) {
      topUpBalance = Math.max(0, topUpBalance - fromTopUp);
    }
    const source: "monthly" | "topup" = fromPro > 0 ? "monthly" : "topup";

    const nextSnapshotBase = {
      ...snapshot,
      monthlyUsed,
      dailyUsed,
      topUpBalance,
    };
    const nextSpendable = availableToday(nextSnapshotBase);
    let blockUntil: Date | null = null;
    if (nextSpendable <= 0 && dailyRemaining(nextSnapshotBase) <= 0) {
      // Included daily room gone and no top-ups left — pause until block window.
      blockUntil = new Date(now + plan.blockDurationMs);
    }

    const stats = bumpStats(activeLedger.stats ?? DEFAULT_STATS, action);

    const [updated] = await tx
      .update(workspaceCreditLedger)
      .set({
        monthlyUsed,
        topUpBalance,
        dailyUsed,
        blockUntil,
        stats,
        updatedAt: sql`now()`,
      })
      .where(eq(workspaceCreditLedger.accountId, accountId))
      .returning();

    await tx.insert(creditTransactions).values({
      id: `ctx_${randomUUID()}`,
      accountId,
      actionSlug: action,
      amount: -cost,
      source,
      referenceId: referenceId ?? null,
      userEmail,
    });

    const nextPlan = plan;
    return {
      allowed: true,
      snapshot: toSnapshot(updated ?? activeLedger, nextPlan),
    };
  });
}

/**
 * Reverse a prior `tryCreditAction` debit for a failed playbook run (F20A-231).
 * Idempotent on `referenceId` — a second call inserts no extra credit row.
 */
export async function refundCreditAction(opts: {
  accountId: string;
  referenceId: string;
  action: CreditActionType;
  userEmail?: string | null;
}): Promise<{ refunded: boolean; snapshot: CreditSnapshot }> {
  const db = await getDb();
  const referenceId = opts.referenceId;

  return db.transaction(async (tx) => {
    const related = await tx
      .select({
        id: creditTransactions.id,
        referenceId: creditTransactions.referenceId,
        actionSlug: creditTransactions.actionSlug,
        amount: creditTransactions.amount,
        source: creditTransactions.source,
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.accountId, opts.accountId),
          eq(creditTransactions.referenceId, referenceId),
        ),
      );

    const decision = resolveCreditRefund({
      referenceId,
      action: opts.action,
      debits: related,
      refunds: related,
    });

    const ledger = await ensureCreditLedger(opts.accountId, tx);
    const plan = await getPlan(tx, ledger.planSlug, parseCreditCatalogFlow(ledger.flow));

    if (decision.kind === "skip") {
      return {
        refunded: false,
        snapshot: toSnapshot(ledger, plan),
      };
    }

    const next = reverseCreditDebitCounters(
      {
        monthlyUsed: ledger.monthlyUsed,
        dailyUsed: ledger.dailyUsed,
        topUpBalance: ledger.topUpBalance,
        blockUntil: ledger.blockUntil,
      },
      { amount: decision.amount, source: decision.source },
    );

    const [updated] = await tx
      .update(workspaceCreditLedger)
      .set({
        monthlyUsed: next.monthlyUsed,
        dailyUsed: next.dailyUsed,
        topUpBalance: next.topUpBalance,
        blockUntil: next.blockUntil,
        updatedAt: sql`now()`,
      })
      .where(eq(workspaceCreditLedger.accountId, opts.accountId))
      .returning();

    await tx.insert(creditTransactions).values({
      id: `ctx_${randomUUID()}`,
      accountId: opts.accountId,
      actionSlug: opts.action,
      amount: decision.amount,
      source: "refund",
      referenceId,
      userEmail: opts.userEmail ?? null,
    });

    return {
      refunded: true,
      snapshot: toSnapshot(updated ?? { ...ledger, ...next }, plan),
    };
  });
}

export async function activateProPlan(opts: {
  accountId: string;
  stripeSubscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<CreditSnapshot> {
  const db = await getDb();
  const existing = await ensureCreditLedger(opts.accountId);
  const plan = await getPlan(db, "pro", parseCreditCatalogFlow(existing.flow));
  const now = new Date();

  const [updated] = await db
    .update(workspaceCreditLedger)
    .set({
      planSlug: "pro",
      monthlyUsed: 0,
      dailyUsed: 0,
      blockUntil: null,
      dailyPeriodStart: utcDayStart(now),
      monthlyPeriodStart: utcMonthStart(now),
      stripeSubscriptionId: opts.stripeSubscriptionId,
      currentPeriodStart: opts.periodStart,
      currentPeriodEnd: opts.periodEnd,
      cancelAtPeriodEnd: false,
      monthlyLowToastShown: false,
      updatedAt: sql`now()`,
    })
    .where(eq(workspaceCreditLedger.accountId, opts.accountId))
    .returning();

  await db
    .update(accounts)
    .set({ planTier: "pro", planId: "pro", status: "ACTIVE", updatedAt: sql`now()` })
    .where(eq(accounts.id, opts.accountId));

  const ledger = updated ?? (await ensureCreditLedger(opts.accountId));
  return toSnapshot(ledger, plan);
}

export async function revertToFreePlan(accountId: string): Promise<CreditSnapshot> {
  const db = await getDb();
  const existing = await ensureCreditLedger(accountId);
  const plan = await getPlan(db, "free", parseCreditCatalogFlow(existing.flow));
  const now = new Date();

  const [updated] = await db
    .update(workspaceCreditLedger)
    .set({
      planSlug: "free",
      monthlyUsed: 0,
      dailyUsed: 0,
      blockUntil: null,
      dailyPeriodStart: utcDayStart(now),
      monthlyPeriodStart: utcMonthStart(now),
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      updatedAt: sql`now()`,
    })
    .where(eq(workspaceCreditLedger.accountId, accountId))
    .returning();

  await db
    .update(accounts)
    .set({ planTier: "free", planId: "free", updatedAt: sql`now()` })
    .where(eq(accounts.id, accountId));

  const ledger = updated ?? (await ensureCreditLedger(accountId));
  return toSnapshot(ledger, plan);
}

export async function resetProBillingPeriod(opts: {
  accountId: string;
  periodStart: Date;
  periodEnd: Date;
  /** When false, only persist period bounds (e.g. cancel-date edit). Default true. */
  resetUsage?: boolean;
}): Promise<void> {
  const db = await getDb();
  const resetUsage = opts.resetUsage !== false;
  const now = new Date();
  await db
    .update(workspaceCreditLedger)
    .set({
      ...(resetUsage
        ? {
            monthlyUsed: 0,
            dailyUsed: 0,
            blockUntil: null,
            dailyPeriodStart: utcDayStart(now),
            monthlyPeriodStart: utcMonthStart(now),
          }
        : {}),
      currentPeriodStart: opts.periodStart,
      currentPeriodEnd: opts.periodEnd,
      updatedAt: sql`now()`,
    })
    .where(eq(workspaceCreditLedger.accountId, opts.accountId));
}

export async function applyTopUp(opts: {
  accountId: string;
  credits: number;
  referenceId: string;
}): Promise<CreditSnapshot> {
  const db = await getDb();
  const ledger = await ensureCreditLedger(opts.accountId);
  const plan = await getPlan(db, ledger.planSlug, parseCreditCatalogFlow(ledger.flow));

  const wasDailyBlocked =
    ledger.blockUntil != null && ledger.blockUntil.getTime() > Date.now();

  const [updated] = await db
    .update(workspaceCreditLedger)
    .set({
      topUpBalance: ledger.topUpBalance + opts.credits,
      // Clear pause so top-ups are spendable, but keep dailyUsed so included
      // daily room is not re-opened for the rest of the UTC day.
      ...(wasDailyBlocked ? { blockUntil: null } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(workspaceCreditLedger.accountId, opts.accountId))
    .returning();

  await db.insert(creditTransactions).values({
    id: `ctx_${randomUUID()}`,
    accountId: opts.accountId,
    actionSlug: null,
    amount: opts.credits,
    source: "topup",
    referenceId: opts.referenceId,
  });

  return toSnapshot(updated ?? ledger, plan, {
    justUnblocked: wasDailyBlocked,
  });
}

export async function resetFreeMonthlyLedgers(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const freeRows = await db
    .select()
    .from(workspaceCreditLedger)
    .where(eq(workspaceCreditLedger.planSlug, "free"));

  let reset = 0;
  for (const ledger of freeRows) {
    const earn = earnStateFromLedger(ledger);
    const qualified = isQualifiedForRefill(earn);
    await db
      .update(workspaceCreditLedger)
      .set({
        ...(qualified
          ? {
              monthlyUsed: 0,
              dailyUsed: 0,
              blockUntil: null,
              dailyPeriodStart: utcDayStart(now),
            }
          : {}),
        monthlyPeriodStart: utcMonthStart(now),
        monthlyLowToastShown: false,
        updatedAt: sql`now()`,
      })
      .where(eq(workspaceCreditLedger.accountId, ledger.accountId));
    if (qualified) reset += 1;
  }
  return reset;
}

export async function clearExpiredDailyBlocks(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .update(workspaceCreditLedger)
    .set({
      blockUntil: null,
      dailyUsed: 0,
      dailyPeriodStart: utcDayStart(now),
      updatedAt: sql`now()`,
    })
    .where(
      and(
        lte(workspaceCreditLedger.blockUntil, now),
        sql`${workspaceCreditLedger.blockUntil} IS NOT NULL`,
      ),
    )
    .returning({ accountId: workspaceCreditLedger.accountId });
  return rows.length;
}

export async function markMonthlyLowToastShown(accountId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(workspaceCreditLedger)
    .set({ monthlyLowToastShown: true, updatedAt: sql`now()` })
    .where(eq(workspaceCreditLedger.accountId, accountId));
}

export async function setCancelAtPeriodEnd(
  accountId: string,
  cancelAtPeriodEnd: boolean,
): Promise<void> {
  const db = await getDb();
  await db
    .update(workspaceCreditLedger)
    .set({ cancelAtPeriodEnd, updatedAt: sql`now()` })
    .where(eq(workspaceCreditLedger.accountId, accountId));
}

export async function getLedgerByAccountId(accountId: string) {
  return ensureCreditLedger(accountId);
}

export async function getAccountByStripeCustomerId(customerId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.stripeCustomerId, customerId))
    .limit(1);
  return row ?? null;
}

export async function getTopUpPackBySlug(slug: string, flow: CreditCatalogFlow) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(topupPacks)
    .where(
      and(eq(topupPacks.flow, flow), eq(topupPacks.slug, slug), eq(topupPacks.active, true)),
    )
    .limit(1);
  return row ?? null;
}

export async function getCreditPlan(slug: CreditPlanSlug, flow: CreditCatalogFlow) {
  const db = await getDb();
  return getPlan(db, slug, flow);
}

export async function setStripeCustomerId(accountId: string, customerId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(accounts)
    .set({ stripeCustomerId: customerId, updatedAt: sql`now()` })
    .where(eq(accounts.id, accountId));
}

export async function getLedgerBySubscriptionId(subscriptionId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(workspaceCreditLedger)
    .where(eq(workspaceCreditLedger.stripeSubscriptionId, subscriptionId))
    .limit(1);
  return row ?? null;
}

export async function listLedgersForPlan(slugs: CreditPlanSlug[]) {
  const db = await getDb();
  return db
    .select()
    .from(workspaceCreditLedger)
    .where(inArray(workspaceCreditLedger.planSlug, slugs));
}

export async function persistProfileEarn(
  accountId: string,
  patch: {
    modules?: ProfileModuleId[];
    replaceModules?: boolean;
    benchmark?: boolean;
    setupIncomplete?: boolean;
    profilePromptDismissed?: boolean;
  },
): Promise<{
  snapshot: CreditSnapshot;
  newlyEarnedModules: ProfileModuleId[];
  benchmarkNewlyEarned: boolean;
}> {
  const db = await getDb();
  await ensureCreditLedger(accountId, db);

  return db.transaction(async (tx) => {
    const [ledger] = await tx
      .select()
      .from(workspaceCreditLedger)
      .where(eq(workspaceCreditLedger.accountId, accountId))
      .for("update")
      .limit(1);
    if (!ledger) throw new Error("ledger_missing_after_init");

    const flow = parseCreditCatalogFlow(ledger.flow);
    const plan = await getPlan(tx, ledger.planSlug, flow);
    if (flow === "investor") {
      return {
        snapshot: toSnapshot(ledger, plan),
        newlyEarnedModules: [],
        benchmarkNewlyEarned: false,
      };
    }
    const current = earnStateFromLedger(ledger);
    const modules = patch.modules
      ? patch.replaceModules
        ? [...new Set(patch.modules)]
        : mergeEarnedModules(current.modules, patch.modules)
      : current.modules;
    const benchmark = patch.benchmark ?? current.benchmark;
    const newlyEarnedModules = modules.filter((id) => !current.modules.includes(id));
    const benchmarkNewlyEarned = benchmark && !current.benchmark;

    const [updated] = await tx
      .update(workspaceCreditLedger)
      .set({
        earnedModules: modules,
        benchmarkEarned: benchmark,
        setupIncomplete: patch.setupIncomplete ?? current.setupIncomplete,
        profilePromptDismissed:
          patch.profilePromptDismissed ?? current.profilePromptDismissed,
        updatedAt: sql`now()`,
      })
      .where(eq(workspaceCreditLedger.accountId, accountId))
      .returning();

    return {
      snapshot: toSnapshot(updated ?? { ...ledger, earnedModules: modules }, plan),
      newlyEarnedModules,
      benchmarkNewlyEarned,
    };
  });
}

export async function dismissProfileCompletionPrompt(accountId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(workspaceCreditLedger)
    .set({ profilePromptDismissed: true, updatedAt: sql`now()` })
    .where(eq(workspaceCreditLedger.accountId, accountId));
}
