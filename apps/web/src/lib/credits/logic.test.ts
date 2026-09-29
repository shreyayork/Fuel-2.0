import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availableToday,
  canAfford,
  classifyInsufficientCredits,
  dailyRemaining,
  excludeRefundedUsageDebits,
  usageActivityActionCostMatches,
  formatActionInsufficientCreditsMessage,
  formatBlockUntilResetLabel,
  formatCountdown,
  formatInsufficientCreditsMessage,
  hasActiveBlockCountdown,
  isDailyBlocked,
  isGenerationBlocked,
  monthlyResetLabelFromDate,
  resolveCreditRefund,
  reverseCreditDebitCounters,
  shouldRevertCanceledPro,
  shouldRollDailyWindow,
  shouldRollFreeMonthlyWindow,
  totalRemaining,
  utcDayStart,
  utcMonthStart,
} from "./logic";
import { EMPTY_SNAPSHOT_EARN } from "./profile-modules";
import type { CreditSnapshot } from "./types";

function snap(partial: Partial<CreditSnapshot>): CreditSnapshot {
  return {
    plan: "free",
    billingCycle: null,
    cancelAtPeriodEnd: false,
    periodEndsAt: null,
    monthlyUsed: 0,
    monthlyLimit: 250,
    dailyUsed: 0,
    dailyLimit: 75,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "—",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 0, docs: 0, messages: 0 },
    catalogFlow: "founder",
    ...EMPTY_SNAPSHOT_EARN,
    ...partial,
  };
}

describe("shouldRevertCanceledPro", () => {
  const periodEnd = Date.parse("2026-09-01T00:00:00.000Z");

  it("returns false while Pro cancel is still within the paid term", () => {
    assert.equal(
      shouldRevertCanceledPro({
        plan: "pro",
        cancelAtPeriodEnd: true,
        periodEndsAt: periodEnd,
        now: Date.parse("2026-08-15T12:00:00.000Z"),
      }),
      false,
    );
  });

  it("returns true once canceled Pro period end has elapsed", () => {
    assert.equal(
      shouldRevertCanceledPro({
        plan: "pro",
        cancelAtPeriodEnd: true,
        periodEndsAt: periodEnd,
        now: Date.parse("2026-09-16T15:00:00.000Z"),
      }),
      true,
    );
  });

  it("ignores free plans and active (non-canceled) Pro", () => {
    assert.equal(
      shouldRevertCanceledPro({
        plan: "free",
        cancelAtPeriodEnd: true,
        periodEndsAt: periodEnd,
        now: Date.parse("2026-09-16T15:00:00.000Z"),
      }),
      false,
    );
    assert.equal(
      shouldRevertCanceledPro({
        plan: "pro",
        cancelAtPeriodEnd: false,
        periodEndsAt: periodEnd,
        now: Date.parse("2026-09-16T15:00:00.000Z"),
      }),
      false,
    );
  });
});

describe("monthlyResetLabelFromDate", () => {
  it("formats Stripe period end as the reset / period-end label (no +1 month)", () => {
    const end = new Date(Date.UTC(2026, 7, 6)); // Aug 6, 2026
    const label = monthlyResetLabelFromDate(end);
    assert.match(label, /Aug/);
    assert.match(label, /6/);
    assert.match(label, /2026/);
    assert.doesNotMatch(label, /Sep/);
  });
});

