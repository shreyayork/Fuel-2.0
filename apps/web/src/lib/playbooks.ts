import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playbooks, type Playbook } from "@/db/schema";
import { embedText } from "@/lib/enrichment/embeddings";
import {
  isAdminPlaybookCategory,
  isPlaybookMode,
  isPlaybookTargetKind,
  PLAYBOOK_SLUG_REGEX,
  type AdminPlaybookCategory,
  type PlaybookMode,
  type PlaybookTargetKind,
} from "@/lib/playbooks-constants";
import { parseGuidedSteps, type GuidedStep } from "@/lib/playbooks/guided";

export {
  ADMIN_PLAYBOOK_CATEGORIES,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_MODES,
  PLAYBOOK_TARGET_KINDS,
  type AdminPlaybookCategory,
  type PlaybookCategory,
  type PlaybookMode,
  type PlaybookTargetKind,
} from "@/lib/playbooks-constants";

/** Admin list / upsert payload — never includes the 1024-dim embedding. */
export type PlaybookAdminRow = Omit<Playbook, "embedding">;

const PLAYBOOK_ADMIN_COLUMNS = {
  id: playbooks.id,
  accountId: playbooks.accountId,
  category: playbooks.category,
  subcategory: playbooks.subcategory,
  title: playbooks.title,
  slug: playbooks.slug,
  description: playbooks.description,
  content: playbooks.content,
  targetKind: playbooks.targetKind,
  tags: playbooks.tags,
  visibility: playbooks.visibility,
  authorEmail: playbooks.authorEmail,
  mode: playbooks.mode,
  steps: playbooks.steps,
  deletedAt: playbooks.deletedAt,
  isSystem: playbooks.isSystem,
  isVisible: playbooks.isVisible,
  createdAt: playbooks.createdAt,
  updatedAt: playbooks.updatedAt,
};

function activePlaybook() {
  return isNull(playbooks.deletedAt);
}

/** System prompts (e.g. overview-generation) never belong in the user catalog. */
function catalogPlaybook() {
  return and(eq(playbooks.isSystem, false), eq(playbooks.isVisible, true));
}

export async function getPlaybookById(opts: {
  id: string;
  accountId: string;
}): Promise<Playbook | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(playbooks)
    .where(
      and(
        eq(playbooks.id, opts.id),
        activePlaybook(),
        catalogPlaybook(),
        or(isNull(playbooks.accountId), eq(playbooks.accountId, opts.accountId)),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPlaybookBySlug(opts: {
  slug: string;
  accountId: string;
}): Promise<Playbook | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(playbooks)
    .where(
      and(
        eq(playbooks.slug, opts.slug),
        activePlaybook(),
        catalogPlaybook(),
        or(isNull(playbooks.accountId), eq(playbooks.accountId, opts.accountId)),
      ),
    )
    .orderBy(desc(playbooks.visibility))
    .limit(1);
  return row ?? null;
}

/**
 * List playbooks visible to an account — global (accountId=null) plus the
 * account's own. Optional text search across title/description/tags.
 */
export async function listPlaybooks(opts: {
  accountId: string;
  query?: string;
  category?: string;
}): Promise<Playbook[]> {
  const db = await getDb();
  const visibility = or(
    isNull(playbooks.accountId),
    eq(playbooks.accountId, opts.accountId),
  );
  const filters = [visibility, activePlaybook(), catalogPlaybook()];
  if (opts.category) filters.push(eq(playbooks.category, opts.category));
  if (opts.query && opts.query.trim()) {
    const q = `%${opts.query.trim()}%`;
    filters.push(
      or(
        ilike(playbooks.title, q),
        ilike(playbooks.description, q),
        ilike(playbooks.content, q),
        sql`${playbooks.tags}::text ilike ${q}`,
      )!,
    );
  }
  return db
    .select()
    .from(playbooks)
    .where(and(...filters))
    .orderBy(
      asc(playbooks.category),
      asc(playbooks.subcategory),
      asc(playbooks.title),
    );
}

export interface PlaybookTreeNode {
  category: string;
  subcategories: Array<{
    name: string | null;
    playbooks: Playbook[];
  }>;
}

/** Group a flat list into `category → subcategory → playbooks` for the tree UI. */
export function buildPlaybookTree(list: Playbook[]): PlaybookTreeNode[] {
  const byCategory = new Map<string, Map<string | null, Playbook[]>>();
  for (const p of list) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, new Map());
    const sub = byCategory.get(p.category)!;
    const key = p.subcategory ?? null;
    if (!sub.has(key)) sub.set(key, []);
    sub.get(key)!.push(p);
  }
  return Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, subMap]) => ({
      category,
      subcategories: Array.from(subMap.entries())
        .sort(([a], [b]) => (a ?? "").localeCompare(b ?? ""))
        .map(([name, ps]) => ({ name, playbooks: ps })),
    }));
}

