import { redirect } from "next/navigation";
import { loadDataset } from "@/db/queries";
import { FuelApp } from "@/components/FuelApp";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { resolveAuthenticatedHomePath } from "@/lib/auth/home-path";

export const dynamic = "force-dynamic";

/**
 * Legacy authenticated landing and bookmark target. New sessions route
 * directly to the workspace home (`/overview` for PMs); this page forwards
 * there for old links.
 *
 * Legacy `?page=` and `?openCoId=` URLs continue to render the in-page
 * FuelApp client component so old bookmarks keep working.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; openCoId?: string }>;
}) {
  const { page, openCoId } = await searchParams;
  if (page || openCoId) {
    const data = await loadDataset();
    return <FuelApp data={data} />;
  }

  const email = (await getSession())?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);

  if (!account) {
    redirect("/onboard");
  }

  redirect(resolveAuthenticatedHomePath(account));
}
