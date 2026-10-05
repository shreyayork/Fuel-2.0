import { FounderFirstRun } from "@/components/founder/FounderFirstRun";
import { CompanyPublicView } from "@/components/views/CompanyPublicView";
import type { CompanyPageData } from "@/lib/company-page-data";
import { serializePortfolioUpdate } from "@/lib/company-page-data";
import { serializeYorkHelpForClient } from "@/lib/york-help/catalog-data";

export async function CompanyPageBody({
  promise,
}: {
  promise: Promise<CompanyPageData>;
}) {
  const data = await promise;
  const {
    uuid,
    email,
    account,
    company,
    catalogRow,
    isFounderHome,
    cta,
    firstSession,
    founderPlaybook,
    resolvedCohort,
    privateItems,
    artifacts,
    updateHistory,
    currentUpdate,
    cohorts,
    watchlistMemberships,
    companyAdvisors,
    allAdvisors,
    companyObservations,
    companyInitiatives,
    createdBriefSuggestionKeysByArtifact,
    initiativeProgressById,
    initiativeMilestonesById,
    availablePlaybooks,
    signalCatalog,
    observationsByItem,
    benchmarkRows,
    period,
    dataRoom,
    companyIntelligence,
    creditBalance,
    artifactCount,
    initiativeCount,
    overviewInitial,
  } = data;

  const founderFirstRun =
    cta && firstSession ? (
      <FounderFirstRun
        cta={cta}
        first={firstSession}
        companyUuid={uuid}
        companyName={company.name}
        playbook={founderPlaybook}
      />
    ) : null;

  return (
    <>
      {founderFirstRun}
      <CompanyPublicView
        isFounderHome={isFounderHome}
        company={company}
        userEmail={email}
        isCatalogCompany={catalogRow != null}
        catalogBusinessModel={catalogRow?.businessModel ?? null}
        privateContext={privateItems.map((i) => {
          const obs = observationsByItem.get(i.id) ?? [];
          const attachments = i.attachments as Array<unknown> | null;
          return {
            id: i.id,
            kind: i.kind,
            title: i.title,
            content: i.content,
            authorEmail: i.authorEmail,
            source: i.source,
            occurredAt: i.occurredAt.toISOString(),
            attachmentCount: Array.isArray(attachments) ? attachments.length : 0,
            observations: obs.map((o) => ({
              id: o.id,
              signalId: o.signalId,
              signalLabel: o.signal.label,
              signalKind: o.signal.kind,
              signalUnit: o.signal.unit,
              period: o.period,
              valueNumeric: o.valueNumeric,
              valueText: o.valueText,
              valueBool: o.valueBool,
              confidence: o.confidence,
              rawSnippet: o.rawSnippet,
            })),
          };
        })}
        artifacts={artifacts.map((a) => ({
          id: a.id,
          kind: a.kind,
          title: a.title,
          content: a.content,
          authorEmail: a.authorEmail,
          createdAt: a.createdAt.toISOString(),
        }))}
        createdBriefSuggestionKeysByArtifact={createdBriefSuggestionKeysByArtifact}
        watchlistMemberships={watchlistMemberships}
        portfolioManagerEnabled={account?.portfolioManagerEnabled ?? false}
        advisors={companyAdvisors.map((link) => ({
          advisorId: link.advisor.id,
          name: link.advisor.name,
          title: link.advisor.title,
          company: link.advisor.company,
          photoUrl: link.advisor.photoUrl,
          expertise: link.advisor.expertise,
          role: link.role,
          publicCard: link.advisor.publicCard,
        }))}
        advisorPool={allAdvisors.map((a) => ({
          id: a.id,
          name: a.name,
          title: a.title,
          company: a.company,
          photoUrl: a.photoUrl,
        }))}
        availablePlaybooks={availablePlaybooks.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          description: p.description,
          category: p.category,
          subcategory: p.subcategory,
          targetKind: p.targetKind as "company" | "deal" | "pipeline" | null,
          content: p.content,
        }))}
        initiatives={companyInitiatives.map((i) => {
          const progress = initiativeProgressById.get(i.id) ?? [];
          const milestones = initiativeMilestonesById.get(i.id) ?? [];
          return {
            id: i.id,
            kind: i.kind,
            name: i.name,
            area: i.area,
            overviewCategoryId: i.overviewCategoryId ?? null,
            description: i.description,
            status: i.status,
            source: i.source ?? null,
            ownerEmail: i.ownerEmail,
            assignees:
              Array.isArray(i.assignees) && i.assignees.length > 0
                ? i.assignees
                : [i.ownerEmail],
            due: i.due,
            createdAt: i.createdAt.toISOString(),
            updatedAt: i.updatedAt.toISOString(),
            advisors: i.advisors,
            progress,
            milestones: milestones.map((m) => ({
              id: m.id,
              label: m.label,
              status: m.status,
              dueDate: m.dueDate,
              note: m.note ?? null,
              completedAt: m.completedAt ? m.completedAt.toISOString() : null,
            })),
            intelligenceLinks: Array.isArray(i.intelligenceLinks)
              ? i.intelligenceLinks
              : [],
            sourceDocuments: Array.isArray(i.sourceDocuments)
              ? i.sourceDocuments.map((d) => ({
                  id: d.id,
                  documentVersionId: d.documentVersionId ?? null,
                  title: d.title,
                  typeLabel: d.typeLabel ?? null,
                }))
              : [],
            sourceRationale: i.sourceRationale ?? null,
            benefit: i.benefit ?? null,
            priority: i.priority ?? null,
            baselineMetric: i.baselineMetric ?? null,
            targetMetric: i.targetMetric ?? null,
            benchmarkCohort: i.benchmarkCohort ?? null,
            yorkHelp: serializeYorkHelpForClient(i.yorkHelp),
            yorkHelpStatus:
              i.yorkHelpStatus === "generating" ||
              i.yorkHelpStatus === "ready" ||
              i.yorkHelpStatus === "failed"
                ? i.yorkHelpStatus
                : "idle",
            yorkHelpDismissed:
              i.yorkHelpDismissForever ||
              (i.yorkHelpDismissedUntil != null &&
                i.yorkHelpDismissedUntil.getTime() > Date.now()),
          };
        })}
        signalObservations={companyObservations.map((o) => ({
          id: o.id,
          signalId: o.signalId,
          signalLabel: o.signal.label,
          signalCategory: o.signal.category,
          signalKind: o.signal.kind,
          signalUnit: o.signal.unit,
          period: o.period,
          valueNumeric: o.valueNumeric,
          valueText: o.valueText,
          valueBool: o.valueBool,
          confidence: o.confidence,
          rawSnippet: o.rawSnippet,
          contextItemId: o.contextItemId,
          createdAt: o.createdAt.toISOString(),
        }))}
        signalCatalog={signalCatalog.map((s) => ({
          id: s.id,
          label: s.label,
          category: s.category,
          kind: s.kind,
          unit: s.unit,
        }))}
        currentPeriod={period}
        privateMetrics={{
          period,
          current: currentUpdate ? serializePortfolioUpdate(currentUpdate) : null,
          history: updateHistory.map(serializePortfolioUpdate),
          benchmarks: {
            cohortKey: resolvedCohort,
            rows: benchmarkRows.map((b) => ({
              metric: b.metric,
              p25: b.p25,
              p50: b.p50,
              p75: b.p75,
              p90: b.p90,
              unit: b.unit,
              invertedGood: b.invertedGood,
            })),
            allCohorts: cohorts.map((c) => ({
              cohortKey: c.cohortKey,
              dimensions: c.dimensions,
              sampleSize: c.sampleSize,
            })),
          },
        }}
        dataRoom={dataRoom}
        companyIntelligence={companyIntelligence}
        creditBalance={creditBalance}
        artifactCount={artifactCount}
        initiativeCount={initiativeCount}
        overviewInitial={overviewInitial}
      />
    </>
  );
}
