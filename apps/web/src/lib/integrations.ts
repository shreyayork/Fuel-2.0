import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  integrationActivityConfigs,
  integrationConnections,
  integrationPipelineConfigs,
  type IntegrationActivityConfig,
  type IntegrationConnection,
  type IntegrationPipelineConfig,
} from "@/db/schema";

type Provider = IntegrationConnection["provider"];

export async function listIntegrations(opts: {
  accountId: string;
}): Promise<IntegrationConnection[]> {
  const db = await getDb();
  return db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.accountId, opts.accountId))
    .orderBy(desc(integrationConnections.installedAt));
}

/**
 * Providers whose connection is per-user rather than per-account: each
 * member of an account installs their own (Granola's MCP DCR flow issues a
 * token bound to a single Slack/Granola identity, not the workspace).
 *
 * Account-level providers (HubSpot, Slack) keep the existing one-row-per-
 * (account, provider) semantics — there's only one HubSpot portal or Slack
 * bot install per workspace.
 */
const PER_USER_PROVIDERS = new Set<Provider>(["granola"]);

export function isPerUserProvider(provider: Provider): boolean {
  return PER_USER_PROVIDERS.has(provider);
}

/**
 * Account-level lookup. For per-user providers (Granola) prefer
 * `getUserIntegration` — calling this returns an arbitrary row across all
 * users in the account, which is rarely what you want.
 */
export async function getIntegration(opts: {
  accountId: string;
  provider: Provider;
}): Promise<IntegrationConnection | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.accountId, opts.accountId),
        eq(integrationConnections.provider, opts.provider),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Per-user lookup. Use for Granola and any other PER_USER_PROVIDER. */
export async function getUserIntegration(opts: {
  accountId: string;
  provider: Provider;
  userEmail: string;
}): Promise<IntegrationConnection | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.accountId, opts.accountId),
        eq(integrationConnections.provider, opts.provider),
        eq(integrationConnections.installedByEmail, opts.userEmail),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listAccountIntegrations(opts: {
  accountId: string;
  provider: Provider;
}): Promise<IntegrationConnection[]> {
  const db = await getDb();
  return db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.accountId, opts.accountId),
        eq(integrationConnections.provider, opts.provider),
      ),
    )
    .orderBy(asc(integrationConnections.installedByEmail));
}

export async function upsertIntegration(opts: {
  accountId: string;
  provider: Provider;
  installedByEmail: string;
  scope?: string;
  credentials: Record<string, unknown>;
  accountExternalId?: string;
  metadata?: Record<string, unknown>;
}): Promise<IntegrationConnection> {
  const db = await getDb();
  // Per-user providers key on (accountId, provider, installedByEmail) so a
  // teammate's install doesn't overwrite yours. Account-level providers
  // (HubSpot, Slack) collapse to one row per (accountId, provider).
  const existing = isPerUserProvider(opts.provider)
    ? await getUserIntegration({
        accountId: opts.accountId,
        provider: opts.provider,
        userEmail: opts.installedByEmail,
      })
    : await getIntegration({
        accountId: opts.accountId,
        provider: opts.provider,
      });
  if (existing) {
    const [row] = await db
      .update(integrationConnections)
      .set({
        installedByEmail: opts.installedByEmail,
        scope: opts.scope ?? existing.scope,
        status: "connected",
        credentials: opts.credentials,
        accountExternalId: opts.accountExternalId ?? existing.accountExternalId,
        metadata: opts.metadata ?? existing.metadata,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id))
      .returning();
    return row;
  }
  const id = randomUUID();
  const [row] = await db
    .insert(integrationConnections)
    .values({
      id,
      accountId: opts.accountId,
      provider: opts.provider,
      installedByEmail: opts.installedByEmail,
      scope: opts.scope ?? "account",
      status: "connected",
      credentials: opts.credentials,
      accountExternalId: opts.accountExternalId,
      metadata: opts.metadata,
    })
    .returning();
  return row;
}

