import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { catalogCompanies, companyIntelligence, companyInitiatives } from "@/db/schema";
import { listDataRoomSnapshot } from "@/lib/data-room/queries";
import { resolveDisplayCompanyDomain } from "@/lib/onboard/company-domain";
import { getLatestSubmittedForCompany } from "@/lib/portfolio-updates";
import { loadOverviewCohortContext } from "./cohort";
import { loadMergedAnswers } from "./map-input";
import { loadBenchmarkDrawerPayload } from "./form-payload";
import { generateBriefAnalysis } from "./brief-analysis";
import {
  buildHeadquarters,
  buildOperatingGroups,
  buildSnapshotRows,
  buildWikiReferences,
  categoryPillars,
  cohortLabelFromKey,
  estimateRunwayMonths,
  reportDateLabel,
  sampleDetailAnswers,
  snapshotFingerprint,
  trackCompletionPct,
} from "./full-summary-assemble";
import type { OverviewCategoryId } from "./constants";
import type {
  FullSummaryInitiative,
  FullSummaryPayload,
  FullSummaryProfileMeta,
} from "./full-summary-types";
import { CATEGORY_META, isOverviewCategoryId } from "./constants";
import type { OverviewBenchmarkDrawerPayload } from "./types";

function mapAreaToPillar(area: string | null | undefined): OverviewCategoryId | null {
  if (!area) return null;
  const normalized = area.toLowerCase();
  if (normalized === "product" || normalized === "dev") return "dev";
  if (normalized === "gtm" || normalized === "mkt" || normalized === "marketing") return "mkt";
  if (
    normalized === "finance" ||
    normalized === "rev" ||
    normalized === "ops" ||
    normalized === "people"
  ) {
    return "rev";
  }
  return null;
}

