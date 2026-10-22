import type { InvestorCompanyRef } from "./investor/investorData.ts";

export const FUEL_OPEN_ADVISOR_PROFILE_EVENT = "fuel-open-advisor-fuel-profile";

export type FuelPublicProfileOpenDetail = {
  advisorId?: string;
  advisorName?: string;
  companyId?: string;
  companyName?: string;
};

function openFuelPublicProfile(detail: FuelPublicProfileOpenDetail) {
  window.dispatchEvent(new CustomEvent<FuelPublicProfileOpenDetail>(FUEL_OPEN_ADVISOR_PROFILE_EVENT, {
    detail,
  }));
}

export function advisorFirmInvestorRef(advisorId: string, advisorName: string): InvestorCompanyRef | null {
  const name = advisorName.trim();
  if (advisorId === "york-ie" || name.toLowerCase() === "york ie") {
    return {
      id: "york-ie",
      name: "york-ie",
      displayName: "York IE",
      domain: "york.ie",
      logo: "Y",
      logoBg: "#00B48A",
      meta: "Manchester, NH, US · 51–200",
      headquarters: "Manchester, NH, US",
      employees: "51–200",
      linkedin: "",
      onFuel: true,
    };
  }
  if (!name) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "advisor-firm";
  return {
    id: advisorId.trim() || `advisor-firm-${slug}`,
    name: slug,
    displayName: name,
    domain: "",
    logo: name.slice(0, 1).toUpperCase(),
    logoBg: "#2A5C8C",
    meta: "",
    headquarters: "",
    employees: "",
    linkedin: "",
    onFuel: true,
  };
}

export function openAdvisorFuelPublicProfile(advisorId: string, advisorName: string) {
  openFuelPublicProfile({ advisorId, advisorName });
}

export function openCompanyFuelPublicProfile(companyId: string, companyName: string) {
  openFuelPublicProfile({ companyId, companyName });
}