describe("availableToday — daily room + top-up only", () => {
  it("caps Pro spend today at daily allowance + top-up (not full monthly)", () => {
    const s = snap({
      plan: "pro",
      monthlyLimit: 2000,
      monthlyUsed: 0,
      dailyLimit: 250,
      dailyUsed: 0,
      topUpBalance: 1000,
    });
    assert.equal(dailyRemaining(s), 250);
    assert.equal(availableToday(s), 1250);
    assert.equal(totalRemaining(s), 3000);
    assert.equal(canAfford(s, 1250), true);
    assert.equal(canAfford(s, 1251), false);
  });

  it("blocks further spend after daily + top-up exhausted while monthly remains", () => {
    const s = snap({
      plan: "pro",
      monthlyLimit: 2000,
      monthlyUsed: 250,
      dailyLimit: 250,
      dailyUsed: 250,
      topUpBalance: 0,
      blockUntil: Date.parse("2026-08-06T12:00:00.000Z"),
    });
    assert.equal(dailyRemaining(s), 0);
    assert.equal(availableToday(s), 0);
    assert.equal(totalRemaining(s), 1750);
    assert.equal(isDailyBlocked(s, Date.parse("2026-08-05T12:00:00.000Z")), true);
    assert.equal(isGenerationBlocked(s), true);
    assert.equal(canAfford(s, 1), false);
  });

  it("allows top-up spend after daily Pro room is gone without reopening monthly", () => {
    const s = snap({
      plan: "pro",
      monthlyLimit: 2000,
      monthlyUsed: 250,
      dailyLimit: 250,
      dailyUsed: 250,
      topUpBalance: 400,
    });
    assert.equal(dailyRemaining(s), 0);
    assert.equal(availableToday(s), 400);
    assert.equal(isDailyBlocked(s), false);
    assert.equal(isGenerationBlocked(s), false);
    assert.equal(canAfford(s, 400), true);
    assert.equal(canAfford(s, 401), false);
  });

  it("caps daily room by remaining monthly included credits", () => {
    const s = snap({
      plan: "pro",
      monthlyLimit: 2000,
      monthlyUsed: 1980,
      dailyLimit: 250,
      dailyUsed: 0,
      topUpBalance: 100,
    });
    assert.equal(dailyRemaining(s), 20);
    assert.equal(availableToday(s), 120);
  });
});

describe("top-up credits after Free downgrade", () => {
  const now = Date.parse("2026-08-05T12:00:00.000Z");
  const blockUntil = now + 86_400_000;

  it("does not treat day as blocked when purchased top-ups remain", () => {
    const s = snap({
      plan: "free",
      monthlyUsed: 250,
      monthlyLimit: 250,
      topUpBalance: 400,
      blockUntil,
      dailyUsed: 75,
      dailyLimit: 75,
    });
    assert.equal(isDailyBlocked(s, now), false);
    assert.equal(isGenerationBlocked(s, now), false);
    assert.equal(totalRemaining(s), 400);
    assert.equal(availableToday(s), 400);
  });

  it("blocks generation when Free daily + monthly are exhausted and top-ups are empty", () => {
    const s = snap({
      plan: "free",
      monthlyUsed: 250,
      monthlyLimit: 250,
      topUpBalance: 0,
      blockUntil,
      dailyUsed: 75,
      dailyLimit: 75,
    });
    // Monthly included also empty → monthly-empty, not a daily-only pause.
    assert.equal(isDailyBlocked(s, now), false);
    assert.equal(isGenerationBlocked(s, now), true);
    assert.equal(availableToday(s), 0);
  });

  it("treats Free daily exhaustion as daily block when monthly included remains", () => {
    const s = snap({
      plan: "free",
      monthlyUsed: 100,
      monthlyLimit: 250,
      topUpBalance: 0,
      blockUntil,
      dailyUsed: 75,
      dailyLimit: 75,
    });
    assert.equal(isDailyBlocked(s, now), true);
    assert.equal(isGenerationBlocked(s, now), true);
    assert.equal(availableToday(s), 0);
  });
});

