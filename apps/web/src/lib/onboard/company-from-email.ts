import { parseEmailDomain } from "@/lib/onboard/map-enrichment-to-profile";

export function domainFromEmail(email: string): string {
  return parseEmailDomain(email);
}
