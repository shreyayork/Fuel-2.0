import { listGlobalPlaybooksAdmin } from "@/lib/playbooks";
import { PlaybookAdminView } from "@/components/views/PlaybookAdminView";

export const dynamic = "force-dynamic";

export default async function SuperAdminPlaybooksPage() {
  const rows = await listGlobalPlaybooksAdmin({ includeDeleted: true });
  return <PlaybookAdminView rows={rows} />;
}
