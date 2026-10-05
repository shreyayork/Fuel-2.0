import { SuperAdminOverviewView } from "@/components/views/SuperAdminOverviewView";
import { loadSuperAdminOverviewStats } from "@/lib/super-admin/overview";

export const dynamic = "force-dynamic";

export default async function SuperAdminIndexPage() {
  const stats = await loadSuperAdminOverviewStats();
  return <SuperAdminOverviewView stats={stats} />;
}
