import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  accounts,
  advisors,
  companyInitiativeAdvisors,
  companyInitiatives,
  initiativeMilestones,
  initiativeSignals,
  signalObservations,
  signals,
  type Advisor,
  type CompanyInitiative,
  type InitiativeMilestone,
  type InitiativeSignal,
} from "@/db/schema";
import { ClaimedProfileRequiredError, isClaimedCompanyProfile } from "@/lib/accounts";
import {
  defaultInitiativeMilestoneTitles,
  normalizeMilestoneDueDate,
} from "@/lib/initiative-milestone-dates";
import {
  ACTIVE_INITIATIVE_EXCLUDED_STATUSES,
  COMPLETED_INITIATIVE_STATUSES,
} from "@/lib/company-initiatives-paging";

export interface CompanyInitiativeWithAdvisors extends CompanyInitiative {
  advisors: Array<{
    advisorId: string;
    name: string;
    title: string | null;
    company: string | null;
    photoUrl: string | null;
    role: string | null;
  }>;
}

export type CompanyInitiativeListStatus = "active" | "completed";

export interface CompanyInitiativePage {
  items: CompanyInitiativeWithAdvisors[];
  total: number;
  activeTotal: number;
  completedTotal: number;
  limit: number;
  offset: number;
}

const ALLOWED_AREAS = ["gtm", "product", "finance", "people", "ops", "other"] as const;
export type InitiativeArea = (typeof ALLOWED_AREAS)[number];
export const INITIATIVE_AREAS = ALLOWED_AREAS;

const ALLOWED_STATUSES = ["active", "paused", "completed", "archived", "draft"] as const;
export type InitiativeStatus = (typeof ALLOWED_STATUSES)[number];
export const INITIATIVE_STATUSES = ALLOWED_STATUSES;

function initiativeId(): string {
  return `init_${randomUUID()}`;
}

/** Lightweight badge count — no advisor hydration. */
/** Active-list count for the company Initiatives tab badge (excludes suggested/draft + completed). */
export async function countCompanyInitiatives(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        notInArray(companyInitiatives.status, [
          "draft",
          "suggested",
          "completed",
          "complete",
        ]),
      ),
    );
  return row?.count ?? 0;
}

/**
 * Overview glance chips: suggested (`draft`) + `active` only, keyed by
 * overviewCategoryId (dev|mkt|rev). Excludes completed / paused / archived.
 */
export async function countOpenOverviewInitiativesByCategory(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({
      categoryId: companyInitiatives.overviewCategoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        inArray(companyInitiatives.status, ["draft", "active"]),
      ),
    )
    .groupBy(companyInitiatives.overviewCategoryId);

  const out = new Map<string, number>();
  for (const row of rows) {
    if (!row.categoryId) continue;
    out.set(row.categoryId, row.count ?? 0);
  }
  return out;
}

export async function listCompanyInitiatives(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<CompanyInitiativeWithAdvisors[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(desc(companyInitiatives.updatedAt));

  if (rows.length === 0) return [];

  // One additional round-trip to batch-load advisor links for every
  // initiative on this page. Cheap — the list is small.
  const ids = rows.map((r) => r.id);
  const advisorLinks = await db
    .select({
      initiativeId: companyInitiativeAdvisors.initiativeId,
      role: companyInitiativeAdvisors.role,
      advisor: advisors,
    })
    .from(companyInitiativeAdvisors)
    .innerJoin(advisors, eq(advisors.id, companyInitiativeAdvisors.advisorId))
    .where(inArray(companyInitiativeAdvisors.initiativeId, ids));

  const byInitiative = new Map<string, CompanyInitiativeWithAdvisors["advisors"]>();
  for (const link of advisorLinks) {
    const a: Advisor = link.advisor;
    const arr = byInitiative.get(link.initiativeId) ?? [];
    arr.push({
      advisorId: a.id,
      name: a.name,
      title: a.title,
      company: a.company,
      photoUrl: a.photoUrl,
      role: link.role,
    });
    byInitiative.set(link.initiativeId, arr);
  }

  return rows.map((r) => ({ ...r, advisors: byInitiative.get(r.id) ?? [] }));
}

/**
 * Research hydrate: which artifact suggestions already became initiatives.
 * Map key = sourceArtifactId, values = sourceSuggestionKey list.
 */
export async function listCreatedBriefSuggestionKeys(opts: {
  accountId: string;
  companyUuid: string;
  artifactIds: string[];
}): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (opts.artifactIds.length === 0) return out;
  const db = await getDb();
  const rows = await db
    .select({
      sourceArtifactId: companyInitiatives.sourceArtifactId,
      sourceSuggestionKey: companyInitiatives.sourceSuggestionKey,
    })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        inArray(companyInitiatives.sourceArtifactId, opts.artifactIds),
        isNotNull(companyInitiatives.sourceSuggestionKey),
      ),
    );
  for (const row of rows) {
    if (!row.sourceArtifactId || !row.sourceSuggestionKey) continue;
    const list = out.get(row.sourceArtifactId) ?? [];
    if (!list.includes(row.sourceSuggestionKey)) list.push(row.sourceSuggestionKey);
    out.set(row.sourceArtifactId, list);
  }
  return out;
}