export async function loadFullSummaryPayload(opts: {
  accountId: string;
  companyUuid: string;
  companyName: string;
}): Promise<FullSummaryPayload> {
  const db = await getDb();
  const { cohortKey, benchmarkRows, allCohorts } = await loadOverviewCohortContext(opts.companyUuid);

  const [answers, benchmarkDrawerRaw, catalog, latestUpdate, intelRows, initiativeRows, dataRoom] =
    await Promise.all([
      loadMergedAnswers({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
      }),
      loadBenchmarkDrawerPayload({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        cohortKey,
        benchmarkRows,
        allCohorts,
      }),
      db
        .select({
          name: catalogCompanies.name,
          domain: catalogCompanies.domain,
          website: catalogCompanies.website,
          industry: catalogCompanies.industry,
          employeeCount: catalogCompanies.employeeCount,
          locationCity: catalogCompanies.locationCity,
          locationState: catalogCompanies.locationState,
          locationCountry: catalogCompanies.locationCountry,
          shortDescription: catalogCompanies.shortDescription,
        })
        .from(catalogCompanies)
        .where(
          and(
            eq(catalogCompanies.id, opts.companyUuid),
            eq(catalogCompanies.accountId, opts.accountId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null),
      getLatestSubmittedForCompany({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
      }),
      db
        .select({
          headline: companyIntelligence.headline,
          summary: companyIntelligence.summary,
        })
        .from(companyIntelligence)
        .where(
          and(
            eq(companyIntelligence.accountId, opts.accountId),
            eq(companyIntelligence.companyUuid, opts.companyUuid),
          ),
        )
        .orderBy(desc(companyIntelligence.createdAt))
        .limit(12),
      db
        .select({
          id: companyInitiatives.id,
          name: companyInitiatives.name,
          description: companyInitiatives.description,
          status: companyInitiatives.status,
          due: companyInitiatives.due,
          ownerEmail: companyInitiatives.ownerEmail,
          area: companyInitiatives.area,
          overviewCategoryId: companyInitiatives.overviewCategoryId,
        })
        .from(companyInitiatives)
        .where(
          and(
            eq(companyInitiatives.accountId, opts.accountId),
            eq(companyInitiatives.companyUuid, opts.companyUuid),
          ),
        ),
      listDataRoomSnapshot({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
      }),
    ]);

  const benchmarkDrawer = benchmarkDrawerRaw as OverviewBenchmarkDrawerPayload;

  const companyName = catalog?.name?.trim() || opts.companyName;
  const profileMeta: FullSummaryProfileMeta = {
    sector: catalog?.industry?.trim() || null,
    headquarters: buildHeadquarters(catalog ?? {}),
    employees: catalog?.employeeCount?.trim() || null,
    domain:
      resolveDisplayCompanyDomain({
        website: catalog?.website,
        domain: catalog?.domain,
      }) ?? null,
  };

  const productDescription =
    answers.profile_product_description?.trim() ||
    catalog?.shortDescription?.trim() ||
    null;
  const topPriorities = answers.profile_top_priorities?.trim() || null;
  const biggestRisk = answers.profile_biggest_risk?.trim() || null;
  const publicDataCorrections = answers.profile_public_data_wrong?.trim() || null;

  const snapshotRows = buildSnapshotRows(benchmarkDrawer);
  const cashRaw = benchmarkDrawer?.values.cashOnHand?.trim() || null;
  const burnRaw = benchmarkDrawer?.values.monthlyBurn?.trim() || null;
  const cashRow = snapshotRows.find((r) => r.id === "cashOnHand");
  const burnRow = snapshotRows.find((r) => r.id === "monthlyBurn");
  const runwayMonths = estimateRunwayMonths(cashRaw, burnRaw);

  const operatingGroups = buildOperatingGroups(answers);

  const mappedInitiatives: FullSummaryInitiative[] = initiativeRows.flatMap((row) => {
    const pillarFromOverview = row.overviewCategoryId;
    const pillar =
      (pillarFromOverview && isOverviewCategoryId(pillarFromOverview)
        ? pillarFromOverview
        : null) ?? mapAreaToPillar(row.area);
    if (!pillar) return [];
    const status = (row.status ?? "active").toLowerCase();
    if (status === "draft" || status === "suggested") return [];
    return [
      {
        id: row.id,
        title: row.name,
        description: row.description,
        status: row.status ?? "active",
        due: row.due,
        owner: row.ownerEmail,
        pillar,
      },
    ];
  });

  const documents = dataRoom.slots
    .filter((slot) => slot.current?.name)
    .map((slot) => ({
      typeId: slot.typeId,
      typeLabel: slot.typeLabel,
      name: slot.current!.name,
    }));

  const detailSnippets = sampleDetailAnswers(answers, 2).map((s) => ({
    label: s.label,
    value: s.value,
  }));

  const references = buildWikiReferences({
    profileMeta,
    productDescription,
    snapshotRows,
    intelligence: intelRows.map((r) => ({
      headline: r.headline,
      summary: r.summary,
    })),
    documents,
    detailSnippets,
    challenges: latestUpdate?.challenges ?? null,
  });

  const period = benchmarkDrawer?.period || latestUpdate?.period || "current";
  const cohortLabel = cohortLabelFromKey(cohortKey ?? benchmarkDrawer?.cohortKey ?? null);
  const fingerprint = snapshotFingerprint(snapshotRows);

  const analysisInput = {
    company: {
      name: companyName,
      sector: profileMeta.sector ?? undefined,
      headquarters: profileMeta.headquarters ?? undefined,
      teamSize: profileMeta.employees ?? undefined,
      domain: profileMeta.domain ?? undefined,
      productDescription: productDescription ?? undefined,
      topPriorities: topPriorities ?? undefined,
      biggestRisk: biggestRisk ?? undefined,
      publicDataCorrections: publicDataCorrections ?? undefined,
    },
    period,
    cohort: {
      label: cohortLabel,
      description: "Peer set used for percentile comparison",
    },
    snapshot: {
      metrics: snapshotRows.map((row) => ({
        key: row.id,
        label: row.label,
        value: row.you,
        band: row.band,
        tier: row.tier,
        percentiles: {
          p25: row.p25,
          p50: row.p50,
          p75: row.p75,
          p90: row.p90,
        },
      })),
      runwayMonths: runwayMonths != null ? Math.round(runwayMonths) : undefined,
      cashOnHand: cashRow?.you,
      monthlyBurn: burnRow?.you,
    },
    founderNarrative: {
      notableCustomers: latestUpdate?.notableCustomers ?? undefined,
      notableHires: latestUpdate?.notableHires ?? undefined,
      biggestChallenges: latestUpdate?.challenges ?? undefined,
      otherUpdates: latestUpdate?.otherUpdates ?? undefined,
    },
    trackContext: {
      rdCompletionPct: trackCompletionPct(answers, "dev"),
      gtmCompletionPct: trackCompletionPct(answers, "mkt"),
      gaCompletionPct: trackCompletionPct(answers, "rev"),
      sampleDetailAnswers: sampleDetailAnswers(answers, 6),
    },
  };

  let analysis = null;
  let analysisStatus: FullSummaryPayload["analysisStatus"] = "skipped";
  let analysisError: string | null = null;

  if (snapshotRows.length > 0) {
    const result = await generateBriefAnalysis({
      companyUuid: opts.companyUuid,
      period,
      fingerprint,
      input: analysisInput,
    });
    analysis = result.analysis;
    analysisError = result.error;
    analysisStatus = result.analysis ? "ready" : "error";
  }

  return {
    companyName,
    reportDate: reportDateLabel(),
    period,
    cohortLabel,
    profileMeta,
    productDescription,
    topPriorities,
    biggestRisk,
    publicDataCorrections,
    snapshotRows,
    cashOnHand: cashRow
      ? { display: cashRow.you, colour: cashRow.colour }
      : null,
    monthlyBurn: burnRow
      ? { display: burnRow.you, colour: burnRow.colour }
      : null,
    runwayMonths: runwayMonths != null ? Math.round(runwayMonths) : null,
    operatingGroups,
    initiatives: mappedInitiatives,
    documents,
    references,
    analysis,
    analysisStatus,
    analysisError,
    categories: categoryPillars().map((c) => ({
      ...c,
      fullLabel: CATEGORY_META[c.categoryId].fullLabel,
    })),
  };
}
