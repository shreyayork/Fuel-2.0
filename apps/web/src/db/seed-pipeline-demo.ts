/**
 * Local demo pipeline data for /pipeline testing (search, kanban, close dates).
 * No real HubSpot connection — static deals only.
 *
 * All rows use the `demo_pipeline_` id prefix. Remove with:
 *   npm run db:unseed:pipeline-demo --workspace=apps/web
 *
 * Run:
 *   npm run db:seed:pipeline-demo --workspace=apps/web
 *   npm run db:seed:pipeline-demo --workspace=apps/web -- --email=you@company.com
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb, getPool } from "./client";
import {
  DEMO_CONFIG_ID,
  DEMO_CONNECTION_ID,
  DEMO_HUBSPOT_PORTAL_ID,
  DEMO_PIPELINE_DEALS,
  DEMO_PIPELINE_PREFIX,
  DEMO_PROVIDER_PIPELINE_ID,
  DEMO_STAGES,
} from "./pipeline-demo-fixture";
import {
  accountMembers,
  accounts,
  integrationConnections,
  integrationPipelineConfigs,
  pipelineCompanies,
} from "./schema";

function parseEmail(): string | null {
  const flag = process.argv.find((a) => a.startsWith("--email="));
  if (flag) return flag.slice("--email=".length).trim().toLowerCase();
  const env = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  return env || null;
}

function parseAccountId(): string | null {
  const flag = process.argv.find((a) => a.startsWith("--account-id="));
  if (flag) return flag.slice("--account-id=".length).trim();
  return null;
}

async function main() {
  const email = parseEmail();
  const accountIdArg = parseAccountId();
  const db = await getDb();

  let accountId: string;
  let resolvedEmail: string;

  if (accountIdArg) {
    accountId = accountIdArg;
    const [member] = await db
      .select({ userEmail: accountMembers.userEmail })
      .from(accountMembers)
      .where(eq(accountMembers.accountId, accountIdArg))
      .limit(1);
    resolvedEmail = member?.userEmail ?? email ?? "demo@local.dev";
  } else {
    const members = await db
      .select({
        accountId: accountMembers.accountId,
        userEmail: accountMembers.userEmail,
      })
      .from(accountMembers);

    if (members.length === 0) {
      throw new Error("No accounts in DB. Sign in / complete onboard first.");
    }

    const targetEmail = email ?? members[0].userEmail;
    const membership = members.find((m) => m.userEmail === targetEmail);

    if (!membership) {
      const available = [...new Set(members.map((m) => m.userEmail))].join(", ");
      throw new Error(
        `No account for ${targetEmail}. Pass --email=your@address.com\nKnown members: ${available}`,
      );
    }

    accountId = membership.accountId;
    resolvedEmail = membership.userEmail;
  }
  const now = new Date();

  await db.transaction(async (tx) => {
    // Idempotent re-run: drop prior demo rows (cascade removes config + deals).
    await tx
      .delete(integrationConnections)
      .where(eq(integrationConnections.id, DEMO_CONNECTION_ID));

    await tx
      .update(accounts)
      .set({ portfolioManagerEnabled: true, updatedAt: now })
      .where(eq(accounts.id, accountId));

    await tx.insert(integrationConnections).values({
      id: DEMO_CONNECTION_ID,
      accountId,
      provider: "hubspot",
      installedByEmail: resolvedEmail,
      scope: "account",
      status: "connected",
      credentials: { demo: true },
      accountExternalId: DEMO_HUBSPOT_PORTAL_ID,
      metadata: { source: "pipeline-demo-seed" },
      installedAt: now,
      updatedAt: now,
      lastSyncAt: now,
    });

    await tx.insert(integrationPipelineConfigs).values({
      id: DEMO_CONFIG_ID,
      accountId,
      connectionId: DEMO_CONNECTION_ID,
      provider: "hubspot",
      providerPipelineId: DEMO_PROVIDER_PIPELINE_ID,
      providerPipelineName: "Demo Pipeline",
      label: "Demo Pipeline",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      lastSyncAt: now,
      syncState: {
        stages: DEMO_STAGES.map((s) => ({
          id: s.id,
          label: s.label,
          displayOrder: s.displayOrder,
          probability: s.probability,
          isClosed: false,
        })),
        stageOverrides: {},
        demo: true,
      },
    });

    await tx.insert(pipelineCompanies).values(
      DEMO_PIPELINE_DEALS.map((d) => ({
        id: d.id,
        accountId,
        pipelineConfigId: DEMO_CONFIG_ID,
        provider: "hubspot" as const,
        providerDealId: d.providerDealId,
        providerCompanyId: null,
        providerPipelineId: DEMO_PROVIDER_PIPELINE_ID,
        providerPipelineStageId: d.stageId,
        companyName: d.companyName,
        companyDomain: d.companyDomain,
        companyDomains: [d.companyDomain],
        companyIndustry: d.companyIndustry,
        dealName: d.dealName,
        dealAmount: d.dealAmount,
        dealCloseDate: new Date(`${d.dealCloseDate}T12:00:00.000Z`),
        fuelDataUuid: null,
        firstSeenAt: now,
        lastSeenAt: now,
        updatedAt: now,
      })),
    );
  });

  const pool = await getPool();
  await pool.end();

  console.log(
    `Seeded demo pipeline for account ${accountId} (${resolvedEmail}): ${DEMO_PIPELINE_DEALS.length} deals across ${DEMO_STAGES.length} stages.`,
  );
  console.log(`Prefix: ${DEMO_PIPELINE_PREFIX}* — remove with npm run db:unseed:pipeline-demo --workspace=apps/web`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
