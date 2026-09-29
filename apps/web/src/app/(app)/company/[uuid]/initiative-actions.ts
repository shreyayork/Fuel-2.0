"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { ClaimedProfileRequiredError, getActiveAccountForUser, getMembership } from "@/lib/accounts";
import {
  INITIATIVE_AREAS,
  INITIATIVE_MILESTONE_STATUSES,
  INITIATIVE_STATUSES,
  acceptSuggestedInitiative,
  createCompanyInitiative,
  createMilestone,
  deleteCompanyInitiative,
  dismissSuggestedInitiative,
  deleteMilestone,
  findInitiativeByArtifactSuggestion,
  linkAdvisorToInitiative,
  seedBaselinesFromObservations,
  unlinkAdvisorFromInitiative,
  unlinkInitiativeSignal,
  updateCompanyInitiative,
  updateMilestone,
  updateMilestoneNote,
  updateMilestoneStatus,
  upsertInitiativeSignal,
  type InitiativeArea,
  type InitiativeIntelligenceLink,
  type InitiativeSignalRole,
  type InitiativeStatus,
  type MilestoneStatus,
} from "@/lib/company-initiatives";
import { CATEGORY_META, isOverviewCategoryId } from "@/lib/overview/constants";
import { normalizeMilestoneDueDate } from "@/lib/initiative-milestone-dates";
import { regenerateYorkHelpForInitiative } from "@/lib/york-help/regenerate";
import {
  isYorkHelpTemporaryDismissMode,
  yorkHelpTemporaryDismissUntil,
} from "@/lib/york-help/dismiss";
import { getMarketingBannerDismissDays } from "@/lib/york-partner/banner-settings";
import { isValidEmail } from "@/lib/is-valid-email";
import {
  canPersistProgressIntelligenceLinks,
  parseProgressIntelligenceLinks,
} from "@/lib/initiatives/progress-intelligence-links";

function scheduleYorkHelpRegeneration(opts: {
  accountId: string;
  initiativeId: string;
  companyUuid: string;
}) {
  after(async () => {
    try {
      await regenerateYorkHelpForInitiative({
        accountId: opts.accountId,
        initiativeId: opts.initiativeId,
      });
      revalidatePath(`/company/${opts.companyUuid}`);
    } catch (error) {
      Sentry.captureException(error);
    }
  });
}

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

function coerceArea(raw: string | null | undefined): InitiativeArea {
  return (INITIATIVE_AREAS as readonly string[]).includes(raw ?? "")
    ? (raw as InitiativeArea)
    : "other";
}
function coerceStatus(raw: string | null | undefined): InitiativeStatus {
  return (INITIATIVE_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as InitiativeStatus)
    : "active";
}
function coerceKind(raw: string | null | undefined): "continuous" | "onetime" {
  return raw === "onetime" ? "onetime" : "continuous";
}

function parseAssigneesField(raw: FormDataEntryValue | null): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => Boolean(entry) && isValidEmail(entry));
  } catch {
    return [];
  }
}

async function resolveOwnerEmail(opts: {
  accountId: string;
  assignees: string[];
  ownerRaw: string;
  fallbackEmail: string;
}): Promise<string | null> {
  const candidates = [
    ...(isValidEmail(opts.ownerRaw) ? [opts.ownerRaw.toLowerCase()] : []),
    ...opts.assignees.filter(isValidEmail).map((e) => e.toLowerCase()),
    opts.fallbackEmail.toLowerCase(),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    const membership = await getMembership({
      accountId: opts.accountId,
      userEmail: normalized,
    });
    if (membership) return normalized;
  }
  return null;
}

