import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getAdvisorPublic } from "@/lib/advisors";
import { AdvisorPlayerCard } from "@/components/views/AdvisorPlayerCard";

export const dynamic = "force-dynamic";

/**
 * Public-ish advisor player card. Honors advisor.publicCard: when false, 404.
 * When true, renders a limited public view; signed-in users in the owning
 * account see the full profile.
 */
export default async function AdvisorCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const advisor = await getAdvisorPublic(id);
  if (!advisor || !advisor.publicCard) notFound();

  const session = await getSession();
  let elevated = false;
  if (session?.email) {
    const account = await getActiveAccountForUser(session.email);
    elevated = !!account && account.id === advisor.accountId;
  }

  return <AdvisorPlayerCard advisor={advisor} elevated={elevated} />;
}
