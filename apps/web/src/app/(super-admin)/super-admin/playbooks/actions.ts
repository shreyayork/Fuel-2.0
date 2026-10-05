"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import {
  isAdminPlaybookCategory,
  isPlaybookMode,
  isPlaybookTargetKind,
  PLAYBOOK_SLUG_REGEX,
} from "@/lib/playbooks-constants";
import { parseGuidedSteps } from "@/lib/playbooks/guided";
import {
  restoreGlobalPlaybook,
  softDeleteGlobalPlaybook,
  upsertGlobalPlaybook,
} from "@/lib/playbooks";

export type PlaybookActionResult =
  | { ok: true }
  | { ok: false; error: string };

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

function revalidatePlaybookPaths(slug?: string) {
  revalidatePath("/super-admin/playbooks");
  revalidatePath("/playbooks");
  if (slug) revalidatePath(`/playbooks/${slug}`);
}

export async function upsertPlaybookAction(
  formData: FormData,
): Promise<PlaybookActionResult> {
  const email = await requireSuperAdmin();

  const id = (formData.get("id") as string | null)?.trim() || undefined;
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const modeRaw = String(formData.get("mode") ?? "chat").trim();
  const subcategory = (formData.get("subcategory") as string | null)?.trim() || null;
  const targetKindRaw = String(formData.get("targetKind") ?? "").trim();
  const stepsRaw = String(formData.get("steps") ?? "").trim();

  if (!title || !description || !content) {
    return { ok: false, error: "Title, description, and content are required." };
  }
  if (!isAdminPlaybookCategory(categoryRaw)) {
    return { ok: false, error: "Pick a valid category." };
  }
  if (!isPlaybookMode(modeRaw)) {
    return { ok: false, error: "Pick a valid mode." };
  }

  const slug = id ? slugRaw : slugRaw.toLowerCase();
  if (!id && !PLAYBOOK_SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      error: "Slug must be kebab-case (lowercase letters, numbers, hyphens).",
    };
  }

  const targetKind =
    targetKindRaw && isPlaybookTargetKind(targetKindRaw) ? targetKindRaw : null;

  let steps = null;
  if (modeRaw === "guided") {
    if (!stepsRaw) {
      return { ok: false, error: "Guided playbooks need a steps JSON array." };
    }
    try {
      const parsed: unknown = JSON.parse(stepsRaw);
      steps = parseGuidedSteps(parsed);
      if (!steps?.length) {
        return { ok: false, error: "Steps JSON must be a non-empty array." };
      }
    } catch {
      return { ok: false, error: "Steps JSON is invalid." };
    }
  }

  try {
    const row = await upsertGlobalPlaybook({
      id,
      slug,
      category: categoryRaw,
      subcategory,
      title,
      description,
      content,
      authorEmail: email,
      targetKind,
      tags: parseTags(formData.get("tags")),
      mode: modeRaw,
      steps,
    });
    if (!row) {
      return {
        ok: false,
        error: id
          ? "Playbook not found or could not be updated."
          : "Could not create playbook. Slug may already be in use.",
      };
    }
    revalidatePlaybookPaths(row.slug);
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

export async function deletePlaybookAction(
  formData: FormData,
): Promise<PlaybookActionResult> {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!id) return { ok: false, error: "Missing playbook id." };

  try {
    const ok = await softDeleteGlobalPlaybook(id);
    if (!ok) return { ok: false, error: "Playbook not found or already deleted." };
    revalidatePlaybookPaths(slug || undefined);
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

export async function restorePlaybookAction(
  formData: FormData,
): Promise<PlaybookActionResult> {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!id) return { ok: false, error: "Missing playbook id." };

  try {
    const ok = await restoreGlobalPlaybook(id);
    if (!ok) return { ok: false, error: "Playbook not found." };
    revalidatePlaybookPaths(slug || undefined);
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
