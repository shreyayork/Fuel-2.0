import { listCouponCampaigns } from "@/lib/credits/coupon-campaigns";
import { CouponsAdminView } from "@/components/views/CouponsAdminView";

export const dynamic = "force-dynamic";

export default async function SuperAdminCouponsPage() {
  const rows = await listCouponCampaigns();
  return <CouponsAdminView rows={rows} />;
}
