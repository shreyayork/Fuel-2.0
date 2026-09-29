import { listAdvisorsAdmin } from "@/lib/advisors";
import { AdvisorAdminView } from "@/components/views/AdvisorAdminView";

export const dynamic = "force-dynamic";

export default async function SuperAdminAdvisorsPage() {
  const rows = await listAdvisorsAdmin();
  return <AdvisorAdminView rows={rows} />;
}