export async function createPlaybook(opts: {
  accountId: string;
  category: string;
  subcategory?: string | null;
  title: string;
  slug: string;
  description: string;
  content: string;
  authorEmail: string;
  targetKind?: PlaybookTargetKind | null;
  tags?: string[];
}): Promise<Playbook> {
  const db = await getDb();
  const id = `pb_${opts.slug}_${opts.accountId.slice(0, 8)}`;
  const embedding = await embedText(
    [opts.title, opts.description, opts.content].filter(Boolean).join("\n\n"),
  );
  const [row] = await db
    .insert(playbooks)
    .values({
      id,
      accountId: opts.accountId,
      category: opts.category,
      subcategory: opts.subcategory ?? null,
      title: opts.title,
      slug: opts.slug,
      description: opts.description,
      content: opts.content,
      authorEmail: opts.authorEmail,
      targetKind: opts.targetKind ?? null,
      tags: opts.tags ?? null,
      visibility: "account",
      embedding: embedding ?? undefined,
    })
    .returning();
  return row;
}

/** Super-admin: list York IE global playbooks (includes soft-deleted by default). */
export async function listGlobalPlaybooksAdmin(opts?: {
  includeDeleted?: boolean;
}): Promise<PlaybookAdminRow[]> {
  const db = await getDb();
  const filters = [isNull(playbooks.accountId)];
  if (!opts?.includeDeleted) filters.push(activePlaybook());
  return db
    .select(PLAYBOOK_ADMIN_COLUMNS)
    .from(playbooks)
    .where(and(...filters))
    .orderBy(
      asc(playbooks.category),
      asc(playbooks.subcategory),
      asc(playbooks.title),
    );
}

export interface UpsertGlobalPlaybookInput {
  id?: string;
  slug: string;
  category: AdminPlaybookCategory;
  subcategory?: string | null;
  title: string;
  description: string;
  content: string;
  authorEmail: string;
  targetKind?: PlaybookTargetKind | null;
  tags?: string[] | null;
  mode: PlaybookMode;
  steps?: GuidedStep[] | null;
}

export function validateGlobalPlaybookInput(
  input: UpsertGlobalPlaybookInput,
  isCreate: boolean,
): boolean {
  if (!input.title.trim() || !input.description.trim() || !input.content.trim()) return false;
  if (!isAdminPlaybookCategory(input.category)) return false;
  if (!isPlaybookMode(input.mode)) return false;
  if (input.targetKind != null && !isPlaybookTargetKind(input.targetKind)) return false;
  if (isCreate && !PLAYBOOK_SLUG_REGEX.test(input.slug)) return false;
  if (input.mode === "guided") {
    if (!input.steps?.length || !parseGuidedSteps(input.steps)) return false;
  }
  return true;
}

