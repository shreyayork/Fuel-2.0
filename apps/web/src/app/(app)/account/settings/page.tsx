import { AccountLayout } from "@/components/views/AccountLayout";
import { AccountSettingsTab } from "@/components/views/AccountSettingsTab";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { getCompany } from "@/lib/fuel-data";
import { catalogToCompanyDoc, getCatalogCompany, isCatalogUuid } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";

  // Resolve the saved primary-company uuid to {uuid, name, domain, logoUrl}
  // for the read-only Features chip. cat_-prefixed ids route through the
  // catalog table; everything else through fuel-data.
  let primaryCompany: { uuid: string; name: string; domain: string | null; logoUrl: string | null } | null = null;
  if (account.primaryCompanyUuid) {
    if (isCatalogUuid(account.primaryCompanyUuid)) {
      const row = await getCatalogCompany(account.primaryCompanyUuid);
      if (row && row.accountId === account.id) {
        const doc = catalogToCompanyDoc(row);
        primaryCompany = {
          uuid: doc.uuid,
          name: doc.name,
          domain: doc.domain ?? null,
          logoUrl: doc.logoUrl ?? null,
        };
      }
    } else {
      const doc = await getCompany(account.primaryCompanyUuid);
      if (doc) {
        primaryCompany = {
          uuid: doc.uuid,
          name: doc.name,
          domain: doc.domain ?? null,
          logoUrl: doc.logoUrl ?? null,
        };
      }
    }
  }

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <AccountSettingsTab account={account} primaryCompany={primaryCompany} />
    </AccountLayout>
  );
}