export async function findInitiativeByArtifactSuggestion(opts: {
  accountId: string;
  companyUuid: string;
  sourceArtifactId: string;
  sourceSuggestionKey: string;
}): Promise<CompanyInitiative | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        eq(companyInitiatives.sourceArtifactId, opts.sourceArtifactId),
        eq(companyInitiatives.sourceSuggestionKey, opts.sourceSuggestionKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Suggested / draft initiatives for the drawer — not part of Active/Completed paging. */
export async function listSuggestedCompanyInitiatives(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<CompanyInitiativeWithAdvisors[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        inArray(companyInitiatives.status, ["draft", "suggested"]),
      ),
    )
    .orderBy(desc(companyInitiatives.updatedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const advisorLinks = await db
    .select({
      initiativeId: companyInitiativeAdvisors.initiativeId,
      role: companyInitiativeAdvisors.role,
      advisor: advisors,
    })
    .from(companyInitiativeAdvisors)
    .innerJoin(advisors, eq(advisors.id, companyInitiativeAdvisors.advisorId))
    .where(inArray(companyInitiativeAdvisors.initiativeId, ids));

  const byInitiative = new Map<string, CompanyInitiativeWithAdvisors["advisors"]>();
  for (const link of advisorLinks) {
    const list = byInitiative.get(link.initiativeId) ?? [];
    list.push({
      advisorId: link.advisor.id,
      name: link.advisor.name,
      title: link.advisor.title,
      company: link.advisor.company,
      photoUrl: link.advisor.photoUrl,
      role: link.role,
    });
    byInitiative.set(link.initiativeId, list);
  }

  return rows.map((row) => ({
    ...row,
    advisors: byInitiative.get(row.id) ?? [],
  }));
}

/**
 * Account-scoped initiative page for the company Initiatives tab.
 * Status is applied in SQL before LIMIT/OFFSET; suggestions remain outside
 * this paginated list and continue to use the server-rendered client data.
 */
export async function listCompanyInitiativesPage(opts: {
  accountId: string;
  companyUuid: string;
  status: CompanyInitiativeListStatus;
  limit: number;
  offset: number;
}): Promise<CompanyInitiativePage> {
  const db = await getDb();
  const activeFilter = notInArray(
    companyInitiatives.status,
    [...ACTIVE_INITIATIVE_EXCLUDED_STATUSES],
  );
  const completedFilter = inArray(
    companyInitiatives.status,
    [...COMPLETED_INITIATIVE_STATUSES],
  );
  const baseFilter = and(
    eq(companyInitiatives.accountId, opts.accountId),
    eq(companyInitiatives.companyUuid, opts.companyUuid),
  );
  const statusFilter = opts.status === "completed" ? completedFilter : activeFilter;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(companyInitiatives)
      .where(and(baseFilter, statusFilter))
      .orderBy(desc(companyInitiatives.updatedAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db
      .select({
        activeTotal: sql<number>`count(*) filter (where ${activeFilter})::int`,
        completedTotal: sql<number>`count(*) filter (where ${completedFilter})::int`,
      })
      .from(companyInitiatives)
      .where(baseFilter),
  ]);

  const activeTotal = countRows[0]?.activeTotal ?? 0;
  const completedTotal = countRows[0]?.completedTotal ?? 0;
  if (rows.length === 0) {
    return {
      items: [],
      total: opts.status === "completed" ? completedTotal : activeTotal,
      activeTotal,
      completedTotal,
      limit: opts.limit,
      offset: opts.offset,
    };
  }

  const ids = rows.map((row) => row.id);
  const advisorLinks = await db
    .select({
      initiativeId: companyInitiativeAdvisors.initiativeId,
      role: companyInitiativeAdvisors.role,
      advisor: advisors,
    })
    .from(companyInitiativeAdvisors)
    .innerJoin(advisors, eq(advisors.id, companyInitiativeAdvisors.advisorId))
    .where(inArray(companyInitiativeAdvisors.initiativeId, ids));

  const byInitiative = new Map<string, CompanyInitiativeWithAdvisors["advisors"]>();
  for (const link of advisorLinks) {
    const list = byInitiative.get(link.initiativeId) ?? [];
    list.push({
      advisorId: link.advisor.id,
      name: link.advisor.name,
      title: link.advisor.title,
      company: link.advisor.company,
      photoUrl: link.advisor.photoUrl,
      role: link.role,
    });
    byInitiative.set(link.initiativeId, list);
  }

  return {
    items: rows.map((row) => ({
      ...row,
      advisors: byInitiative.get(row.id) ?? [],
    })),
    total: opts.status === "completed" ? completedTotal : activeTotal,
    activeTotal,
    completedTotal,
    limit: opts.limit,
    offset: opts.offset,
  };
}

export async function getCompanyInitiative(opts: {
  accountId: string;
  id: string;
}): Promise<CompanyInitiative | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(eq(companyInitiatives.id, opts.id), eq(companyInitiatives.accountId, opts.accountId)),
    )
    .limit(1);
  return row ?? null;
}

/** Single-row read with advisors — used to reopen a drawer after a production RSC refresh. */
export async function getCompanyInitiativeWithAdvisors(opts: {
  accountId: string;
  companyUuid: string;
  id: string;
}): Promise<CompanyInitiativeWithAdvisors | null> {
  const row = await getCompanyInitiative({ accountId: opts.accountId, id: opts.id });
  if (!row || row.companyUuid !== opts.companyUuid) return null;
  const db = await getDb();
  const advisorLinks = await db
    .select({
      role: companyInitiativeAdvisors.role,
      advisor: advisors,
    })
    .from(companyInitiativeAdvisors)
    .innerJoin(advisors, eq(advisors.id, companyInitiativeAdvisors.advisorId))
    .where(eq(companyInitiativeAdvisors.initiativeId, row.id));
  return {
    ...row,
    advisors: advisorLinks.map((link) => ({
      advisorId: link.advisor.id,
      name: link.advisor.name,
      title: link.advisor.title,
      company: link.advisor.company,
      photoUrl: link.advisor.photoUrl,
      role: link.role,
    })),
  };
}

