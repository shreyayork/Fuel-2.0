import { notFound } from "next/navigation";
import { PipelineViewClient } from "@/components/views/PipelineViewClient";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getIntegration } from "@/lib/integrations";
import { listEnabledPipelinesWithCompanies } from "@/lib/pipelines";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  // Gated by the account-wide portfolio_manager feature flag.
  if (!account?.portfolioManagerEnabled) notFound();

  const [syncedPipelines, hubspotConn] = account
    ? await Promise.all([
        listEnabledPipelinesWithCompanies({ accountId: account.id }),
        getIntegration({ accountId: account.id, provider: "hubspot" }),
      ])
    : [[], null];
  const hubspotPortalId = hubspotConn?.accountExternalId ?? null;

  return (
    <PipelineViewClient
      syncedPipelines={syncedPipelines.map((p) => ({
        config: {
          id: p.config.id,
          provider: p.config.provider,
          providerPipelineId: p.config.providerPipelineId,
          providerPipelineName: p.config.providerPipelineName,
          label: p.config.label,
          lastSyncAt: p.config.lastSyncAt?.toISOString() ?? null,
          stages:
            (p.config.syncState?.stages as
              | Array<{
                  id: string;
                  label: string;
                  displayOrder: number;
                  probability?: number;
                  isClosed?: boolean;
                  closedStageType?: string;
                }>
              | undefined) ?? [],
          stageOverrides:
            (p.config.syncState?.stageOverrides as
              | Record<string, "shown" | "hidden">
              | undefined) ?? {},
          hubspotPortalId: p.config.provider === "hubspot" ? hubspotPortalId : null,
        },
        companies: p.companies.map((c) => ({
          id: c.id,
          providerDealId: c.providerDealId,
          providerPipelineStageId: c.providerPipelineStageId,
          companyName: c.companyName,
          companyDomain: c.companyDomain,
          companyIndustry: c.companyIndustry,
          dealName: c.dealName,
          dealAmount: c.dealAmount,
          dealCloseDate: c.dealCloseDate?.toISOString() ?? null,
          fuelDataUuid: c.fuelDataUuid,
        })),
        stageCounts: p.stageCounts,
      }))}
    />
  );
}
