"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import { CACHE_TAG_BENCHMARK_COHORTS } from "@/lib/cache/reference-data";
import {
  deleteCohortRow,
  upsertCohortRow,
  type CohortUpsert,
} from "@/lib/benchmarks";

async function requireSuperAdmin(): Promise<void> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) redirect("/");
}

function parseNumOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(raw: string): number | null {
  const n = parseNumOrNull(raw);
  return n == null ? null : Math.round(n);
}

/**
 * Upsert a single benchmark row. We key rows on `${cohortKey}:${metric}:
 * ${period}` so updating an existing row keeps the same id. The dimensions
 * object is built from the four optional form fields; empty values become
 * null so the JSON is clean.
 */
export async function upsertCohortAction(formData: FormData) {
  await requireSuperAdmin();
  const metric = String(formData.get("metric") ?? "").trim();
  const cohortKey = String(formData.get("cohortKey") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || "manual";
  if (!metric || !cohortKey || !period) return;
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const invertedGood = formData.get("invertedGood") === "on";
  const businessModel = String(formData.get("businessModel") ?? "").trim() || null;
  const stage = String(formData.get("stage") ?? "").trim() || null;
  const vertical = String(formData.get("vertical") ?? "").trim() || null;
  const geo = String(formData.get("geo") ?? "").trim() || null;

  const payload: CohortUpsert = {
    id,
    metric,
    cohortKey,
    period,
    source,
    unit,
    invertedGood,
    dimensions: { businessModel, stage, vertical, geo },
    p25: parseNumOrNull(String(formData.get("p25") ?? "")),
    p50: parseNumOrNull(String(formData.get("p50") ?? "")),
    p75: parseNumOrNull(String(formData.get("p75") ?? "")),
    p90: parseNumOrNull(String(formData.get("p90") ?? "")),
    sampleSize: parseIntOrNull(String(formData.get("sampleSize") ?? "")),
  };
  await upsertCohortRow(payload);
  revalidateTag(CACHE_TAG_BENCHMARK_COHORTS);
  revalidatePath("/super-admin/cohorts");
}

export async function deleteCohortAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteCohortRow(id);
  revalidateTag(CACHE_TAG_BENCHMARK_COHORTS);
  revalidatePath("/super-admin/cohorts");
}
