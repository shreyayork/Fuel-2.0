export const COMPANY_INITIATIVE_PAGE_SIZES = [10, 20, 50] as const;
export const ACTIVE_INITIATIVE_EXCLUDED_STATUSES = [
  "draft",
  "suggested",
  "completed",
  "complete",
] as const;
export const COMPLETED_INITIATIVE_STATUSES = ["completed", "complete"] as const;
export const SUGGESTED_INITIATIVE_STATUSES = ["draft", "suggested"] as const;

export function isSuggestedInitiativeStatus(status: string): boolean {
  return (SUGGESTED_INITIATIVE_STATUSES as readonly string[]).includes(status);
}

/** Progress rows are only useful for accepted work, not Review Initiative cards. */
export function initiativeIdsForProgressDetails(
  items: Array<{ id: string; status: string }>,
): string[] {
  return items.filter((item) => !isSuggestedInitiativeStatus(item.status)).map((item) => item.id);
}

/** Review Initiative needs persisted milestones on draft/suggested rows. */
export function initiativeIdsForMilestoneDetails(items: Array<{ id: string }>): string[] {
  return items.map((item) => item.id);
}
export type CompanyInitiativePageSize = (typeof COMPANY_INITIATIVE_PAGE_SIZES)[number];
export type CompanyInitiativePageStatus = "active" | "completed";

export function parseCompanyInitiativePageSize(value: string | null): CompanyInitiativePageSize | null {
  if (value == null || value === "") return 20;
  const parsed = Number(value);
  return (COMPANY_INITIATIVE_PAGE_SIZES as readonly number[]).includes(parsed)
    ? (parsed as CompanyInitiativePageSize)
    : null;
}

export function parseCompanyInitiativeOffset(value: string | null): number | null {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseCompanyInitiativeStatus(
  value: string | null,
): CompanyInitiativePageStatus | null {
  if (value == null || value === "") return "active";
  return value === "active" || value === "completed" ? value : null;
}
