import "server-only";
import { getCatalogCompany } from "@/lib/catalog";
import { getCompany } from "@/lib/fuel-data";

export async function resolveCompanyName(companyUuid: string): Promise<string> {
  const catalog = await getCatalogCompany(companyUuid);
  if (catalog?.name) return catalog.name;
  const company = await getCompany(companyUuid);
  return company?.name ?? "Company";
}
