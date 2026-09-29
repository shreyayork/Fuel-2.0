import { SignalAdminView } from "@/components/views/SignalAdminView";
import { listGlobalSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

export default async function SuperAdminSignalsPage() {
  const rows = await listGlobalSignals();
  return <SignalAdminView rows={rows} />;
}
