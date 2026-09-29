import { YORK_HELP_CTA_URL } from "@/lib/york-help/constants";
import { appBaseUrl } from "./light-layout";

export const SERVICES_REQUEST_URL = YORK_HELP_CTA_URL;

export function overviewBenchmarkUrl(companyUuid: string): string {
  const q = new URLSearchParams({ tab: "overview", benchmark: "1" });
  return `${appBaseUrl()}/company/${encodeURIComponent(companyUuid)}?${q.toString()}`;
}

export function overviewUrl(companyUuid: string): string {
  const q = new URLSearchParams({ tab: "overview" });
  return `${appBaseUrl()}/company/${encodeURIComponent(companyUuid)}?${q.toString()}`;
}

export function intelligenceUrl(companyUuid: string): string {
  const q = new URLSearchParams({ tab: "intelligence" });
  return `${appBaseUrl()}/company/${encodeURIComponent(companyUuid)}?${q.toString()}`;
}

export function initiativesUrl(companyUuid: string): string {
  const q = new URLSearchParams({ tab: "initiatives" });
  return `${appBaseUrl()}/company/${encodeURIComponent(companyUuid)}?${q.toString()}`;
}

export function integrationsUrl(): string {
  return `${appBaseUrl()}/account/integrations`;
}

export function portfolioUrl(): string {
  return `${appBaseUrl()}/portfolio`;
}

export function accountCreditsUrl(): string {
  return `${appBaseUrl()}/account`;
}

/** App root — Figma receipt CTA "Open Fuel →". */
export function appHomeUrl(): string {
  return appBaseUrl();
}
