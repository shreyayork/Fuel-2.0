import { notFound } from "next/navigation";
import { PlaybookDetail } from "@/components/views/PlaybookDetail";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getPlaybookBySlug } from "@/lib/playbooks";
import { getCatalogCompany, isCatalogUuid } from "@/lib/catalog";
import { getCompany } from "@/lib/fuel-data";

export const dynamic = "force-dynamic";

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);
  if (!account) notFound();

  const playbook = await getPlaybookBySlug({ slug, accountId: account.id });
  if (!playbook) notFound();

  // Primary company context — used for KPI benchmark UI and to tag Research
  // artifacts when running any playbook from this page.
  let primaryCompany: { uuid: string; name: string } | null = null;
  if (account.primaryCompanyUuid) {
    if (isCatalogUuid(account.primaryCompanyUuid)) {
      const company = await getCatalogCompany(account.primaryCompanyUuid);
      if (company?.accountId === account.id) {
        primaryCompany = { uuid: company.id, name: company.name };
      }
    } else {
      const company = await getCompany(account.primaryCompanyUuid);
      if (company) {
        primaryCompany = { uuid: company.uuid, name: company.name };
      }
    }
  }

  return (
    <PlaybookDetail
      primaryCompany={primaryCompany}
      playbook={{
        id: playbook.id,
        slug: playbook.slug,
        title: playbook.title,
        description: playbook.description,
        content: playbook.content,
        category: playbook.category,
        subcategory: playbook.subcategory,
        visibility: playbook.visibility,
        tags: playbook.tags ?? null,
        targetKind: playbook.targetKind,
        mode: playbook.mode,
        authorEmail: playbook.authorEmail,
        updatedAt: playbook.updatedAt.toISOString(),
      }}
    />
  );
}