export type InitiativeMilestoneSeed = {
  /** Matches Overview AI schema `milestones[].title` → DB `label`. */
  title: string;
  /** Matches Overview AI schema `milestones[].due_date` → DB `due_date`. */
  dueDate?: string | null;
  /** Matches Overview AI schema `milestones[].checked` → DB status todo|done. */
  checked?: boolean;
};

export type InitiativeSourceDocument = {
  id: string;
  documentVersionId: string | null;
  title: string;
  typeLabel?: string | null;
};

export async function createCompanyInitiative(opts: {
  accountId: string;
  companyUuid: string;
  kind: "continuous" | "onetime";
  name: string;
  area?: InitiativeArea;
  description?: string | null;
  status?: InitiativeStatus | "draft";
  ownerEmail: string;
  /** Free-text assignee chips (Design). Empty → derive from ownerEmail on read. */
  assignees?: string[];
  due?: string | null;
  sourceArtifactId?: string | null;
  /** Normalized suggestion title within sourceArtifactId — Research dedupe. */
  sourceSuggestionKey?: string | null;
  source?: string | null;
  overviewSnapshotId?: string | null;
  overviewCategoryId?: string | null;
  suggestedFromWeaknessId?: string | null;
  createdByEmail: string;
  /** Optional seed set of advisors from the company's pool. */
  advisorIds?: string[];
  /**
   * Optional milestones (Overview AI `suggested_initiatives[].milestones`).
   * Stored in `initiative_milestones` as label / due_date / status.
   */
  milestones?: InitiativeMilestoneSeed[];
  /** Nested How York IE can help from overview suggestions (Scenario 1). */
  yorkHelp?: CompanyInitiative["yorkHelp"];
  /** Progress links seeded at create (e.g. tagged intelligence from AI). */
  intelligenceLinks?: CompanyInitiative["intelligenceLinks"];
  /** Uploaded-document provenance for document-only suggestions. */
  sourceDocuments?: InitiativeSourceDocument[];
  sourceRationale?: string | null;
  benefit?: string | null;
  priority?: string | null;
  baselineMetric?: string | null;
  targetMetric?: string | null;
  benchmarkCohort?: string | null;
}): Promise<CompanyInitiative> {
  const db = await getDb();
  const suggestionKey = opts.sourceSuggestionKey?.trim() || null;
  const artifactId = opts.sourceArtifactId ?? null;

  // Idempotent create from Research: same artifact + suggestion → existing row.
  if (artifactId && suggestionKey) {
    const existing = await findInitiativeByArtifactSuggestion({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      sourceArtifactId: artifactId,
      sourceSuggestionKey: suggestionKey,
    });
    if (existing) return existing;
  }

  const id = initiativeId();
  let row: CompanyInitiative;
  try {
    const inserted = await db
      .insert(companyInitiatives)
      .values({
        id,
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        kind: opts.kind,
        name: opts.name,
        area: opts.area ?? "other",
        description: opts.description ?? null,
        status: opts.status ?? "active",
        ownerEmail: opts.ownerEmail,
        assignees: opts.assignees?.length
          ? opts.assignees.map((a) => a.trim()).filter(Boolean)
          : [opts.ownerEmail],
        due: opts.due ?? null,
        sourceArtifactId: artifactId,
        sourceSuggestionKey: suggestionKey,
        source: opts.source ?? null,
        overviewSnapshotId: opts.overviewSnapshotId ?? null,
        overviewCategoryId: opts.overviewCategoryId ?? null,
        suggestedFromWeaknessId: opts.suggestedFromWeaknessId ?? null,
        intelligenceLinks: opts.intelligenceLinks ?? [],
        sourceDocuments: opts.sourceDocuments ?? [],
        sourceRationale: opts.sourceRationale ?? null,
        benefit: opts.benefit ?? null,
        priority: opts.priority ?? null,
        baselineMetric: opts.baselineMetric ?? null,
        targetMetric: opts.targetMetric ?? null,
        benchmarkCohort: opts.benchmarkCohort ?? null,
        yorkHelp: opts.yorkHelp ?? null,
        yorkHelpStatus: opts.yorkHelp ? "ready" : "idle",
        createdByEmail: opts.createdByEmail,
      })
      .returning();
    row = inserted[0]!;
  } catch (error) {
    // Concurrent create race → unique index. Return winner.
    if (artifactId && suggestionKey) {
      const raced = await findInitiativeByArtifactSuggestion({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        sourceArtifactId: artifactId,
        sourceSuggestionKey: suggestionKey,
      });
      if (raced) return raced;
    }
    throw error;
  }

  if (opts.advisorIds && opts.advisorIds.length > 0) {
    // Advisor links are only allowed on the account's claimed company profile.
    const [account] = await db
      .select({
        portfolioManagerEnabled: accounts.portfolioManagerEnabled,
        primaryCompanyUuid: accounts.primaryCompanyUuid,
      })
      .from(accounts)
      .where(eq(accounts.id, opts.accountId))
      .limit(1);
    if (isClaimedCompanyProfile(account, opts.companyUuid)) {
      // Dedup defensively and insert links. ON CONFLICT DO NOTHING protects
      // against the caller passing duplicate ids.
      const uniq = Array.from(new Set(opts.advisorIds));
      await db
        .insert(companyInitiativeAdvisors)
        .values(
          uniq.map((advisorId) => ({
            initiativeId: id,
            advisorId,
            role: null,
            addedByEmail: opts.createdByEmail,
          })),
        )
        .onConflictDoNothing();
    }
  }

  let milestoneSeeds = (opts.milestones ?? [])
    .map((m) => ({
      title: m.title.trim(),
      dueDate: normalizeMilestoneDueDate(m.dueDate),
      checked: m.checked === true,
    }))
    .filter((m) => m.title.length > 0);

  // Manual / scorecard / accept creates without explicit milestones get the
  // standard three starter items — todo, no due date, no note.
  if (milestoneSeeds.length === 0 && opts.status !== "draft") {
    milestoneSeeds = defaultInitiativeMilestoneTitles({
      initiativeName: opts.name,
      categoryId: opts.overviewCategoryId,
    }).map((title) => ({
      title,
      dueDate: null,
      checked: false,
    }));
  }

  if (milestoneSeeds.length > 0) {
    await db.insert(initiativeMilestones).values(
      milestoneSeeds.map((m, index) => ({
        id: `mst_${randomUUID()}`,
        initiativeId: id,
        label: m.title.slice(0, 240),
        status: m.checked ? "done" : "todo",
        dueDate: m.dueDate,
        note: null,
        completedAt: m.checked ? new Date() : null,
        sortOrder: (index + 1) * 10,
        createdByEmail: opts.createdByEmail,
      })),
    );
  }

  return row;
}