export async function upsertGlobalPlaybook(
  input: UpsertGlobalPlaybookInput,
): Promise<PlaybookAdminRow | null> {
  const isCreate = !input.id;
  if (!validateGlobalPlaybookInput(input, isCreate)) return null;

  const db = await getDb();
  const steps =
    input.mode === "guided" ? (input.steps as unknown as Array<Record<string, unknown>>) : null;

  if (input.id) {
    const [existing] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.id, input.id), isNull(playbooks.accountId)))
      .limit(1);
    if (!existing) return null;

    const embeddingSourceChanged =
      existing.title !== input.title ||
      existing.description !== input.description ||
      existing.content !== input.content;

    const patch: Record<string, unknown> = {
      category: input.category,
      subcategory: input.subcategory?.trim() || null,
      title: input.title.trim(),
      description: input.description.trim(),
      content: input.content.trim(),
      targetKind: input.targetKind ?? null,
      tags: input.tags ?? null,
      mode: input.mode,
      steps,
      authorEmail: input.authorEmail,
      updatedAt: new Date(),
    };

    if (embeddingSourceChanged) {
      const embedding = await embedText(
        [input.title, input.description, input.content].filter(Boolean).join("\n\n"),
      );
      if (embedding) patch.embedding = embedding;
    }

    const [row] = await db
      .update(playbooks)
      .set(patch)
      .where(eq(playbooks.id, input.id))
      .returning(PLAYBOOK_ADMIN_COLUMNS);
    return row ?? null;
  }

  const slug = input.slug.trim();
  const [existingBySlug] = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.slug, slug), isNull(playbooks.accountId)))
    .limit(1);

  if (existingBySlug) {
    if (!existingBySlug.deletedAt) return null;
    const embedding = await embedText(
      [input.title, input.description, input.content].filter(Boolean).join("\n\n"),
    );
    const [row] = await db
      .update(playbooks)
      .set({
        category: input.category,
        subcategory: input.subcategory?.trim() || null,
        title: input.title.trim(),
        description: input.description.trim(),
        content: input.content.trim(),
        targetKind: input.targetKind ?? null,
        tags: input.tags ?? null,
        visibility: "global",
        authorEmail: input.authorEmail,
        mode: input.mode,
        steps,
        embedding: embedding ?? undefined,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(playbooks.id, existingBySlug.id))
      .returning(PLAYBOOK_ADMIN_COLUMNS);
    return row ?? null;
  }

  const embedding = await embedText(
    [input.title, input.description, input.content].filter(Boolean).join("\n\n"),
  );

  const [row] = await db
    .insert(playbooks)
    .values({
      id: `pb_${slug}`,
      accountId: null,
      category: input.category,
      subcategory: input.subcategory?.trim() || null,
      title: input.title.trim(),
      slug,
      description: input.description.trim(),
      content: input.content.trim(),
      targetKind: input.targetKind ?? null,
      tags: input.tags ?? null,
      visibility: "global",
      authorEmail: input.authorEmail,
      mode: input.mode,
      steps,
      embedding: embedding ?? undefined,
    })
    .returning(PLAYBOOK_ADMIN_COLUMNS);
  return row ?? null;
}

export async function softDeleteGlobalPlaybook(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .update(playbooks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(playbooks.id, id), isNull(playbooks.accountId), activePlaybook()));
  return (result.rowCount ?? 0) > 0;
}

export async function restoreGlobalPlaybook(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .update(playbooks)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(playbooks.id, id), isNull(playbooks.accountId)));
  return (result.rowCount ?? 0) > 0;
}

/**
 * Semantic search over global playbooks only — for pre-claim onboard flows.
 */
export async function searchGlobalPlaybooksByQuery(opts: {
  query: string;
  category?: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    subcategory: string | null;
    targetKind: string | null;
    distance: number;
  }>
> {
  const embedding = await embedText(opts.query);
  if (!embedding) return [];
  const db = await getDb();
  const vec = `[${embedding.join(",")}]`;
  const limit = opts.limit ?? 5;
  const categoryClause = opts.category ? sql`AND category = ${opts.category}` : sql``;
  const rows = await db.execute(sql`
    SELECT id, slug, title, description, category, subcategory, target_kind,
           (embedding <=> ${vec}::vector) AS distance
    FROM playbooks
    WHERE embedding IS NOT NULL
      AND account_id IS NULL
      AND deleted_at IS NULL
      ${categoryClause}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
  return (rows.rows as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    subcategory: string | null;
    target_kind: string | null;
    distance: string | number;
  }>).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    subcategory: r.subcategory,
    targetKind: r.target_kind,
    distance: Number(r.distance),
  }));
}

/**
 * Semantic playbook search via pgvector cosine distance. Restricts to
 * playbooks visible to the caller's account (global + account's own).
 * Lets agents discover relevant playbooks without cramming the catalog
 * into the prompt.
 */
export async function searchPlaybooksByQuery(opts: {
  accountId: string;
  embedding: number[];
  category?: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    subcategory: string | null;
    targetKind: string | null;
    distance: number;
  }>
> {
  const db = await getDb();
  const vec = `[${opts.embedding.join(",")}]`;
  const limit = opts.limit ?? 5;
  const categoryClause = opts.category ? sql`AND category = ${opts.category}` : sql``;
  const rows = await db.execute(sql`
    SELECT id, slug, title, description, category, subcategory, target_kind,
           (embedding <=> ${vec}::vector) AS distance
    FROM playbooks
    WHERE embedding IS NOT NULL
      AND deleted_at IS NULL
      AND (account_id IS NULL OR account_id = ${opts.accountId})
      ${categoryClause}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
  return (rows.rows as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    subcategory: string | null;
    target_kind: string | null;
    distance: string | number;
  }>).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    subcategory: r.subcategory,
    targetKind: r.target_kind,
    distance: Number(r.distance),
  }));
}
