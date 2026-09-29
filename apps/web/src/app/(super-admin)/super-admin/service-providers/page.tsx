import { listServiceProvidersAdmin } from "@/lib/service-providers";
import { ServiceProviderAdminView } from "@/components/views/ServiceProviderAdminView";

export const dynamic = "force-dynamic";

export default async function SuperAdminServiceProvidersPage() {
  const rows = await listServiceProvidersAdmin();
  return <ServiceProviderAdminView rows={rows} />;
}