async function seedDefaultMilestonesIfEmpty(opts: {
  accountId: string;
  initiativeId: string;
  initiativeName: string;
  categoryId: string | null;
  createdByEmail: string;
}): Promise<void> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return;
  const db = await getDb();
  const existing = await db
    .select({ id: initiativeMilestones.id })
    .from(initiativeMilestones)
    .where(eq(initiativeMilestones.initiativeId, opts.initiativeId))
    .limit(1);
  if (existing.length > 0) return;

  const titles = defaultInitiativeMilestoneTitles({
    initiativeName: opts.initiativeName,
    categoryId: opts.categoryId,
  });
  await db.insert(initiativeMilestones).values(
    titles.map((title, index) => ({
      id: `mst_${randomUUID()}`,
      initiativeId: opts.initiativeId,
      label: title.slice(0, 240),
      status: "todo",
      dueDate: null,
      note: null,
      completedAt: null,
      sortOrder: (index + 1) * 10,
      createdByEmail: opts.createdByEmail,
    })),
  );
}

/** Promote a Suggested (`draft`) initiative to Active. Idempotent if already active. */
export async function acceptSuggestedInitiative(opts: {
  accountId: string;
  id: string;
  createdByEmail?: string;
}): Promise<CompanyInitiative | null> {
  const db = await getDb();
  const [row] = await db
    .update(companyInitiatives)
    .set({ status: "active", updatedAt: new Date() })
    .where(
      and(
        eq(companyInitiatives.id, opts.id),
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.status, "draft"),
      ),
    )
    .returning();
  if (row) {
    // Scorecard / Suggested accept: ensure the three starter milestones exist
    // when the draft had none (todo, no due, no note).
    await seedDefaultMilestonesIfEmpty({
      accountId: opts.accountId,
      initiativeId: row.id,
      initiativeName: row.name,
      categoryId: row.overviewCategoryId,
      createdByEmail: opts.createdByEmail ?? row.createdByEmail,
    });
    return row;
  }

  // Already approved (or never a draft) — return the existing active row so
  // clients can show "Added to Initiatives" without creating a duplicate.
  const existing = await getCompanyInitiative({
    accountId: opts.accountId,
    id: opts.id,
  });
  if (existing && existing.status === "active") return existing;
  return null;
}

/** Remove a Suggested (`draft`) initiative — Dismiss in the Suggested drawer. */
export async function dismissSuggestedInitiative(opts: {
  accountId: string;
  id: string;
}): Promise<boolean> {
  const db = await getDb();
  const deleted = await db
    .delete(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.id, opts.id),
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.status, "draft"),
      ),
    )
    .returning({ id: companyInitiatives.id });
  return deleted.length > 0;
}

/** Case-insensitive title match among Active initiatives for a company. */
export async function findActiveInitiativeByTitle(opts: {
  accountId: string;
  companyUuid: string;
  title: string;
}): Promise<CompanyInitiative | null> {
  const db = await getDb();
  const needle = opts.title.trim().toLowerCase();
  if (!needle) return null;
  const rows = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        eq(companyInitiatives.status, "active"),
      ),
    );
  return rows.find((r) => r.name.trim().toLowerCase() === needle) ?? null;
}

export type InitiativeIntelligenceLink = {
  id: string;
  role: "baseline" | "current" | "target";
  intelligenceId: string;
  title: string;
  highlight: string;
  type: string;
  date: string;
};

export async function updateCompanyInitiative(opts: {
  accountId: string;
  id: string;
  patch: Partial<
    Pick<
      CompanyInitiative,
      | "name"
      | "area"
      | "description"
      | "status"
      | "ownerEmail"
      | "assignees"
      | "due"
      | "kind"
      | "overviewCategoryId"
      | "intelligenceLinks"
      | "yorkHelp"
      | "yorkHelpStatus"
      | "yorkHelpContentHash"
      | "yorkHelpDismissedUntil"
      | "yorkHelpDismissForever"
    >
  >;
}): Promise<CompanyInitiative | null> {
  const db = await getDb();
  const [row] = await db
    .update(companyInitiatives)
    .set({ ...opts.patch, updatedAt: new Date() })
    .where(
      and(eq(companyInitiatives.id, opts.id), eq(companyInitiatives.accountId, opts.accountId)),
    )
    .returning();
  return row ?? null;
}

