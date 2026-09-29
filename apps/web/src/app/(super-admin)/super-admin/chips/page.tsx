import { listChipHeadlinesForAdmin } from "@/lib/york-partner/headlines";
import { getMarketingBannerDismissDays } from "@/lib/york-partner/banner-settings";
import { ChipsManagementView } from "@/components/views/ChipsManagementView";

export const dynamic = "force-dynamic";

export default async function SuperAdminChipsPage() {
  const [rows, dismissHideDays] = await Promise.all([
    listChipHeadlinesForAdmin(),
    getMarketingBannerDismissDays(),
  ]);
  return <ChipsManagementView rows={rows} dismissHideDays={dismissHideDays} />;
}
