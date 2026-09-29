import "server-only";
import { NextResponse } from "next/server";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getSession } from "@/lib/auth/session";
import type { InitiativeMilestone } from "@/db/schema";
import {
  getCompanyInitiativeWithAdvisors,
  listCompanyInitiativesPage,
  listInitiativeMilestonesForIds,
  listInitiativeProgressForIds,
  type CompanyInitiativeWithAdvisors,
  type InitiativeProgressRow,
} from "@/lib/company-initiatives";
import {
  parseCompanyInitiativeOffset,
  parseCompanyInitiativePageSize,
  parseCompanyInitiativeStatus,
} from "@/lib/company-initiatives-paging";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { serializeYorkHelpForClient } from "@/lib/york-help/catalog-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

function serializeInitiative(
  item: CompanyInitiativeWithAdvisors,
  progressById: Map<string, InitiativeProgressRow[]>,
  milestonesById: Map<string, InitiativeMilestone[]>,
) {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    area: item.area,
    overviewCategoryId: item.overviewCategoryId ?? null,
    description: item.description,
    status: item.status,
    source: item.source ?? null,
    ownerEmail: item.ownerEmail,
    assignees:
      Array.isArray(item.assignees) && item.assignees.length > 0
        ? item.assignees
        : [item.ownerEmail],
    due: item.due,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    advisors: item.advisors,
    progress: progressById.get(item.id) ?? [],
    milestones: (milestonesById.get(item.id) ?? []).map((milestone) => ({
      id: milestone.id,
      label: milestone.label,
      status: milestone.status,
      dueDate: milestone.dueDate,
      note: milestone.note ?? null,
      completedAt: milestone.completedAt?.toISOString() ?? null,
    })),
    intelligenceLinks: Array.isArray(item.intelligenceLinks) ? item.intelligenceLinks : [],
    sourceDocuments: Array.isArray(item.sourceDocuments)
      ? item.sourceDocuments.map((document) => ({
          id: document.id,
          documentVersionId: document.documentVersionId ?? null,
          title: document.title,
          typeLabel: document.typeLabel ?? null,
        }))
      : [],
    sourceRationale: item.sourceRationale ?? null,
    benefit: item.benefit ?? null,
    priority: item.priority ?? null,
    baselineMetric: item.baselineMetric ?? null,
    targetMetric: item.targetMetric ?? null,
    benchmarkCohort: item.benchmarkCohort ?? null,
    yorkHelp: serializeYorkHelpForClient(item.yorkHelp),
    yorkHelpStatus:
      item.yorkHelpStatus === "generating" ||
      item.yorkHelpStatus === "ready" ||
      item.yorkHelpStatus === "failed"
        ? item.yorkHelpStatus
        : "idle",
    yorkHelpDismissed:
      item.yorkHelpDismissForever ||
      (item.yorkHelpDismissedUntil != null &&
        item.yorkHelpDismissedUntil.getTime() > Date.now()),
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  const { uuid } = await ctx.params;
  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await getActiveAccountForUser(email);
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 403 });

  try {
    await assertCompanyDataRoomAccess(account, uuid);
  } catch (error) {
    if (error instanceof DataRoomAccessError) return accessErrorResponse(error);
    captureIntegrationException(error, {
      integration: "database",
      operation: "company_initiatives_access",
      context: { companyUuid: uuid },
    });
    return NextResponse.json({ error: "access_failed" }, { status: 500 });
  }

  const searchParams = new URL(req.url).searchParams;
  const focusId = searchParams.get("id")?.trim() || null;

  try {
    if (focusId) {
      const row = await getCompanyInitiativeWithAdvisors({
        accountId: account.id,
        companyUuid: uuid,
        id: focusId,
      });
      if (!row) {
        return NextResponse.json(
          { data: [], meta: { total: 0, limit: 1, offset: 0, activeTotal: 0, completedTotal: 0 } },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const initiativeIds = [row.id];
      const [progressById, milestonesById] = await Promise.all([
        listInitiativeProgressForIds({
          accountId: account.id,
          companyUuid: uuid,
          initiativeIds,
        }),
        listInitiativeMilestonesForIds({
          accountId: account.id,
          companyUuid: uuid,
          initiativeIds,
        }),
      ]);
      return NextResponse.json(
        {
          data: [serializeInitiative(row, progressById, milestonesById)],
          meta: { total: 1, limit: 1, offset: 0, activeTotal: 1, completedTotal: 0 },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const status = parseCompanyInitiativeStatus(searchParams.get("status"));
    const limit = parseCompanyInitiativePageSize(searchParams.get("limit"));
    const offset = parseCompanyInitiativeOffset(searchParams.get("offset"));
    if (status == null || limit == null || offset == null) {
      return NextResponse.json({ error: "invalid_pagination" }, { status: 400 });
    }

    const page = await listCompanyInitiativesPage({
      accountId: account.id,
      companyUuid: uuid,
      status,
      limit,
      offset,
    });
    const initiativeIds = page.items.map((item) => item.id);
    const [progressById, milestonesById] = await Promise.all([
      listInitiativeProgressForIds({
        accountId: account.id,
        companyUuid: uuid,
        initiativeIds,
      }),
      listInitiativeMilestonesForIds({
        accountId: account.id,
        companyUuid: uuid,
        initiativeIds,
      }),
    ]);

    return NextResponse.json(
      {
        data: page.items.map((item) => serializeInitiative(item, progressById, milestonesById)),
        meta: {
          total: page.total,
          limit: page.limit,
          offset: page.offset,
          activeTotal: page.activeTotal,
          completedTotal: page.completedTotal,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    captureIntegrationException(error, {
      integration: "database",
      operation: "company_initiatives_list",
      context: { companyUuid: uuid, focusId },
    });
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}
