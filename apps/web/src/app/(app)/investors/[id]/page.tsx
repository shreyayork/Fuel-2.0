import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getInvestor } from "@/lib/fuel-data";
import { isBookmarked } from "@/lib/investors";
import { InvestorProfileView } from "@/components/views/InvestorProfileView";

export const dynamic = "force-dynamic";

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");

  const [profile, bookmarked] = await Promise.all([
    getInvestor(id),
    isBookmarked({ accountId: account.id, investorId: id }),
  ]);
  if (!profile) notFound();

  return <InvestorProfileView profile={profile} bookmarked={bookmarked} />;
}
