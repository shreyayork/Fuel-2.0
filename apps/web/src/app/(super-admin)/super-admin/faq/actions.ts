"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { deleteFaqEntry, setFaqSortOrder, upsertFaqEntry } from "@/lib/faq";
import { parseFaqPointsText } from "@/lib/faq-constants";

async function requireSuperAdmin(): Promise<string> {
  const session = await getSession();
  if (!isSuperAdmin(session)) redirect("/");
  return session?.email ?? "mike@york.ie";
}

function revalidateFaqPaths() {
  revalidatePath("/super-admin/faq");
  revalidatePath("/help");
}

export async function upsertFaqEntryAction(formData: FormData) {
  const email = await requireSuperAdmin();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) return;

  const id = (formData.get("id") as string | null)?.trim() || undefined;
  const pointsRaw = String(formData.get("points") ?? "");
  const footnote = (formData.get("footnote") as string | null)?.trim() || null;
  const published = formData.get("published") === "on" || formData.get("published") === "true";
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortOrderRaw ? Number.parseInt(sortOrderRaw, 10) : undefined;

  await upsertFaqEntry({
    id,
    curatedByEmail: email,
    values: {
      question,
      answer,
      points: parseFaqPointsText(pointsRaw),
      footnote,
      published,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
    },
  });
  revalidateFaqPaths();
}

export async function deleteFaqEntryAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteFaqEntry(id);
  revalidateFaqPaths();
}

/** Drag-and-drop: full ordered id list. Last-write-wins under concurrent edits. */
export async function setFaqSortOrderAction(orderedIds: string[]) {
  await requireSuperAdmin();
  const ids = orderedIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return;
  await setFaqSortOrder(ids);
  revalidateFaqPaths();
}
