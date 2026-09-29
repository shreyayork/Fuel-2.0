import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { listAdvisors } from "@/lib/advisors";
import { AdvisorsView } from "@/components/views/AdvisorsView";

export const dynamic = "force-dynamic";

export default async function AdvisorsPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");

  const items = await listAdvisors({ accountId: account.id, status: "active" });

  return <AdvisorsView advisors={items} userEmail={email} />;
}
