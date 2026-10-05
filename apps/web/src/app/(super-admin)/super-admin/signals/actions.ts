"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import { CACHE_TAG_GLOBAL_SIGNALS } from "@/lib/cache/reference-data";
import {
  deleteGlobalSignal,
  upsertGlobalSignal,
  SIGNAL_KINDS,
  type SignalKind,
} from "@/lib/signals";

async function requireSuperAdmin(): Promise<void> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) redirect("/");
}

function normalizeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function upsertSignalAction(formData: FormData) {
  await requireSuperAdmin();
  const rawId = String(formData.get("id") ?? "").trim();
  const id = normalizeId(rawId);
  const label = String(formData.get("label") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim().toLowerCase();
  if (!id || !label || !category) return;
  if (!SIGNAL_KINDS.includes(kindRaw as SignalKind)) return;
  const kind = kindRaw as SignalKind;

  const unit = String(formData.get("unit") ?? "").trim() || null;
  const invertedGood = formData.get("invertedGood") === "on";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const extractionHint = (formData.get("extractionHint") as string | null)?.trim() || null;
  const displayOrderRaw = String(formData.get("displayOrder") ?? "").trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

  await upsertGlobalSignal({
    id,
    label,
    kind,
    category,
    unit: kind === "quantitative" ? unit : null,
    invertedGood,
    description,
    extractionHint,
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
  });
  revalidateTag(CACHE_TAG_GLOBAL_SIGNALS);
  revalidatePath("/super-admin/signals");
}

export async function deleteSignalAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteGlobalSignal(id);
  revalidateTag(CACHE_TAG_GLOBAL_SIGNALS);
  revalidatePath("/super-admin/signals");
}
