"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { addContextItem, deleteContextItem } from "@/lib/context";
import { createManualObservation, supersedeObservation } from "@/lib/observations";

async function requireCtx(): Promise<{ email: string; accountId: string }> {
  let email = "mike@york.ie";
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session?.email) redirect("/sign-in");
    email = session.email;
  }
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("No account");
  return { email, accountId: account.id };
}

export async function addNoteAction(formData: FormData) {
  const { email, accountId } = await requireCtx();
  const uuid = String(formData.get("uuid") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const title = (formData.get("title") as string | null)?.trim() || undefined;
  if (!uuid || !content) return;
  await addContextItem({
    accountId,
    companyUuid: uuid,
    kind: "note",
    title,
    content,
    authorEmail: email,
    source: "user:manual",
  });
  revalidatePath(`/company/${uuid}`);
}

export async function deleteNoteAction(formData: FormData) {
  const { accountId } = await requireCtx();
  const id = String(formData.get("id") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!id) return;
  await deleteContextItem({ accountId, id });
  if (uuid) revalidatePath(`/company/${uuid}`);
}

/**
 * Soft-delete ("supersede") a single extracted signal observation — the
 * row the operator clicked × on. Used to kill bad extractions that the
 * model confidently misread (e.g. an advisory invoice being read as a
 * monthly burn). Not a hard delete — the row stays for audit.
 */
export async function deleteObservationAction(formData: FormData) {
  const { accountId } = await requireCtx();
  const id = String(formData.get("id") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!id) return;
  await supersedeObservation({ accountId, id });
  if (uuid) revalidatePath(`/company/${uuid}`);
}

/**
 * Record a manual signal observation — either a fresh value ("monthly burn
 * $22K as of Apr 24") or a correction of a bad model extraction. When
 * `supersedeFor` points at an existing observation id, that row is
 * soft-deleted as part of the same transaction so the timeline doesn't
 * show both the corrected number and the original.
 */
export async function addManualObservationAction(formData: FormData): Promise<string | null> {
  const { email, accountId } = await requireCtx();
  const uuid = String(formData.get("uuid") ?? "").trim();
  const signalId = String(formData.get("signalId") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  if (!uuid || !signalId || !period) return null;
  const rawNumeric = String(formData.get("valueNumeric") ?? "").trim();
  const rawText = String(formData.get("valueText") ?? "").trim();
  const rawBool = String(formData.get("valueBool") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const supersedeFor = String(formData.get("supersedeFor") ?? "").trim() || null;
  const valueNumeric = rawNumeric ? Number(rawNumeric) : null;
  const valueText = rawText || null;
  const valueBool = rawBool === "true" ? true : rawBool === "false" ? false : null;
  if (valueNumeric == null && valueText == null && valueBool == null) return null;
  const row = await createManualObservation({
    accountId,
    companyUuid: uuid,
    signalId,
    period,
    valueNumeric: Number.isFinite(valueNumeric as number) ? (valueNumeric as number) : null,
    valueText,
    valueBool,
    rawSnippet: note,
    authorEmail: email,
    supersedeFor,
  });
  revalidatePath(`/company/${uuid}`);
  return row.id;
}
