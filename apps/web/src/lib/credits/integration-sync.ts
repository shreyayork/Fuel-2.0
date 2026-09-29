import "server-only";
import type { CreditActionType } from "./types";
import { catalogFlowForAccount, getActionCost, tryCreditAction } from "./queries";

export type IntegrationSyncAction = Extract<
  CreditActionType,
  "hubspotSync" | "granolaSync" | "slackSync"
>;

export type IntegrationSyncChargeResult =
  | { allowed: true }
  | { allowed: false; reason: "blocked" | "insufficient" };

/**
 * Charge the Super Admin–configured cost for one integration sync/reconcile run.
 * Missing / inactive catalog rows and cost 0 fall through as free (do not break sync).
 * Non-zero cost uses the normal credit gate — insufficient → caller should skip the run.
 */
export async function tryChargeIntegrationSync(
  accountId: string,
  action: IntegrationSyncAction,
  options?: { referenceId?: string },
): Promise<IntegrationSyncChargeResult> {
  let cost: number;
  try {
    const flow = await catalogFlowForAccount(accountId);
    cost = await getActionCost(action, flow);
  } catch {
    return { allowed: true };
  }
  if (cost === 0) return { allowed: true };

  const result = await tryCreditAction(accountId, action, {
    referenceId: options?.referenceId,
  });
  if (!result.allowed) {
    return { allowed: false, reason: result.reason };
  }
  return { allowed: true };
}
