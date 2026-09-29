import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { artifacts, type Artifact } from "@/db/schema";

export type ArtifactSubject =
  | { type: "company"; uuid: string; name?: string }
  | { type: "pipeline"; id: string; name?: string }
  | { type: "deal"; id: string; name?: string }
  | { type: string; [k: string]: unknown };

export interface ArtifactKindInfo {
  id: string;
  label: string;
  description: string;
}

/**
 * Registry of artifact kinds. Adding a new kind (e.g., diligence_report) is
 * a one-entry addition here — the table is kind-agnostic.
 */
export const ARTIFACT_KINDS: Record<string, ArtifactKindInfo> = {
  intelligence_brief: {
    id: "intelligence_brief",
    label: "Intelligence Brief",
    description: "AI-synthesized overview of a company pulling public + private context.",
  },
  diligence_report: {
    id: "diligence_report",
    label: "Diligence Report",
    description: "Deep dive covering team, market, product, competition, financials.",
  },
  meeting_summary: {
    id: "meeting_summary",
    label: "Meeting Summary",
    description: "Distilled notes + action items from a meeting.",
  },
  comparison: {
    id: "comparison",
    label: "Company Comparison",
    description: "Side-by-side analysis of two or more companies.",
  },
  playbook_run: {
    id: "playbook_run",
    label: "Playbook Run",
    description: "Output of running a York IE playbook against a subject.",
  },
};

export function getArtifactKind(kind: string): ArtifactKindInfo {
  return (
    ARTIFACT_KINDS[kind] ?? {
      id: kind,
      label: kind,
      description: "",
    }
  );
}

export async function createArtifact(opts: {
  accountId: string;
  kind: string;
  title: string;
  content: string;
  subjects: ArtifactSubject[];
  agentRunId?: string | null;
  authorEmail: string;
  sections?: Record<string, unknown>;
  visibility?: "private" | "account" | "team";
}): Promise<Artifact> {
  const db = await getDb();
  const id = randomUUID();
  const [row] = await db
    .insert(artifacts)
    .values({
      id,
      accountId: opts.accountId,
      kind: opts.kind,
      title: opts.title,
      content: opts.content,
      subjects: opts.subjects,
      agentRunId: opts.agentRunId ?? null,
      authorEmail: opts.authorEmail,
      sections: opts.sections ?? null,
      visibility: opts.visibility ?? "account",
    })
    .returning();
  return row;
}

/** Lightweight badge count — no row hydration. */
export async function countArtifactsForCompany(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const db = await getDb();
  const match = JSON.stringify([{ type: "company", uuid: opts.companyUuid }]);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(artifacts)
    .where(
      and(
        eq(artifacts.accountId, opts.accountId),
        sql`${artifacts.subjects} @> ${match}::jsonb`,
      ),
    );
  return row?.count ?? 0;
}

export async function listArtifactsForCompany(opts: {
  accountId: string;
  companyUuid: string;
  kind?: string;
  limit?: number;
}): Promise<Artifact[]> {
  const db = await getDb();
  // jsonb containment: subjects @> '[{"type":"company","uuid":"..."}]'
  // Portfolio-tagged artifacts (type:portfolio) intentionally do not match —
  // company Research is company-scoped only.
  const match = JSON.stringify([{ type: "company", uuid: opts.companyUuid }]);
  const where = opts.kind
    ? and(
        eq(artifacts.accountId, opts.accountId),
        eq(artifacts.kind, opts.kind),
        sql`${artifacts.subjects} @> ${match}::jsonb`,
      )
    : and(
        eq(artifacts.accountId, opts.accountId),
        sql`${artifacts.subjects} @> ${match}::jsonb`,
      );
  return db
    .select()
    .from(artifacts)
    .where(where)
    .orderBy(desc(artifacts.createdAt))
    .limit(opts.limit ?? 50);
}

export async function getArtifact(opts: {
  accountId: string;
  id: string;
}): Promise<Artifact | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.id, opts.id), eq(artifacts.accountId, opts.accountId)))
    .limit(1);
  return row ?? null;
}

export async function deleteArtifact(opts: {
  accountId: string;
  id: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(artifacts)
    .where(and(eq(artifacts.id, opts.id), eq(artifacts.accountId, opts.accountId)));
}
