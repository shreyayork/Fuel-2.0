import { isRedeemByExpired } from "./coupon-validate-shared";

export type CampaignModifiableFields = {
  status: string;
  redeemBy?: Date | null;
};

/** Expired redeem-by window — treat like archived for modification gates. */
export function isCampaignExpired(
  campaign: Pick<CampaignModifiableFields, "redeemBy">,
  now: Date = new Date(),
): boolean {
  return isRedeemByExpired(campaign.redeemBy, now);
}

/**
 * True when generate / email / activate must be blocked.
 * Archived OR past redeem-by (BUG-04/05/06 shared gate).
 */
export function campaignBlocksModifications(
  campaign: CampaignModifiableFields,
  now: Date = new Date(),
): boolean {
  return campaign.status === "archived" || isCampaignExpired(campaign, now);
}

export function campaignModificationBlockReason(
  campaign: CampaignModifiableFields,
  now: Date = new Date(),
): "archived" | "expired" | null {
  if (campaign.status === "archived") return "archived";
  if (isCampaignExpired(campaign, now)) return "expired";
  return null;
}