export async function deleteCompanyInitiative(opts: {
  accountId: string;
  id: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(companyInitiatives)
    .where(
      and(eq(companyInitiatives.id, opts.id), eq(companyInitiatives.accountId, opts.accountId)),
    );
}

export async function linkAdvisorToInitiative(opts: {
  accountId: string;
  initiativeId: string;
  advisorId: string;
  role?: string | null;
  addedByEmail: string;
}): Promise<void> {
  const db = await getDb();
  // Guard: initiative must belong to the account. Advisor FK is already
  // scoped via advisors.accountId via companyAdvisors usage elsewhere —
  // we trust the caller (server action) to pick from the pool.
  const [init] = await db
    .select({
      id: companyInitiatives.id,
      companyUuid: companyInitiatives.companyUuid,
    })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.id, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    )
    .limit(1);
  if (!init) return;

  const [account] = await db
    .select({
      portfolioManagerEnabled: accounts.portfolioManagerEnabled,
      primaryCompanyUuid: accounts.primaryCompanyUuid,
    })
    .from(accounts)
    .where(eq(accounts.id, opts.accountId))
    .limit(1);
  if (!isClaimedCompanyProfile(account, init.companyUuid)) {
    throw new ClaimedProfileRequiredError();
  }

  await db
    .insert(companyInitiativeAdvisors)
    .values({
      initiativeId: opts.initiativeId,
      advisorId: opts.advisorId,
      role: opts.role ?? null,
      addedByEmail: opts.addedByEmail,
    })
    .onConflictDoNothing();
}

export async function unlinkAdvisorFromInitiative(opts: {
  accountId: string;
  initiativeId: string;
  advisorId: string;
}): Promise<void> {
  const db = await getDb();
  const [init] = await db
    .select({
      id: companyInitiatives.id,
      companyUuid: companyInitiatives.companyUuid,
    })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.id, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    )
    .limit(1);
  if (!init) return;

  const [account] = await db
    .select({
      portfolioManagerEnabled: accounts.portfolioManagerEnabled,
      primaryCompanyUuid: accounts.primaryCompanyUuid,
    })
    .from(accounts)
    .where(eq(accounts.id, opts.accountId))
    .limit(1);
  if (!isClaimedCompanyProfile(account, init.companyUuid)) {
    throw new ClaimedProfileRequiredError();
  }

  await db
    .delete(companyInitiativeAdvisors)
    .where(
      and(
        eq(companyInitiativeAdvisors.initiativeId, opts.initiativeId),
        eq(companyInitiativeAdvisors.advisorId, opts.advisorId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Initiative instrumentation: signals (baseline / target) + milestones + the
// progress computation that powers the dashboard on an initiative's detail
// view. "Current" is always derived from the latest non-superseded
// observation — it's not stored, so a fresh email extraction instantly moves
// the dial without any explicit refresh.
// ---------------------------------------------------------------------------

export type InitiativeSignalRole = "baseline" | "target";

export interface InitiativeSignalWithDef extends InitiativeSignal {
  signal: {
    id: string;
    label: string;
    category: string;
    kind: "quantitative" | "qualitative" | "boolean";
    unit: string | null;
    invertedGood: boolean;
  };
}

export interface InitiativeProgressRow {
  signal: {
    id: string;
    label: string;
    category: string;
    kind: "quantitative" | "qualitative" | "boolean";
    unit: string | null;
    invertedGood: boolean;
  };
  baseline: {
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    capturedAt: string;
    sourceObservationId: string | null;
  } | null;
  current: {
    observationId: string;
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    period: string;
    observedAt: string;
  } | null;
  target: {
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    targetDate: string | null;
  } | null;
}

/**
 * Verify an initiative belongs to the caller's account. Returns true when
 * safe to mutate; every write helper below should short-circuit on false
 * rather than leak data across accounts.
 */
async function initiativeBelongsToAccount(
  accountId: string,
  initiativeId: string,
): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: companyInitiatives.id })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.id, initiativeId),
        eq(companyInitiatives.accountId, accountId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function listInitiativeSignals(opts: {
  accountId: string;
  initiativeId: string;
}): Promise<InitiativeSignalWithDef[]> {
  const db = await getDb();
  // Account scoping enforced via the join back to company_initiatives so a
  // guess of another account's initiativeId returns nothing.
  const rows = await db
    .select({
      link: initiativeSignals,
      signal: {
        id: signals.id,
        label: signals.label,
        category: signals.category,
        kind: signals.kind,
        unit: signals.unit,
        invertedGood: signals.invertedGood,
      },
    })
    .from(initiativeSignals)
    .innerJoin(signals, eq(signals.id, initiativeSignals.signalId))
    .innerJoin(
      companyInitiatives,
      eq(companyInitiatives.id, initiativeSignals.initiativeId),
    )
    .where(
      and(
        eq(initiativeSignals.initiativeId, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    );
  return rows.map((r) => ({ ...r.link, signal: r.signal }));
}

export async function upsertInitiativeSignal(opts: {
  accountId: string;
  initiativeId: string;
  signalId: string;
  role: InitiativeSignalRole;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueBool?: boolean | null;
  targetDate?: string | null;
  sourceObservationId?: string | null;
  createdByEmail: string;
}): Promise<void> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return;
  const db = await getDb();
  await db
    .insert(initiativeSignals)
    .values({
      initiativeId: opts.initiativeId,
      signalId: opts.signalId,
      role: opts.role,
      valueNumeric: opts.valueNumeric ?? null,
      valueText: opts.valueText ?? null,
      valueBool: opts.valueBool ?? null,
      targetDate: opts.targetDate ?? null,
      sourceObservationId: opts.sourceObservationId ?? null,
      createdByEmail: opts.createdByEmail,
    })
    .onConflictDoUpdate({
      target: [
        initiativeSignals.initiativeId,
        initiativeSignals.signalId,
        initiativeSignals.role,
      ],
      set: {
        valueNumeric: opts.valueNumeric ?? null,
        valueText: opts.valueText ?? null,
        valueBool: opts.valueBool ?? null,
        targetDate: opts.targetDate ?? null,
        sourceObservationId: opts.sourceObservationId ?? null,
      },
    });
}

export async function unlinkInitiativeSignal(opts: {
  accountId: string;
  initiativeId: string;
  signalId: string;
  role: InitiativeSignalRole;
}): Promise<void> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return;
  const db = await getDb();
  await db
    .delete(initiativeSignals)
    .where(
      and(
        eq(initiativeSignals.initiativeId, opts.initiativeId),
        eq(initiativeSignals.signalId, opts.signalId),
        eq(initiativeSignals.role, opts.role),
      ),
    );
}

/**
 * Seed baseline rows from a set of motivating observations — called by the
 * "Create from suggestion" flow. Each observation becomes one baseline row
 * on the signal it was extracted for. Duplicate signals are resolved by
 * keeping the newest observation (the rest are ignored). If any of the
 * observations don't exist or belong to another account, they're skipped
 * silently — the remaining seeds still install.
 */
export async function seedBaselinesFromObservations(opts: {
  accountId: string;
  initiativeId: string;
  observationIds: string[];
  createdByEmail: string;
}): Promise<number> {
  if (opts.observationIds.length === 0) return 0;
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return 0;
  const db = await getDb();
  const obs = await db
    .select()
    .from(signalObservations)
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        inArray(signalObservations.id, opts.observationIds),
      ),
    );
  if (obs.length === 0) return 0;
  // Newest observation wins per signal.
  const bySignal = new Map<string, (typeof obs)[number]>();
  for (const o of obs) {
    const prev = bySignal.get(o.signalId);
    if (!prev || prev.createdAt < o.createdAt) bySignal.set(o.signalId, o);
  }
  let seeded = 0;
  for (const o of bySignal.values()) {
    await db
      .insert(initiativeSignals)
      .values({
        initiativeId: opts.initiativeId,
        signalId: o.signalId,
        role: "baseline",
        valueNumeric: o.valueNumeric,
        valueText: o.valueText,
        valueBool: o.valueBool,
        sourceObservationId: o.id,
        createdByEmail: opts.createdByEmail,
      })
      .onConflictDoNothing();
    seeded += 1;
  }
  return seeded;
}

