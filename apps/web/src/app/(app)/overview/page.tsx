import { notFound } from "next/navigation";
import { OverviewView } from "@/components/views/OverviewView";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getSession } from "@/lib/auth/session";
import { loadOverviewPageData } from "@/lib/overview-page-data";

export const dynamic = "force-dynamic";

/**
 * Portfolio Manager home — KPI strip + company cards across all portfolios.
 */
export default async function OverviewPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account?.portfolioManagerEnabled) notFound();

  const data = await loadOverviewPageData({
    userEmail: email,
    accountId: account.id,
    accountName: account.name,
  });

  return <OverviewView data={data} />;
}