describe("daily / monthly window rollover (F20A-184)", () => {
  it("derives UTC day and month starts", () => {
    const mid = new Date("2026-08-06T18:45:12.500Z");
    assert.equal(utcDayStart(mid).toISOString(), "2026-08-06T00:00:00.000Z");
    assert.equal(utcMonthStart(mid).toISOString(), "2026-08-01T00:00:00.000Z");
  });

  it("keeps the counter within the same UTC day", () => {
    const anchor = new Date("2026-08-06T00:00:00.000Z");
    assert.equal(shouldRollDailyWindow(anchor, new Date("2026-08-06T23:59:59.000Z")), false);
  });

  it("rolls the counter once the UTC day advances", () => {
    const anchor = new Date("2026-08-06T00:00:00.000Z");
    assert.equal(shouldRollDailyWindow(anchor, new Date("2026-08-07T00:00:00.000Z")), true);
  });

  it("treats a missing anchor as stale so legacy ledgers start a clean day", () => {
    assert.equal(shouldRollDailyWindow(null, new Date("2026-08-06T09:00:00.000Z")), true);
  });

  it("does not strand a Free user below the daily limit after spending across days", () => {
    // Aug 4: 25 credits. Aug 6: 50 credits. Pre-fix the ledger counter reached
    // 75 and tripped the block on a day the user only spent 50.
    const anchor = new Date("2026-08-04T00:00:00.000Z");
    const chargeDay = new Date("2026-08-06T10:00:00.000Z");
    assert.equal(shouldRollDailyWindow(anchor, chargeDay), true);

    const rolledDailyUsed = 0 + 50;
    const s = snap({ plan: "free", dailyUsed: rolledDailyUsed, dailyLimit: 75 });
    assert.equal(dailyRemaining(s), 25);
    assert.equal(isDailyBlocked(s, chargeDay.getTime()), false);
  });

  it("rolls Free monthly credits on the UTC month boundary", () => {
    const anchor = new Date("2026-07-01T00:00:00.000Z");
    assert.equal(
      shouldRollFreeMonthlyWindow("free", anchor, new Date("2026-07-31T23:00:00.000Z")),
      false,
    );
    assert.equal(
      shouldRollFreeMonthlyWindow("free", anchor, new Date("2026-08-01T00:00:00.000Z")),
      true,
    );
  });

  it("leaves Pro monthly credits to the Stripe period webhook", () => {
    const anchor = new Date("2026-07-01T00:00:00.000Z");
    assert.equal(
      shouldRollFreeMonthlyWindow("pro", anchor, new Date("2026-09-01T00:00:00.000Z")),
      false,
    );
    assert.equal(shouldRollFreeMonthlyWindow("pro", null, new Date("2026-09-01T00:00:00.000Z")), false);
  });
});

describe("formatInsufficientCreditsMessage", () => {
  it("includes required and remaining credits for the F20A-191 copy", () => {
    assert.equal(
      formatInsufficientCreditsMessage(50, 10),
      "Insufficient credits. This action requires 50 credits, but you have only 10 credits remaining.",
    );
  });

  it("uses live cost values without hardcoding playbook pricing", () => {
    assert.equal(
      formatInsufficientCreditsMessage(40, 10),
      "Insufficient credits. This action requires 40 credits, but you have only 10 credits remaining.",
    );
    assert.equal(
      formatInsufficientCreditsMessage(40, 0),
      "Insufficient credits. This action requires 40 credits, but you have only 0 credits remaining.",
    );
  });
});

