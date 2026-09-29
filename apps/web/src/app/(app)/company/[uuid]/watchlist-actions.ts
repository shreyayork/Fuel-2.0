"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  addCompanyToWatchlist,
  removeCompanyFromWatchlist,
} from "@/lib/watchlists";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

export async function toggleWatchlistMembershipAction(formData: FormData) {
  const email = await requireEmail();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const companyUuid = String(formData.get("companyUuid") ?? "");
  const companyName = (formData.get("companyName") as string | null) ?? null;
  const intent = String(formData.get("intent") ?? "add");
  if (!watchlistId || !companyUuid) return;
  if (intent === "remove") {
    await removeCompanyFromWatchlist(watchlistId, companyUuid);
  } else {
    await addCompanyToWatchlist({
      watchlistId,
      companyUuid,
      name: companyName,
      addedByEmail: email,
    });
  }
  revalidatePath(`/company/${companyUuid}`);
  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath(`/portfolio/${watchlistId}`);
}