export async function createInitiativeAction(formData: FormData): Promise<{ id: string } | void> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!companyUuid || !name) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const due = String(formData.get("due") ?? "").trim() || null;
  const assignees = parseAssigneesField(formData.get("assignees"));
  const ownerRaw = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerEmail = await resolveOwnerEmail({
    accountId: account.id,
    assignees,
    ownerRaw,
    fallbackEmail: email,
  });
  if (!ownerEmail) return;
  const storedAssignees = assignees.length > 0 ? assignees : [ownerEmail];
  // Advisor picker submits multiple `advisorId` values — read them all.
  const advisorIds = formData
    .getAll("advisorId")
    .map((v) => String(v))
    .filter(Boolean);
  // When this initiative was created from a suggestion, the suggesting UI
  // can pass in the observation ids that motivated it. We seed those as
  // baseline signals so the progress dashboard has a starting line from
  // day one instead of waiting for the operator to pick them manually.
  const seedObservationIds = formData
    .getAll("seedObservationId")
    .map((v) => String(v))
    .filter(Boolean);
  const sourceArtifactId = String(formData.get("sourceArtifactId") ?? "").trim() || null;
  const sourceSuggestionKey =
    String(formData.get("sourceSuggestionKey") ?? "").trim() || null;

  // Research suggestion already converted → idempotent return (no duplicate).
  if (sourceArtifactId && sourceSuggestionKey) {
    const existing = await findInitiativeByArtifactSuggestion({
      accountId: account.id,
      companyUuid,
      sourceArtifactId,
      sourceSuggestionKey,
    });
    if (existing) return { id: existing.id };
  }

  const pillarRaw = String(formData.get("pillar") ?? "").trim();
  const pillar = isOverviewCategoryId(pillarRaw) ? pillarRaw : null;
  const area = pillar
    ? coerceArea(CATEGORY_META[pillar].initiativeArea)
    : coerceArea(String(formData.get("area") ?? ""));

  const statusRaw = String(formData.get("status") ?? "").trim().toLowerCase();
  const status = statusRaw ? coerceStatus(statusRaw) : undefined;

  let milestones: { title: string; dueDate?: string | null; checked?: boolean }[] | undefined;
  const milestonesRaw = String(formData.get("milestones") ?? "").trim();
  if (milestonesRaw) {
    try {
      const parsed = JSON.parse(milestonesRaw) as unknown;
      if (Array.isArray(parsed)) {
        milestones = parsed
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const title = String((row as { title?: unknown }).title ?? "").trim();
            if (!title) return null;
            const dueDate = String(
              (row as { dueDate?: unknown; due?: unknown }).dueDate ??
                (row as { due?: unknown }).due ??
                "",
            ).trim();
            return {
              title,
              dueDate: dueDate || null,
              checked: Boolean((row as { checked?: unknown; done?: unknown }).checked ??
                (row as { done?: unknown }).done),
            };
          })
          .filter((row): row is NonNullable<typeof row> => row != null);
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  const benefit = String(formData.get("benefit") ?? "").trim() || null;

  let sourceDocuments:
    | Array<{ id: string; documentVersionId: string | null; title: string; typeLabel?: string | null }>
    | undefined;
  const sourceDocumentsRaw = String(formData.get("sourceDocuments") ?? "").trim();
  if (sourceDocumentsRaw) {
    try {
      const parsed = JSON.parse(sourceDocumentsRaw) as unknown;
      if (Array.isArray(parsed)) {
        sourceDocuments = parsed
          .map((row, index) => {
            if (!row || typeof row !== "object") return null;
            const title = String((row as { title?: unknown }).title ?? "").trim();
            if (!title) return null;
            const typeLabel = String(
              (row as { typeLabel?: unknown; type_label?: unknown }).typeLabel ??
                (row as { type_label?: unknown }).type_label ??
                "",
            ).trim();
            return {
              id: `src_${index}_${title.slice(0, 24)}`,
              documentVersionId: null,
              title,
              typeLabel: typeLabel || null,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row != null);
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  const created = await createCompanyInitiative({
    accountId: account.id,
    companyUuid,
    kind: coerceKind(String(formData.get("kind") ?? "")),
    name,
    area,
    description,
    status,
    ownerEmail,
    assignees: storedAssignees,
    due,
    sourceArtifactId,
    sourceSuggestionKey,
    source: "manual",
    overviewCategoryId: pillar,
    createdByEmail: email,
    advisorIds,
    milestones,
    benefit,
    sourceDocuments,
  });

  if (seedObservationIds.length > 0) {
    await seedBaselinesFromObservations({
      accountId: account.id,
      initiativeId: created.id,
      observationIds: seedObservationIds,
      createdByEmail: email,
    });
  }

  // Manual create: fill How York IE can help in the background (Scenario 2).
  // Overview drafts already carry nested york_help from Scenario 1.
  if (created.source === "manual" || !created.yorkHelp) {
    scheduleYorkHelpRegeneration({
      accountId: account.id,
      initiativeId: created.id,
      companyUuid,
    });
  }

  return { id: created.id };
}

export async function updateInitiativeAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const id = String(formData.get("id") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!id || !companyUuid) return;

  const pillarRaw = String(formData.get("pillar") ?? "").trim();
  const pillar = isOverviewCategoryId(pillarRaw) ? pillarRaw : null;
  const areaRaw = String(formData.get("area") ?? "").trim();
  const area = pillar
    ? coerceArea(CATEGORY_META[pillar].initiativeArea)
    : areaRaw
      ? coerceArea(areaRaw)
      : undefined;

  const statusRaw = String(formData.get("status") ?? "").trim();
  const status = statusRaw
    ? coerceStatus(statusRaw === "Suggested" ? "draft" : statusRaw.toLowerCase())
    : undefined;

  const ownerRaw = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const assignees = formData.has("assignees")
    ? parseAssigneesField(formData.get("assignees"))
    : undefined;
  let ownerEmail: string | undefined;
  if (ownerRaw || (assignees && assignees.length > 0)) {
    const resolved = await resolveOwnerEmail({
      accountId: account.id,
      assignees: assignees ?? [],
      ownerRaw,
      fallbackEmail: email,
    });
    if (!resolved) return;
    ownerEmail = resolved;
  }

  await updateCompanyInitiative({
    accountId: account.id,
    id,
    patch: {
      name: String(formData.get("name") ?? "").trim() || undefined,
      ...(area ? { area } : {}),
      ...(pillar
        ? { overviewCategoryId: pillar }
        : {}),
      description: formData.has("description")
        ? ((String(formData.get("description") ?? "").trim() || null) as string | null)
        : undefined,
      status,
      ownerEmail,
      ...(assignees
        ? { assignees: assignees.length > 0 ? assignees : ownerEmail ? [ownerEmail] : [] }
        : {}),
      due: formData.has("due")
        ? ((String(formData.get("due") ?? "").trim() || null) as string | null)
        : undefined,
      kind: formData.has("kind") ? coerceKind(String(formData.get("kind") ?? "")) : undefined,
    },
  });

  const contentChanged =
    formData.has("name") ||
    formData.has("description") ||
    formData.has("kind") ||
    formData.has("pillar") ||
    formData.has("assignees") ||
    formData.has("due") ||
    formData.has("status") ||
    Boolean(area);
  if (contentChanged) {
    scheduleYorkHelpRegeneration({
      accountId: account.id,
      initiativeId: id,
      companyUuid,
    });
  }

  revalidatePath(`/company/${companyUuid}`);
}

export async function acceptSuggestedInitiativeAction(formData: FormData): Promise<{ id: string } | void> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const id = String(formData.get("id") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!id || !companyUuid) return;

  const row = await acceptSuggestedInitiative({
    accountId: account.id,
    id,
    createdByEmail: email,
  });
  if (!row) return;
  // Accept keeps nested york_help from overview; regenerate only if missing.
  if (!row.yorkHelp) {
    scheduleYorkHelpRegeneration({
      accountId: account.id,
      initiativeId: row.id,
      companyUuid,
    });
  }
  return { id: row.id };
}

export async function dismissSuggestedInitiativeAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const id = String(formData.get("id") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!id || !companyUuid) return;

  await dismissSuggestedInitiative({
    accountId: account.id,
    id,
  });
  revalidatePath(`/company/${companyUuid}`);
}

export async function deleteInitiativeAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const id = String(formData.get("id") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!id || !companyUuid) return;
  await deleteCompanyInitiative({ accountId: account.id, id });
  revalidatePath(`/company/${companyUuid}`);
}

export async function linkInitiativeAdvisorAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const advisorId = String(formData.get("advisorId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !advisorId) return;

  try {
    await linkAdvisorToInitiative({
      accountId: account.id,
      initiativeId,
      advisorId,
      role: String(formData.get("role") ?? "").trim() || null,
      addedByEmail: email,
    });
  } catch (error) {
    if (error instanceof ClaimedProfileRequiredError) return;
    throw error;
  }

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

export async function unlinkInitiativeAdvisorAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const advisorId = String(formData.get("advisorId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !advisorId) return;

  try {
    await unlinkAdvisorFromInitiative({
      accountId: account.id,
      initiativeId,
      advisorId,
    });
  } catch (error) {
    if (error instanceof ClaimedProfileRequiredError) return;
    throw error;
  }

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

// --- Initiative signal instrumentation (Phase 3) ----------------------------

function coerceSignalRole(raw: string | null | undefined): InitiativeSignalRole {
  return raw === "target" ? "target" : "baseline";
}

function coerceMilestoneStatus(raw: string | null | undefined): MilestoneStatus {
  return (INITIATIVE_MILESTONE_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as MilestoneStatus)
    : "todo";
}

function parseNumericIfProvided(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function linkInitiativeSignalAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const signalId = String(formData.get("signalId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !signalId) return;

  const role = coerceSignalRole(String(formData.get("role") ?? ""));
  const valueNumeric = parseNumericIfProvided(String(formData.get("valueNumeric") ?? ""));
  const valueText = String(formData.get("valueText") ?? "").trim() || null;
  // Checkbox → boolean, but only when we're on a boolean-kind signal.
  const valueBoolRaw = formData.get("valueBool");
  const valueBool = valueBoolRaw == null ? null : String(valueBoolRaw) === "true";
  const targetDate = String(formData.get("targetDate") ?? "").trim() || null;
  const sourceObservationId = String(formData.get("sourceObservationId") ?? "").trim() || null;

  await upsertInitiativeSignal({
    accountId: account.id,
    initiativeId,
    signalId,
    role,
    valueNumeric,
    valueText,
    valueBool,
    targetDate: role === "target" ? targetDate : null,
    sourceObservationId,
    createdByEmail: email,
  });

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

export async function unlinkInitiativeSignalAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const signalId = String(formData.get("signalId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !signalId) return;

  await unlinkInitiativeSignal({
    accountId: account.id,
    initiativeId,
    signalId,
    role: coerceSignalRole(String(formData.get("role") ?? "")),
  });

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

// --- Initiative milestones (Phase 3) ----------------------------------------

export async function createMilestoneAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !label) return;

  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueDateRaw ? normalizeMilestoneDueDate(dueDateRaw) : null;
  if (dueDateRaw && !dueDate) return;

  await createMilestone({
    accountId: account.id,
    initiativeId,
    label,
    dueDate,
    createdByEmail: email,
  });

  if (companyUuid) {
    scheduleYorkHelpRegeneration({
      accountId: account.id,
      initiativeId,
      companyUuid,
    });
    revalidatePath(`/company/${companyUuid}`);
  }
}

export async function updateMilestoneStatusAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !milestoneId) return;

  await updateMilestoneStatus({
    accountId: account.id,
    initiativeId,
    milestoneId,
    status: coerceMilestoneStatus(String(formData.get("status") ?? "")),
  });

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

export async function deleteMilestoneAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !milestoneId) return;

  await deleteMilestone({
    accountId: account.id,
    initiativeId,
    milestoneId,
  });

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

export async function updateMilestoneNoteAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  if (!initiativeId || !milestoneId) return;

  await updateMilestoneNote({
    accountId: account.id,
    initiativeId,
    milestoneId,
    note: String(formData.get("note") ?? ""),
  });

  if (companyUuid) revalidatePath(`/company/${companyUuid}`);
}

export async function updateMilestoneAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const initiativeId = String(formData.get("initiativeId") ?? "").trim();
  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!initiativeId || !milestoneId || !label) return;

  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueDateRaw ? normalizeMilestoneDueDate(dueDateRaw) : null;
  if (dueDateRaw && !dueDate) return;

  await updateMilestone({
    accountId: account.id,
    initiativeId,
    milestoneId,
    label,
    dueDate,
  });

  if (companyUuid) {
    scheduleYorkHelpRegeneration({
      accountId: account.id,
      initiativeId,
      companyUuid,
    });
    revalidatePath(`/company/${companyUuid}`);
  }
}

export async function dismissYorkHelpAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;

  const id = String(formData.get("id") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  if (!id || !companyUuid) return;

  if (mode === "forever") {
    await updateCompanyInitiative({
      accountId: account.id,
      id,
      patch: {
        yorkHelpDismissForever: true,
        yorkHelpDismissedUntil: null,
      },
    });
  } else if (isYorkHelpTemporaryDismissMode(mode)) {
    // Temporary hide — duration from Super Admin Chip Management (same as
    // left-nav partner banner). Mode "14d" kept as legacy alias.
    const hideDays = await getMarketingBannerDismissDays();
    const until = yorkHelpTemporaryDismissUntil(hideDays);
    await updateCompanyInitiative({
      accountId: account.id,
      id,
      patch: {
        yorkHelpDismissForever: false,
        yorkHelpDismissedUntil: until,
      },
    });
  } else {
    return;
  }

  revalidatePath(`/company/${companyUuid}`);
}

export async function setInitiativeIntelligenceLinksAction(
  formData: FormData,
): Promise<InitiativeIntelligenceLink[] | null> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return null;

  const id = String(formData.get("id") ?? "").trim();
  const companyUuid = String(formData.get("companyUuid") ?? "").trim();
  const raw = String(formData.get("intelligenceLinks") ?? "").trim();
  if (!id || !companyUuid || !raw) return null;

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const links = parseProgressIntelligenceLinks(parsedUnknown);
  const rawLength = Array.isArray(parsedUnknown) ? parsedUnknown.length : 0;
  if (!canPersistProgressIntelligenceLinks(links, rawLength)) return null;

  const row = await updateCompanyInitiative({
    accountId: account.id,
    id,
    patch: { intelligenceLinks: links },
  });
  if (!row) {
    Sentry.captureMessage("initiative_intelligence_links_update_missed", "warning");
    return null;
  }
  revalidatePath(`/company/${companyUuid}`);
  return Array.isArray(row.intelligenceLinks) ? row.intelligenceLinks : links;
}