describe("classifyInsufficientCredits / formatActionInsufficientCreditsMessage (F20A-219)", () => {
  it("classifies daily-limit when availableToday is short but total can cover", () => {
    const s = snap({
      monthlyLimit: 251,
      monthlyUsed: 73,
      dailyLimit: 75,
      dailyUsed: 73,
      topUpBalance: 0,
    });
    assert.equal(availableToday(s), 2);
    assert.equal(totalRemaining(s), 178);
    assert.equal(classifyInsufficientCredits(s, 11), "daily_limit");
  });

  it("does not classify daily-limit when top-ups make availableToday enough", () => {
    const s = snap({
      monthlyLimit: 251,
      monthlyUsed: 73,
      dailyLimit: 75,
      dailyUsed: 75,
      topUpBalance: 20,
    });
    assert.equal(availableToday(s), 20);
    assert.equal(classifyInsufficientCredits(s, 11), "total_balance");
    assert.equal(canAfford(s, 11), true);
  });

  it("classifies total_balance when period pool cannot cover the cost", () => {
    const s = snap({
      monthlyLimit: 250,
      monthlyUsed: 240,
      dailyLimit: 75,
      dailyUsed: 0,
      topUpBalance: 0,
    });
    assert.equal(totalRemaining(s), 10);
    assert.equal(classifyInsufficientCredits(s, 50), "total_balance");
  });

  it("formats daily-limit copy with today left, total balance, and blockUntil reset", () => {
    const now = Date.parse("2026-09-02T12:00:00.000Z");
    const blockUntil = Date.parse("2026-09-03T00:00:00.000Z");
    const s = snap({
      monthlyLimit: 251,
      monthlyUsed: 73,
      dailyLimit: 75,
      dailyUsed: 73,
      topUpBalance: 0,
      blockUntil,
    });
    const message = formatActionInsufficientCreditsMessage(s, 11, now);
    assert.match(message, /Daily limit is not sufficient to run this AI task/);
    assert.match(message, /needs 11 credits/);
    assert.match(message, /2 credits left today/);
    assert.match(message, /Total balance: 178 \/ 251/);
    assert.match(message, /Daily limit resets at/);
    assert.ok(formatBlockUntilResetLabel(blockUntil, now));
  });

  it("omits reset time when blockUntil is absent", () => {
    const s = snap({
      monthlyLimit: 251,
      monthlyUsed: 73,
      dailyLimit: 75,
      dailyUsed: 73,
      topUpBalance: 0,
      blockUntil: null,
    });
    const message = formatActionInsufficientCreditsMessage(s, 11);
    assert.match(message, /Total balance: 178 \/ 251/);
    assert.doesNotMatch(message, /Daily limit resets at/);
  });

  it("formats total-balance copy via the legacy insufficient message", () => {
    const s = snap({
      monthlyLimit: 250,
      monthlyUsed: 240,
      dailyLimit: 75,
      dailyUsed: 0,
      topUpBalance: 0,
    });
    assert.equal(
      formatActionInsufficientCreditsMessage(s, 50),
      "Insufficient credits. This action requires 50 credits, but you have only 10 credits remaining.",
    );
  });
});

describe("hasActiveBlockCountdown", () => {
  it("hides stale 0m countdowns when daily pause has no live blockUntil", () => {
    assert.equal(hasActiveBlockCountdown(0), false);
    assert.equal(hasActiveBlockCountdown(-1), false);
    assert.equal(hasActiveBlockCountdown(Number.NaN), false);
  });

  it("shows countdown while a reset window remains", () => {
    assert.equal(hasActiveBlockCountdown(1), true);
    assert.equal(hasActiveBlockCountdown(6 * 60 * 60 * 1000), true);
    assert.equal(formatCountdown(6 * 60 * 60 * 1000), "6h");
  });
});

describe("reverseCreditDebitCounters (F20A-231)", () => {
  it("restores monthly + daily room for monthly-source debit", () => {
    const next = reverseCreditDebitCounters(
      {
        monthlyUsed: 120,
        dailyUsed: 60,
        topUpBalance: 10,
        blockUntil: new Date("2099-01-01T00:00:00.000Z"),
      },
      { amount: 50, source: "monthly" },
    );
    assert.deepEqual(next, {
      monthlyUsed: 70,
      dailyUsed: 10,
      topUpBalance: 10,
      blockUntil: null,
    });
  });

  it("restores top-up balance for topup-source debit", () => {
    const next = reverseCreditDebitCounters(
      {
        monthlyUsed: 100,
        dailyUsed: 75,
        topUpBalance: 5,
        blockUntil: new Date("2099-01-01T00:00:00.000Z"),
      },
      { amount: -40, source: "topup" },
    );
    assert.equal(next.topUpBalance, 45);
    assert.equal(next.monthlyUsed, 100);
    assert.equal(next.dailyUsed, 75);
    assert.equal(next.blockUntil, null);
  });

  it("floors counters at zero", () => {
    const next = reverseCreditDebitCounters(
      {
        monthlyUsed: 10,
        dailyUsed: 5,
        topUpBalance: 0,
        blockUntil: null,
      },
      { amount: 50, source: "monthly" },
    );
    assert.equal(next.monthlyUsed, 0);
    assert.equal(next.dailyUsed, 0);
  });
});

