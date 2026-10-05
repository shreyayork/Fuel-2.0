"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import {
  buildLinkedInEnhancePatch,
  deleteInstanceAdvisor,
  getInstanceAdvisor,
  updateInstanceAdvisor,
  upsertInstanceAdvisor,
  type AdvisorPatch,
} from "@/lib/advisors";
import { fetchLinkedInProfile } from "@/lib/enrichment/linkedin-profile";
import type { Advisor } from "@/db/schema";

async function requireSuperAdmin(): Promise<string> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) redirect("/");
  return session?.email ?? superAdminDevEmail() ?? "mike@york.ie";
}

function parseTags(raw: FormDataEntryValue | null): string[] | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return Array.from(
    new Set(
      s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

function patchFromForm(formData: FormData): AdvisorPatch {
  const statusField = formData.get("status");
  const status =
    statusField == null
      ? undefined
      : String(statusField).trim() === "archived"
        ? "archived"
        : "active";
  return {
    title: (formData.get("title") as string | null)?.trim() || null,
    company: (formData.get("company") as string | null)?.trim() || null,
    email: (formData.get("email") as string | null)?.trim() || null,
    phone: (formData.get("phone") as string | null)?.trim() || null,
    linkedinUrl: (formData.get("linkedinUrl") as string | null)?.trim() || null,
    photoUrl: (formData.get("photoUrl") as string | null)?.trim() || null,
    bio: (formData.get("bio") as string | null)?.trim() || null,
    location: (formData.get("location") as string | null)?.trim() || null,
    expertise: parseTags(formData.get("expertise")),
    focusIndustries: parseTags(formData.get("focusIndustries")),
    publicCard: formData.get("publicCard") === "on",
    privateNotes: (formData.get("privateNotes") as string | null)?.trim() || null,
    ...(status ? { status } : {}),
  };
}

export async function setAdvisorStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const status = String(formData.get("status") ?? "").trim() === "archived" ? "archived" : "active";
  try {
    await updateInstanceAdvisor({ id, patch: { status } });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
  revalidatePath("/super-admin/advisors");
  revalidatePath("/advisors");
}

export async function upsertAdvisorAction(formData: FormData) {
  const email = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const id = (formData.get("id") as string | null)?.trim() || undefined;
  await upsertInstanceAdvisor({
    id,
    curatedByEmail: email,
    name,
    patch: patchFromForm(formData),
  });
  revalidatePath("/super-admin/advisors");
  revalidatePath("/advisors");
}

export async function deleteAdvisorAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteInstanceAdvisor(id);
  revalidatePath("/super-admin/advisors");
  revalidatePath("/advisors");
}

/** Enhance an instance-level advisor from LinkedIn. Same field-fill rules as account enhance. */
export async function enhanceInstanceAdvisorFromLinkedInAction(
  formData: FormData,
): Promise<Advisor | null> {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return null;
  let advisor = await getInstanceAdvisor(id);
  if (!advisor) return null;

  const urlFromForm = String(formData.get("linkedinUrl") ?? "").trim();
  const linkedinUrl = urlFromForm || advisor.linkedinUrl?.trim() || "";
  if (!linkedinUrl) return null;

  // Persist URL from the modal if Super Admin typed one without saving first.
  if (urlFromForm && urlFromForm !== advisor.linkedinUrl) {
    advisor =
      (await updateInstanceAdvisor({ id, patch: { linkedinUrl: urlFromForm } })) ?? advisor;
  }

  const result = await fetchLinkedInProfile(linkedinUrl);
  if (result.error || !result.data) return null;

  const updated = await updateInstanceAdvisor({
    id,
    patch: buildLinkedInEnhancePatch(advisor, result.data),
  });
  revalidatePath("/super-admin/advisors");
  revalidatePath("/advisors");
  if (updated) revalidatePath(`/advisors/${id}`);
  return updated;
}
