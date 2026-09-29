import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { listServiceProviders } from "@/lib/service-providers";
import { ServiceProviderDirectory } from "@/components/views/ServiceProviderDirectory";

export const dynamic = "force-dynamic";

export default async function ServiceProvidersPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");
  const rows = await listServiceProviders({ accountId: account.id });
  return <ServiceProviderDirectory rows={rows} superAdmin={isSuperAdmin(session)} />;
}
