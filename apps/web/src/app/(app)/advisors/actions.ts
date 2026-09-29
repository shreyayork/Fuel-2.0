"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ClaimedProfileRequiredError, getActiveAccountForUser } from "@/lib/accounts";
import {
  createAdvisor,
  updateAdvisor,
  deleteAdvisor,
  linkAdvisorToCompany,
  unlinkAdvisorFromCompany,
  getAdvisor,
  buildLinkedInEnhancePatch,
} from "@/lib/advisors";
import { fetchLinkedInProfile } from "@/lib/enrichment/linkedin-profile";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

async function requireAccount(email: string): Promise<string> {
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");
  return account.id;
}

function isClaimedProfileDenied(error: unknown): boolean {
  return error instanceof ClaimedProfileRequiredError;
}

function parseTags(raw: FormDataEntryValue | null): string[] | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createAdvisorAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const advisor = await createAdvisor({
    accountId,
    curatedByEmail: email,
    name,
    patch: {
      fuelDataPersonId: String(formData.get("fuelDataPersonId") ?? "").trim() || undefined,
      title: String(formData.get("title") ?? "").trim() || undefined,
      company: String(formData.get("company") ?? "").trim() || undefined,
      email: String(formData.get("email") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || undefined,
      photoUrl: String(formData.get("photoUrl") ?? "").trim() || undefined,
      bio: String(formData.get("bio") ?? "").trim() || undefined,
      location: String(formData.get("location") ?? "").trim() || undefined,
      expertise: parseTags(formData.get("expertise")),
      focusIndustries: parseTags(formData.get("focusIndustries")),
      publicCard: formData.get("publicCard") === "on",
    },
  });
  revalidatePath("/advisors");
  redirect(`/advisors/${advisor.id}`);
}

export async function updateAdvisorAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await updateAdvisor({
    accountId,
    id,
    patch: {
      name: String(formData.get("name") ?? "").trim() || undefined,
      title: (formData.get("title") as string | null)?.trim() ?? null,
      company: (formData.get("company") as string | null)?.trim() ?? null,
      email: (formData.get("email") as string | null)?.trim() ?? null,
      phone: (formData.get("phone") as string | null)?.trim() ?? null,
      linkedinUrl: (formData.get("linkedinUrl") as string | null)?.trim() ?? null,
      photoUrl: (formData.get("photoUrl") as string | null)?.trim() ?? null,
      bio: (formData.get("bio") as string | null)?.trim() ?? null,
      location: (formData.get("location") as string | null)?.trim() ?? null,
      expertise: parseTags(formData.get("expertise")) ?? null,
      focusIndustries: parseTags(formData.get("focusIndustries")) ?? null,
      publicCard: formData.get("publicCard") === "on",
      privateNotes: (formData.get("privateNotes") as string | null)?.trim() ?? null,
    },
  });
  revalidatePath(`/advisors/${id}`);
  revalidatePath("/advisors");
}

export async function deleteAdvisorAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteAdvisor({ accountId, id });
  revalidatePath("/advisors");
  redirect("/advisors");
}

export async function enhanceAdvisorFromLinkedInAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const advisor = await getAdvisor({ accountId, id });
  // Instance-level advisors are Super Admin–only for enhance/mutate.
  if (!advisor?.linkedinUrl || advisor.accountId == null) return;
  if (advisor.accountId !== accountId) return;

  const result = await fetchLinkedInProfile(advisor.linkedinUrl);
  if (result.error || !result.data) return;

  await updateAdvisor({
    accountId,
    id,
    patch: buildLinkedInEnhancePatch(advisor, result.data),
  });
  revalidatePath(`/advisors/${id}`);
  revalidatePath("/advisors");
}

export async function linkAdvisorToCompanyAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("advisorId") ?? "");
  const companyUuid = String(formData.get("companyUuid") ?? "");
  const role = (formData.get("role") as string | null)?.trim() || null;
  if (!id || !companyUuid) return;
  try {
    await linkAdvisorToCompany({
      accountId,
      advisorId: id,
      companyUuid,
      role,
      addedByEmail: email,
    });
  } catch (error) {
    if (isClaimedProfileDenied(error)) return;
    throw error;
  }
  revalidatePath(`/advisors/${id}`);
  revalidatePath(`/company/${companyUuid}`);
}

export async function unlinkAdvisorFromCompanyAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const id = String(formData.get("advisorId") ?? "");
  const companyUuid = String(formData.get("companyUuid") ?? "");
  if (!id || !companyUuid) return;
  try {
    await unlinkAdvisorFromCompany({ accountId, advisorId: id, companyUuid });
  } catch (error) {
    if (isClaimedProfileDenied(error)) return;
    throw error;
  }
  revalidatePath(`/advisors/${id}`);
  revalidatePath(`/company/${companyUuid}`);
}
