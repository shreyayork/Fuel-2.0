import type { CrunchbaseProfile } from "@/components/onboard/chat/types";

/** Minimal profile when enrichment fails entirely. */
export function minimalCrunchbaseProfile(opts: {
  companyName: string;
  teamSize: string;
  domain: string;
}): CrunchbaseProfile {
  return {
    name: opts.companyName || "My Company",
    description: "",
    stage: "",
    employees: opts.teamSize,
    founded: "",
    location: "",
    totalFunding: "",
    category: "",
    website: opts.domain,
  };
}

function parseEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

export { parseEmailDomain };
