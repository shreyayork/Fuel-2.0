import { listFaqEntriesAdmin } from "@/lib/faq";
import { FaqAdminView } from "@/components/views/FaqAdminView";

export const dynamic = "force-dynamic";

export default async function SuperAdminFaqPage() {
  const rows = await listFaqEntriesAdmin();
  return <FaqAdminView rows={rows} />;
}