/**
 * Compose the baseline / current / target view for every signal linked to
 * an initiative. "Current" = latest non-superseded observation on that
 * signal for the initiative's company; null if the company has no recent
 * data on the signal.
 */
export async function getInitiativeProgress(opts: {
  accountId: string;
  initiativeId: string;
}): Promise<InitiativeProgressRow[]> {
  const db = await getDb();
  // Resolve the initiative's company in one round-trip — the caller doesn't
  // have to know it.
  const [init] = await db
    .select({ companyUuid: companyInitiatives.companyUuid })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.id, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    )
    .limit(1);
  if (!init) return [];

  const links = await listInitiativeSignals({
    accountId: opts.accountId,
    initiativeId: opts.initiativeId,
  });
  if (links.length === 0) return [];

  const uniqueSignalIds = Array.from(new Set(links.map((l) => l.signalId)));
  const currentBySignal = await latestObservationsBySignal({
    accountId: opts.accountId,
    companyUuid: init.companyUuid,
    signalIds: uniqueSignalIds,
  });
  return composeInitiativeProgressRows(links, currentBySignal);
}

function composeInitiativeProgressRows(
  links: InitiativeSignalWithDef[],
  currentBySignal: Map<string, (typeof signalObservations.$inferSelect)>,
): InitiativeProgressRow[] {
  const bySignal = new Map<string, { baseline?: InitiativeSignalWithDef; target?: InitiativeSignalWithDef }>();
  for (const l of links) {
    const slot = bySignal.get(l.signalId) ?? {};
    if (l.role === "baseline") slot.baseline = l;
    if (l.role === "target") slot.target = l;
    bySignal.set(l.signalId, slot);
  }

  const out: InitiativeProgressRow[] = [];
  for (const [signalId, slot] of bySignal.entries()) {
    const def = (slot.baseline ?? slot.target)!.signal;
    const current = currentBySignal.get(signalId);
    out.push({
      signal: def,
      baseline: slot.baseline
        ? {
            valueNumeric: slot.baseline.valueNumeric,
            valueText: slot.baseline.valueText,
            valueBool: slot.baseline.valueBool,
            capturedAt: slot.baseline.createdAt.toISOString(),
            sourceObservationId: slot.baseline.sourceObservationId,
          }
        : null,
      current: current
        ? {
            observationId: current.id,
            valueNumeric: current.valueNumeric,
            valueText: current.valueText,
            valueBool: current.valueBool,
            period: current.period,
            observedAt: current.createdAt.toISOString(),
          }
        : null,
      target: slot.target
        ? {
            valueNumeric: slot.target.valueNumeric,
            valueText: slot.target.valueText,
            valueBool: slot.target.valueBool,
            targetDate: slot.target.targetDate,
          }
        : null,
    });
  }
  return out;
}

