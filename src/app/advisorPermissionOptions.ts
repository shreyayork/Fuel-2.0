import type { AdvisorConnectionPermissions } from "./advisorConnectionStorage.ts";

export const ADVISOR_PERMISSION_OPTIONS: Array<{
  key: keyof AdvisorConnectionPermissions;
  title: string;
  description: string;
}> = [
  {
    key: "sharedProfile",
    title: "Company profile",
    description: "Company details, stage, industry, team size, and public profile information.",
  },
  {
    key: "approvedBenchmarks",
    title: "Approved benchmark metrics",
    description: "Only benchmark values the company has entered and approved for sharing.",
  },
  {
    key: "sharedIntelligence",
    title: "Shared intelligence and updates",
    description: "Company updates and intelligence items explicitly marked as shared.",
  },
  {
    key: "sharedInitiatives",
    title: "Shared initiative progress",
    description: "Status and progress for initiatives explicitly shared with this advisor.",
  },
  {
    key: "sharedDataRoomFiles",
    title: "Selected data room files",
    description: "Only files explicitly selected for this advisor; all other data room files stay private.",
  },
  {
    key: "sharedPublishedBrief",
    title: "Published company brief",
    description: "The company brief currently published for approved advisors.",
  },
];

export function summarizeAdvisorPermissions(permissions: AdvisorConnectionPermissions): string {
  const labels = ADVISOR_PERMISSION_OPTIONS
    .filter(option => permissions[option.key])
    .map(option => option.title.toLowerCase());
  return labels.length > 0 ? labels.join(", ") : "nothing selected yet";
}
