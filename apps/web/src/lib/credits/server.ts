import "server-only";
import type { CreditActionType } from "./types";
import { tryCreditAction } from "./queries";

export class CreditGateError extends Error {
  readonly reason: "blocked" | "insufficient";
  readonly snapshot: Awaited<ReturnType<typeof tryCreditAction>> extends { snapshot: infer S }
    ? S
    : never;

  constructor(
    reason: "blocked" | "insufficient",
    snapshot: CreditGateError["snapshot"],
  ) {
    super(`credit_gate_${reason}`);
    this.name = "CreditGateError";
    this.reason = reason;
    this.snapshot = snapshot;
  }
}

/** Server-side atomic credit gate — throws CreditGateError when blocked. */
export async function requireCreditAction(
  accountId: string,
  action: CreditActionType,
  options?: { referenceId?: string; userEmail?: string | null },
) {
  const result = await tryCreditAction(accountId, action, options);
  if (!result.allowed) {
    throw new CreditGateError(result.reason, result.snapshot);
  }
  return result.snapshot;
}

export {
  tryCreditAction,
  refundCreditAction,
  getCreditSnapshot,
  getActionCosts,
  getActionCost,
} from "./queries";