describe("resolveCreditRefund (F20A-231)", () => {
  const debit = {
    id: "ctx_debit",
    referenceId: "run_1",
    actionSlug: "playbookRun",
    amount: -50,
    source: "monthly",
  };

  it("returns refund plan for matching debit", () => {
    const decision = resolveCreditRefund({
      referenceId: "run_1",
      action: "playbookRun",
      debits: [debit],
      refunds: [],
    });
    assert.deepEqual(decision, {
      kind: "refund",
      debitId: "ctx_debit",
      amount: 50,
      source: "monthly",
    });
  });

  it("is idempotent — second resolve with existing refund skips (one credit row)", () => {
    const refunds = [
      {
        referenceId: "run_1",
        amount: 50,
        source: "refund",
      },
    ];
    const first = resolveCreditRefund({
      referenceId: "run_1",
      action: "playbookRun",
      debits: [debit],
      refunds: [],
    });
    const second = resolveCreditRefund({
      referenceId: "run_1",
      action: "playbookRun",
      debits: [debit],
      refunds,
    });
    assert.equal(first.kind, "refund");
    assert.deepEqual(second, { kind: "skip", reason: "already_refunded" });
  });

  it("skips when no debit exists for referenceId", () => {
    const decision = resolveCreditRefund({
      referenceId: "run_missing",
      action: "playbookRun",
      debits: [debit],
      refunds: [],
    });
    assert.deepEqual(decision, { kind: "skip", reason: "no_debit" });
  });
});

describe("excludeRefundedUsageDebits (F20A-231)", () => {
  it("drops debits whose referenceId was refunded", () => {
    const kept = excludeRefundedUsageDebits(
      [
        { id: "a", referenceId: "run_1" },
        { id: "b", referenceId: "run_2" },
        { id: "c", referenceId: null },
      ],
      new Set(["run_1"]),
    );
    assert.deepEqual(
      kept.map((r) => r.id),
      ["b", "c"],
    );
  });
});

describe("usageActivityActionCostMatches (F20A-261)", () => {
  const dualFlowCatalog = [
    { flow: "founder", actionSlug: "aiChat", label: "AI chat message" },
    { flow: "investor", actionSlug: "aiChat", label: "AI chat message" },
    { flow: "founder", actionSlug: "generateSource", label: "Generate source" },
    { flow: "investor", actionSlug: "generateSource", label: "Generate source" },
  ] as const;

  it("matches only the account-flow catalog row for a debit slug", () => {
    const matches = dualFlowCatalog.filter((cost) =>
      usageActivityActionCostMatches({
        transactionActionSlug: "aiChat",
        costActionSlug: cost.actionSlug,
        costFlow: cost.flow,
        accountFlow: "founder",
      }),
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.flow, "founder");
  });

  it("keeps TOTAL THIS PERIOD at one debit amount under dual-flow catalogs", () => {
    const debitCredits = 14;
    // Slug-only join (pre-fix) fans out one debit across founder + investor rows.
    const slugOnlyJoined = dualFlowCatalog.filter((c) => c.actionSlug === "aiChat");
    assert.equal(slugOnlyJoined.length, 2);
    assert.equal(
      slugOnlyJoined.reduce((n) => n + debitCredits, 0),
      debitCredits * 2,
    );

    const flowScopedJoined = dualFlowCatalog.filter((cost) =>
      usageActivityActionCostMatches({
        transactionActionSlug: "aiChat",
        costActionSlug: cost.actionSlug,
        costFlow: cost.flow,
        accountFlow: "investor",
      }),
    );
    assert.equal(flowScopedJoined.length, 1);
    assert.equal(
      flowScopedJoined.reduce((n) => n + debitCredits, 0),
      debitCredits,
    );
  });

  it("returns false when slug or flow differs", () => {
    assert.equal(
      usageActivityActionCostMatches({
        transactionActionSlug: "aiChat",
        costActionSlug: "generateSource",
        costFlow: "founder",
        accountFlow: "founder",
      }),
      false,
    );
    assert.equal(
      usageActivityActionCostMatches({
        transactionActionSlug: "aiChat",
        costActionSlug: "aiChat",
        costFlow: "investor",
        accountFlow: "founder",
      }),
      false,
    );
  });
});
