import { notFound } from "next/navigation";
import {
  getCampaignStats,
  getCouponCampaign,
  listCampaignRecipients,
} from "@/lib/credits/coupon-campaigns";
import { CouponCampaignDetailView } from "@/components/views/CouponCampaignDetailView";

export const dynamic = "force-dynamic";

export default async function SuperAdminCouponCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getCouponCampaign(campaignId);
  if (!campaign) notFound();
  const [recipients, stats] = await Promise.all([
    listCampaignRecipients(campaignId),
    getCampaignStats(campaignId),
  ]);
  return (
    <CouponCampaignDetailView
      campaign={campaign}
      recipients={recipients}
      stats={stats}
    />
  );
}
