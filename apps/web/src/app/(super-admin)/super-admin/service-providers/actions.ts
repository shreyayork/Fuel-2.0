"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import {
  deleteServiceProvider,
  upsertServiceProvider,
  type ServiceProviderCategory,
  type ServiceProviderVisibility,
  SERVICE_PROVIDER_CATEGORIES,
  SERVICE_PROVIDER_VISIBILITIES,
} from "@/lib/service-providers";

async function requireSuperAdmin(): Promise<string> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) redirect("/");
  return session?.email ?? "mike@york.ie";
}

function parseTags(raw: FormDataEntryValue | null): string[] | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  return Array.from(
    new Set(
      s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

export async function upsertServiceProviderAction(formData: FormData) {
  const email = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  if (!name || !SERVICE_PROVIDER_CATEGORIES.includes(categoryRaw as ServiceProviderCategory)) return;
  const category = categoryRaw as ServiceProviderCategory;
  const visibilityRaw = String(formData.get("visibility") ?? "global").trim();
  const visibility = (SERVICE_PROVIDER_VISIBILITIES.includes(
    visibilityRaw as ServiceProviderVisibility,
  )
    ? (visibilityRaw as ServiceProviderVisibility)
    : "global");

  const id = (formData.get("id") as string | null)?.trim() || undefined;
  await upsertServiceProvider({
    id,
    curatedByEmail: email,
    values: {
      name,
      category,
      visibility,
      description: (formData.get("description") as string | null)?.trim() || null,
      domain: (formData.get("domain") as string | null)?.trim() || null,
      website: (formData.get("website") as string | null)?.trim() || null,
      logoUrl: (formData.get("logoUrl") as string | null)?.trim() || null,
      linkedinUrl: (formData.get("linkedinUrl") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
      tags: parseTags(formData.get("tags")) ?? null,
    },
  });
  revalidatePath("/super-admin/service-providers");
  revalidatePath("/service-providers");
}

export async function deleteServiceProviderAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteServiceProvider(id);
  revalidatePath("/super-admin/service-providers");
  revalidatePath("/service-providers");
}