export async function disconnectIntegration(opts: {
  accountId: string;
  provider: Provider;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(integrationConnections)
    .where(
      and(
        eq(integrationConnections.accountId, opts.accountId),
        eq(integrationConnections.provider, opts.provider),
      ),
    );
}

export async function listPipelineConfigs(opts: {
  accountId: string;
  provider?: Provider;
}): Promise<IntegrationPipelineConfig[]> {
  const db = await getDb();
  const where = opts.provider
    ? and(
        eq(integrationPipelineConfigs.accountId, opts.accountId),
        eq(integrationPipelineConfigs.provider, opts.provider),
      )
    : eq(integrationPipelineConfigs.accountId, opts.accountId);
  return db
    .select()
    .from(integrationPipelineConfigs)
    .where(where)
    .orderBy(asc(integrationPipelineConfigs.providerPipelineName));
}

export async function upsertPipelineConfig(opts: {
  accountId: string;
  connectionId: string;
  provider: Provider;
  providerPipelineId: string;
  providerPipelineName: string;
  enabled: boolean;
  label?: string | null;
}): Promise<IntegrationPipelineConfig> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.accountId, opts.accountId),
        eq(integrationPipelineConfigs.provider, opts.provider),
        eq(integrationPipelineConfigs.providerPipelineId, opts.providerPipelineId),
      ),
    )
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(integrationPipelineConfigs)
      .set({
        connectionId: opts.connectionId,
        providerPipelineName: opts.providerPipelineName,
        enabled: opts.enabled,
        label: opts.label ?? existing.label,
        updatedAt: new Date(),
      })
      .where(eq(integrationPipelineConfigs.id, existing.id))
      .returning();
    return row;
  }
  const id = randomUUID();
  const [row] = await db
    .insert(integrationPipelineConfigs)
    .values({
      id,
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: opts.provider,
      providerPipelineId: opts.providerPipelineId,
      providerPipelineName: opts.providerPipelineName,
      enabled: opts.enabled,
      label: opts.label ?? null,
    })
    .returning();
  return row;
}

export async function removePipelineConfig(opts: {
  accountId: string;
  id: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.id, opts.id),
        eq(integrationPipelineConfigs.accountId, opts.accountId),
      ),
    );
}

export async function getActivityConfig(opts: {
  accountId: string;
  connectionId: string;
  provider: Provider;
}): Promise<IntegrationActivityConfig | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(integrationActivityConfigs)
    .where(
      and(
        eq(integrationActivityConfigs.accountId, opts.accountId),
        eq(integrationActivityConfigs.connectionId, opts.connectionId),
        eq(integrationActivityConfigs.provider, opts.provider),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertActivityConfig(opts: {
  accountId: string;
  connectionId: string;
  provider: Provider;
  syncEmails?: boolean;
  syncNotes?: boolean;
  associationScope?: "company" | "contact" | "both";
  backfillSince?: Date | null;
}): Promise<IntegrationActivityConfig> {
  const db = await getDb();
  const existing = await getActivityConfig({
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    provider: opts.provider,
  });
  if (existing) {
    const [row] = await db
      .update(integrationActivityConfigs)
      .set({
        syncEmails: opts.syncEmails ?? existing.syncEmails,
        syncNotes: opts.syncNotes ?? existing.syncNotes,
        associationScope: opts.associationScope ?? existing.associationScope,
        backfillSince:
          opts.backfillSince === undefined
            ? existing.backfillSince
            : opts.backfillSince,
        updatedAt: new Date(),
      })
      .where(eq(integrationActivityConfigs.id, existing.id))
      .returning();
    return row;
  }
  const id = randomUUID();
  const [row] = await db
    .insert(integrationActivityConfigs)
    .values({
      id,
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      provider: opts.provider,
      syncEmails: opts.syncEmails ?? false,
      syncNotes: opts.syncNotes ?? false,
      associationScope: opts.associationScope ?? "both",
      backfillSince: opts.backfillSince ?? null,
    })
    .returning();
  return row;
}