/** Latest live observation per signal for one company — one round-trip. */
async function latestObservationsBySignal(opts: {
  accountId: string;
  companyUuid: string;
  signalIds: string[];
}): Promise<Map<string, (typeof signalObservations.$inferSelect)>> {
  if (opts.signalIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.execute<(typeof signalObservations.$inferSelect)>(sql`
    SELECT DISTINCT ON (signal_id) *
    FROM signal_observations
    WHERE account_id = ${opts.accountId}
      AND company_uuid = ${opts.companyUuid}
      AND superseded_at IS NULL
      AND signal_id IN (${sql.join(
        opts.signalIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    ORDER BY signal_id, created_at DESC
  `);
  const out = new Map<string, (typeof signalObservations.$inferSelect)>();
  for (const row of rows.rows) {
    out.set(row.signalId, row);
  }
  return out;
}

/** Progress rows for every initiative on a company — replaces per-initiative N+1. */
export async function listInitiativeProgressForCompany(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<Map<string, InitiativeProgressRow[]>> {
  const db = await getDb();
  const initiatives = await db
    .select({ id: companyInitiatives.id })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
      ),
    );
  if (initiatives.length === 0) return new Map();

  const initiativeIds = initiatives.map((i) => i.id);
  const linkRows = await db
    .select({
      link: initiativeSignals,
      signal: {
        id: signals.id,
        label: signals.label,
        category: signals.category,
        kind: signals.kind,
        unit: signals.unit,
        invertedGood: signals.invertedGood,
      },
    })
    .from(initiativeSignals)
    .innerJoin(signals, eq(signals.id, initiativeSignals.signalId))
    .innerJoin(companyInitiatives, eq(companyInitiatives.id, initiativeSignals.initiativeId))
    .where(
      and(
        inArray(initiativeSignals.initiativeId, initiativeIds),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    );

  const linksByInitiative = new Map<string, InitiativeSignalWithDef[]>();
  for (const row of linkRows) {
    const link: InitiativeSignalWithDef = { ...row.link, signal: row.signal };
    const list = linksByInitiative.get(row.link.initiativeId) ?? [];
    list.push(link);
    linksByInitiative.set(row.link.initiativeId, list);
  }

  const uniqueSignalIds = Array.from(new Set(linkRows.map((r) => r.link.signalId)));
  const currentBySignal = await latestObservationsBySignal({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    signalIds: uniqueSignalIds,
  });

  const out = new Map<string, InitiativeProgressRow[]>();
  for (const initiativeId of initiativeIds) {
    const links = linksByInitiative.get(initiativeId) ?? [];
    out.set(initiativeId, composeInitiativeProgressRows(links, currentBySignal));
  }
  return out;
}

/** Progress rows for only the initiatives in a paginated company list. */
export async function listInitiativeProgressForIds(opts: {
  accountId: string;
  companyUuid: string;
  initiativeIds: string[];
}): Promise<Map<string, InitiativeProgressRow[]>> {
  if (opts.initiativeIds.length === 0) return new Map();
  const db = await getDb();
  const linkRows = await db
    .select({
      link: initiativeSignals,
      signal: {
        id: signals.id,
        label: signals.label,
        category: signals.category,
        kind: signals.kind,
        unit: signals.unit,
        invertedGood: signals.invertedGood,
      },
    })
    .from(initiativeSignals)
    .innerJoin(signals, eq(signals.id, initiativeSignals.signalId))
    .innerJoin(companyInitiatives, eq(companyInitiatives.id, initiativeSignals.initiativeId))
    .where(
      and(
        inArray(initiativeSignals.initiativeId, opts.initiativeIds),
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
      ),
    );

  const linksByInitiative = new Map<string, InitiativeSignalWithDef[]>();
  for (const row of linkRows) {
    const list = linksByInitiative.get(row.link.initiativeId) ?? [];
    list.push({ ...row.link, signal: row.signal });
    linksByInitiative.set(row.link.initiativeId, list);
  }

  const currentBySignal = await latestObservationsBySignal({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    signalIds: Array.from(new Set(linkRows.map((row) => row.link.signalId))),
  });
  const out = new Map<string, InitiativeProgressRow[]>();
  for (const initiativeId of opts.initiativeIds) {
    out.set(
      initiativeId,
      composeInitiativeProgressRows(linksByInitiative.get(initiativeId) ?? [], currentBySignal),
    );
  }
  return out;
}

// --- Milestones --------------------------------------------------------------

const MILESTONE_STATUSES = ["todo", "in_progress", "done", "blocked"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export const INITIATIVE_MILESTONE_STATUSES = MILESTONE_STATUSES;

export async function listInitiativeMilestones(opts: {
  accountId: string;
  initiativeId: string;
}): Promise<InitiativeMilestone[]> {
  const db = await getDb();
  const rows = await db
    .select({ m: initiativeMilestones })
    .from(initiativeMilestones)
    .innerJoin(
      companyInitiatives,
      eq(companyInitiatives.id, initiativeMilestones.initiativeId),
    )
    .where(
      and(
        eq(initiativeMilestones.initiativeId, opts.initiativeId),
        eq(companyInitiatives.accountId, opts.accountId),
      ),
    )
    .orderBy(initiativeMilestones.sortOrder, initiativeMilestones.createdAt);
  return rows.map((r) => r.m);
}

/** Milestones for every initiative on a company — one round-trip. */
export async function listInitiativeMilestonesForCompany(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<Map<string, InitiativeMilestone[]>> {
  const db = await getDb();
  const rows = await db
    .select({
      m: initiativeMilestones,
      initiativeId: initiativeMilestones.initiativeId,
    })
    .from(initiativeMilestones)
    .innerJoin(companyInitiatives, eq(companyInitiatives.id, initiativeMilestones.initiativeId))
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(initiativeMilestones.sortOrder, initiativeMilestones.createdAt);

  const out = new Map<string, InitiativeMilestone[]>();
  for (const row of rows) {
    const list = out.get(row.initiativeId) ?? [];
    list.push(row.m);
    out.set(row.initiativeId, list);
  }
  return out;
}

/** Milestones for only the initiatives in a paginated company list. */
export async function listInitiativeMilestonesForIds(opts: {
  accountId: string;
  companyUuid: string;
  initiativeIds: string[];
}): Promise<Map<string, InitiativeMilestone[]>> {
  if (opts.initiativeIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({
      milestone: initiativeMilestones,
      initiativeId: initiativeMilestones.initiativeId,
    })
    .from(initiativeMilestones)
    .innerJoin(companyInitiatives, eq(companyInitiatives.id, initiativeMilestones.initiativeId))
    .where(
      and(
        inArray(initiativeMilestones.initiativeId, opts.initiativeIds),
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(initiativeMilestones.sortOrder, initiativeMilestones.createdAt);

  const out = new Map<string, InitiativeMilestone[]>();
  for (const row of rows) {
    const list = out.get(row.initiativeId) ?? [];
    list.push(row.milestone);
    out.set(row.initiativeId, list);
  }
  return out;
}

export async function createMilestone(opts: {
  accountId: string;
  initiativeId: string;
  label: string;
  dueDate?: string | null;
  createdByEmail: string;
}): Promise<InitiativeMilestone | null> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return null;
  const dueDate = opts.dueDate
    ? normalizeMilestoneDueDate(opts.dueDate)
    : null;
  if (opts.dueDate && !dueDate) return null;
  const db = await getDb();
  // Append to the end by default — use the current max sort_order + 10 so
  // there's room to drag-reorder later without renumbering everything.
  const [top] = await db
    .select({ sortOrder: initiativeMilestones.sortOrder })
    .from(initiativeMilestones)
    .where(eq(initiativeMilestones.initiativeId, opts.initiativeId))
    .orderBy(desc(initiativeMilestones.sortOrder))
    .limit(1);
  const nextOrder = (top?.sortOrder ?? 0) + 10;
  const id = `mst_${randomUUID()}`;
  const [row] = await db
    .insert(initiativeMilestones)
    .values({
      id,
      initiativeId: opts.initiativeId,
      label: opts.label,
      status: "todo",
      dueDate,
      sortOrder: nextOrder,
      createdByEmail: opts.createdByEmail,
    })
    .returning();
  return row;
}

export async function updateMilestoneStatus(opts: {
  accountId: string;
  initiativeId: string;
  milestoneId: string;
  status: MilestoneStatus;
}): Promise<void> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return;
  const db = await getDb();
  await db
    .update(initiativeMilestones)
    .set({
      status: opts.status,
      completedAt: opts.status === "done" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(initiativeMilestones.id, opts.milestoneId),
        eq(initiativeMilestones.initiativeId, opts.initiativeId),
      ),
    );

  if (opts.status === "done") {
    const milestones = await db
      .select()
      .from(initiativeMilestones)
      .where(eq(initiativeMilestones.initiativeId, opts.initiativeId));
    const allDone =
      milestones.length > 0 && milestones.every((m) => m.status === "done");
    if (allDone) {
      await db
        .update(companyInitiatives)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(companyInitiatives.id, opts.initiativeId));
    }
  }
}

export async function updateMilestoneNote(opts: {
  accountId: string;
  initiativeId: string;
  milestoneId: string;
  note: string | null;
}): Promise<void> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return;
  const note = opts.note?.trim() ? opts.note.trim().slice(0, 280) : null;
  const db = await getDb();
  await db
    .update(initiativeMilestones)
    .set({ note, updatedAt: new Date() })
    .where(
      and(
        eq(initiativeMilestones.id, opts.milestoneId),
        eq(initiativeMilestones.initiativeId, opts.initiativeId),
      ),
    );
}

/** Update milestone label and/or due date (empty due clears it). */
export async function updateMilestone(opts: {
  accountId: string;
  initiativeId: string;
  milestoneId: string;
  label: string;
  dueDate?: string | null;
}): Promise<boolean> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return false;
  const label = opts.label.trim();
  if (!label) return false;

  let dueDate: string | null = null;
  if (opts.dueDate != null && String(opts.dueDate).trim()) {
    dueDate = normalizeMilestoneDueDate(String(opts.dueDate));
    if (!dueDate) return false;
  }

  const db = await getDb();
  const updated = await db
    .update(initiativeMilestones)
    .set({
      label,
      dueDate,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(initiativeMilestones.id, opts.milestoneId),
        eq(initiativeMilestones.initiativeId, opts.initiativeId),
      ),
    )
    .returning({ id: initiativeMilestones.id });
  return updated.length > 0;
}

export async function deleteMilestone(opts: {
  accountId: string;
  initiativeId: string;
  milestoneId: string;
}): Promise<void> {
  if (!(await initiativeBelongsToAccount(opts.accountId, opts.initiativeId))) return;
  const db = await getDb();
  await db
    .delete(initiativeMilestones)
    .where(
      and(
        eq(initiativeMilestones.id, opts.milestoneId),
        eq(initiativeMilestones.initiativeId, opts.initiativeId),
      ),
    );
}
