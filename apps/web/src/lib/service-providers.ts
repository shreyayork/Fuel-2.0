import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { serviceProviders, type ServiceProvider } from "@/db/schema";
import {
  SERVICE_PROVIDER_CATEGORIES,
  SERVICE_PROVIDER_VISIBILITIES,
  categoryLabel,
  type ServiceProviderCategory,
  type ServiceProviderVisibility,
} from "./service-providers-constants";

export {
  SERVICE_PROVIDER_CATEGORIES,
  SERVICE_PROVIDER_VISIBILITIES,
  categoryLabel,
};
export type { ServiceProviderCategory, ServiceProviderVisibility };

/** Account id whose members can see `visibility='internal'` service providers. */
export const INTERNAL_ACCOUNT_ID = "york-ie";

export type ServiceProviderPatch = Partial<
  Omit<ServiceProvider, "id" | "createdAt" | "updatedAt" | "curatedByEmail">
>;

function providerId(): string {
  return `sp_${randomUUID()}`;
}

/**
 * List service providers visible to `accountId`. All authenticated users see
 * `visibility='global'`; members of the York IE account additionally see
 * `visibility='internal'` rows.
 */
export async function listServiceProviders(opts: {
  accountId: string;
  category?: ServiceProviderCategory;
  tag?: string;
}): Promise<ServiceProvider[]> {
  const db = await getDb();
  const clauses = [];
  // Visibility filter.
  if (opts.accountId === INTERNAL_ACCOUNT_ID) {
    clauses.push(
      or(
        eq(serviceProviders.visibility, "global"),
        eq(serviceProviders.visibility, "internal"),
      )!,
    );
  } else {
    clauses.push(eq(serviceProviders.visibility, "global"));
  }
  if (opts.category) clauses.push(eq(serviceProviders.category, opts.category));
  const rows = await db
    .select()
    .from(serviceProviders)
    .where(and(...clauses))
    .orderBy(serviceProviders.category, serviceProviders.name);
  if (!opts.tag) return rows;
  return rows.filter((r) => (r.tags ?? []).includes(opts.tag!));
}

/** Super-admin fetch that sees every row regardless of visibility. */
export async function listServiceProvidersAdmin(): Promise<ServiceProvider[]> {
  const db = await getDb();
  return db.select().from(serviceProviders).orderBy(desc(serviceProviders.updatedAt));
}

export async function getServiceProvider(id: string): Promise<ServiceProvider | null> {
  const db = await getDb();
  const [row] = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id));
  return row ?? null;
}

export async function upsertServiceProvider(opts: {
  id?: string;
  curatedByEmail: string;
  values: {
    name: string;
    category: ServiceProviderCategory;
    description?: string | null;
    domain?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    linkedinUrl?: string | null;
    notes?: string | null;
    visibility?: ServiceProviderVisibility;
    tags?: string[] | null;
  };
}): Promise<ServiceProvider> {
  const db = await getDb();
  const now = new Date();
  if (opts.id) {
    const [row] = await db
      .update(serviceProviders)
      .set({
        ...opts.values,
        visibility: opts.values.visibility ?? "global",
        tags: opts.values.tags ?? null,
        updatedAt: now,
      })
      .where(eq(serviceProviders.id, opts.id))
      .returning();
    if (row) return row;
  }
  const id = opts.id ?? providerId();
  const [row] = await db
    .insert(serviceProviders)
    .values({
      id,
      curatedByEmail: opts.curatedByEmail,
      ...opts.values,
      visibility: opts.values.visibility ?? "global",
      tags: opts.values.tags ?? null,
    })
    .returning();
  return row;
}

export async function deleteServiceProvider(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(serviceProviders).where(eq(serviceProviders.id, id));
}

export async function countServiceProviders(accountId: string): Promise<number> {
  const rows = await listServiceProviders({ accountId });
  return rows.length;
}

/** Helper used when the admin UI multi-deletes via a bulk form submit. */
export async function deleteServiceProviders(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.delete(serviceProviders).where(inArray(serviceProviders.id, ids));
}

// Narrow unused utility import.
void sql;
