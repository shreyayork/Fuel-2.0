import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ACTION_COST_LIST_TEST_ID,
  POPOVER_STATES_WITH_ACTION_COSTS,
  formatActionCostsTooltip,
  popoverShowsActionCosts,
} from "@/lib/credits/action-cost-display";
import { getPopoverState } from "@/lib/credits/logic";
import { EMPTY_SNAPSHOT_EARN } from "@/lib/credits/profile-modules";
import type {
  ActionCostRow,
  CreditSnapshot,
  PopoverState,
} from "@/lib/credits/types";
import { THEMES } from "@/lib/theme";
import { CreditPopoverContent } from "@/components/credits/CreditPopover";

function snap(partial: Partial<CreditSnapshot>): CreditSnapshot {
  return {
    plan: "free",
    billingCycle: null,
    cancelAtPeriodEnd: false,
    periodEndsAt: null,
    monthlyUsed: 0,
    monthlyLimit: 100,
    dailyUsed: 0,
    dailyLimit: 30,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "Oct 1",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 2, docs: 1, messages: 4 },
    catalogFlow: "founder",
    ...EMPTY_SNAPSHOT_EARN,
    ...partial,
  };
}

const SAMPLE_COSTS: ActionCostRow[] = [
  { action: "docUpload", label: "Doc upload", cost: 20 },
  { action: "aiChat", label: "AI message", cost: 2 },
  { action: "generateSource", label: "Generate source", cost: 8 },
];

const ALL_POPOVER_STATES: PopoverState[] = [
  "dailyBlocked",
  "monthlyEmpty",
  "runningLow",
  "justUnblocked",
  "healthy",
];

describe("getPopoverState", () => {
  it("prefers justUnblocked over other flags", () => {
    assert.equal(
      getPopoverState(
        snap({
          justUnblocked: true,
          dailyUsed: 30,
          monthlyUsed: 100,
        }),
      ),
      "justUnblocked",
    );
  });

  it("returns dailyBlocked when today is empty but monthly remains", () => {
    assert.equal(
      getPopoverState(snap({ dailyUsed: 30, monthlyUsed: 40, monthlyLimit: 100 })),
      "dailyBlocked",
    );
  });

  it("returns monthlyEmpty when total remaining is 0", () => {
    assert.equal(
      getPopoverState(snap({ monthlyUsed: 100, dailyUsed: 30, topUpBalance: 0 })),
      "monthlyEmpty",
    );
  });

  it("returns runningLow at or below 30% remaining", () => {
    assert.equal(
      getPopoverState(snap({ monthlyUsed: 75, monthlyLimit: 100 })),
      "runningLow",
    );
  });

  it("returns healthy above 30% remaining", () => {
    assert.equal(
      getPopoverState(snap({ monthlyUsed: 20, monthlyLimit: 100 })),
      "healthy",
    );
  });
});

describe("popoverShowsActionCosts", () => {
  it("includes every PopoverState unless explicitly omitted", () => {
    assert.deepEqual(
      [...POPOVER_STATES_WITH_ACTION_COSTS].sort(),
      [...ALL_POPOVER_STATES].sort(),
    );
    for (const state of ALL_POPOVER_STATES) {
      assert.equal(
        popoverShowsActionCosts(state),
        true,
        `${state} must show ActionCostList (update POPOVER_STATES_WITH_ACTION_COSTS only with an explicit product decision)`,
      );
    }
  });
});

describe("formatActionCostsTooltip", () => {
  it("joins unit costs for compact hover surfaces", () => {
    assert.equal(
      formatActionCostsTooltip(SAMPLE_COSTS),
      "Doc upload: 20 cr · AI message: 2 cr · Generate source: 8 cr",
    );
  });
});

describe("CreditPopoverContent ActionCostList", () => {
  const t = THEMES.signal;
  const noop = () => undefined;

  for (const state of ALL_POPOVER_STATES) {
    it(`renders ActionCostList for ${state}`, () => {
      const snapshot =
        state === "justUnblocked"
          ? snap({ justUnblocked: true, monthlyUsed: 20 })
          : state === "dailyBlocked"
            ? snap({ dailyUsed: 30, monthlyUsed: 40 })
            : state === "monthlyEmpty"
              ? snap({ monthlyUsed: 100, dailyUsed: 30 })
              : state === "runningLow"
                ? snap({ monthlyUsed: 80 })
                : snap({ monthlyUsed: 10 });

      const html = renderToStaticMarkup(
        createElement(CreditPopoverContent, {
          t,
          snapshot,
          actionCosts: SAMPLE_COSTS,
          proPlan: {
            monthlyPrice: 30,
            annualPrice: 300,
            monthlyLimit: 2000,
            dailyLimit: 200,
          },
          popoverState: state,
          blockCountdownMs: state === "dailyBlocked" ? 3_600_000 : 0,
          openUpgrade: noop,
          setPopoverOpen: noop,
        }),
      );

      assert.match(
        html,
        new RegExp(`data-testid="${ACTION_COST_LIST_TEST_ID}"`),
        `${state} missing ActionCostList`,
      );
      assert.match(html, /Doc upload/);
      assert.match(html, /20 cr/);
      assert.match(html, /AI message/);
      assert.match(html, /2 cr/);
    });
  }
});
