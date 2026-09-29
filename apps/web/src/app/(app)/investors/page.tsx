import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { listBookmarksWithCompanyProfiles, listInvestorNetwork } from "@/lib/investors";
import { InvestorMarketplace } from "@/components/views/InvestorMarketplace";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");

  // Bookmarks: Postgres + batch OpenSearch company enrichment (same resolver
  // as Network). Network walk can take 1-2s against Neptune; pass it as an
  // unresolved Promise so the shell renders immediately and the network grid
  // streams in when ready.
  const bookmarks = await listBookmarksWithCompanyProfiles(account.id);
  const networkPromise = listInvestorNetwork({ userEmail: email, accountId: account.id });

  return <InvestorMarketplace bookmarks={bookmarks} networkPromise={networkPromise} />;
}
