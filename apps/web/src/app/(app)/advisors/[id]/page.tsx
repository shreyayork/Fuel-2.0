import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getAdvisor, listAdvisorCompanies } from "@/lib/advisors";
import { AdvisorDetailView } from "@/components/views/AdvisorDetailView";

export const dynamic = "force-dynamic";

export default async function AdvisorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");

  const advisor = await getAdvisor({ accountId: account.id, id });
  if (!advisor) notFound();

  const linkedCompanies = await listAdvisorCompanies({ accountId: account.id, advisorId: id });

  return <AdvisorDetailView advisor={advisor} linkedCompanies={linkedCompanies} userEmail={email} />;
}
