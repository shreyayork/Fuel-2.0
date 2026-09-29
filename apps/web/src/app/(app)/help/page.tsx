import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { listPublishedFaqEntries } from "@/lib/faq";
import { listRecentCompanies } from "@/lib/recent-companies-server";
import { HelpFaqView } from "@/components/views/HelpFaqView";

export const dynamic = "force-dynamic";

/**
 * Prefer last-viewed company (recents), else claimed primary.
 * Same sources Shell / RecordCompanyVisit already use.
 */
async function resolveFaqCompanyId(
  email: string,
  account: NonNullable<Awaited<ReturnType<typeof getActiveAccountForUser>>>,
): Promise<string | null> {
  const recents = await listRecentCompanies({
    userEmail: email,
    accountId: account.id,
    primaryCompanyUuid: account.primaryCompanyUuid,
  });
  return recents[0]?.uuid ?? account.primaryCompanyUuid ?? null;
}

export default async function HelpFaqPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");
  const [rows, companyId] = await Promise.all([
    listPublishedFaqEntries(),
    resolveFaqCompanyId(email, account),
  ]);
  return <HelpFaqView rows={rows} companyId={companyId} />;
}
