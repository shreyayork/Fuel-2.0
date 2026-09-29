import { Suspense } from "react";
import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { RecordCompanyVisit } from "@/components/RecordCompanyVisit";
import { RouteLoading } from "@/components/RouteLoading";
import { CompanyPageBody } from "@/components/company/CompanyPageBody";
import { getCompany, getCompanyByDomain, type CompanyDoc } from "@/lib/fuel-data";
import { resolveCompanyLogoUrl } from "@/lib/company-logo";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser, isClaimedCompanyProfile } from "@/lib/accounts";
import { catalogToCompanyDoc, getCatalogCompany, isCatalogUuid } from "@/lib/catalog";
import { resolveCompanyTabForClaim } from "@/lib/company-tabs";
import {
  COMPANY_PAGE_TABS,
  loadCompanyPageData,
  resolveCompanyPageTab,
} from "@/lib/company-page-data";

export const dynamic = "force-dynamic";

async function resolveEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  return session?.email ?? "mike@york.ie";
}

/** When claim omitted logoUrl, recover mark from fuel-data by domain. */
async function withFuelDataLogo(company: CompanyDoc): Promise<CompanyDoc> {
  if (company.logoUrl?.trim() || !company.domain) return company;
  try {
    const hit = await getCompanyByDomain(company.domain);
    if (!hit) return company;
    const logoUrl = resolveCompanyLogoUrl(hit.uuid, hit.logoUrl);
    return logoUrl ? { ...company, logoUrl } : company;
  } catch (error) {
    Sentry.setTag("operation", "catalog_logo_recover");
    Sentry.captureException(error);
    return company;
  }
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{
    cohort?: string;
    cta?: string;
    first?: string;
    tab?: string;
    initiativeId?: string;
  }>;
}) {
  const { uuid } = await params;
  const {
    cohort: cohortParam,
    cta: ctaParam,
    first: firstParam,
    tab: tabParam,
    initiativeId: initiativeIdParam,
  } = await searchParams;
  const email = await resolveEmail();
  const account = await getActiveAccountForUser(email);
  const isFounderHome = isClaimedCompanyProfile(account, uuid);
  const tab = resolveCompanyTabForClaim(
    resolveCompanyPageTab(tabParam),
    isFounderHome,
  );

  let catalogRow: Awaited<ReturnType<typeof getCatalogCompany>> = null;
  let company: CompanyDoc;

  if (isCatalogUuid(uuid)) {
    // Catalog rows are account-scoped — never fall through to OpenSearch.
    if (!account) notFound();
    const row = await getCatalogCompany(uuid);
    catalogRow = row && row.accountId === account.id ? row : null;
    if (!catalogRow) notFound();
    company = await withFuelDataLogo(catalogToCompanyDoc(catalogRow));
  } else {
    const hit = await getCompany(uuid);
    if (!hit) notFound();
    company = hit;
  }

  const onCompanyPublicTab =
    tabParam != null && (COMPANY_PAGE_TABS as readonly string[]).includes(tabParam);

  const detailsPromise = loadCompanyPageData({
    uuid,
    email,
    account,
    company,
    catalogRow,
    tab,
    cohortParam,
    ctaParam,
    firstParam,
    focusInitiativeId: initiativeIdParam,
    isFounderHome,
    onCompanyPublicTab,
  });

  return (
    <>
      {account && account.primaryCompanyUuid !== uuid ? (
        <RecordCompanyVisit
          uuid={uuid}
          name={company.name}
          accountId={account.id}
          domain={company.domain}
          logoUrl={company.logoUrl}
        />
      ) : null}
      <Suspense fallback={<RouteLoading label="Loading company…" />}>
        <CompanyPageBody promise={detailsPromise} />
      </Suspense>
    </>
  );
}
