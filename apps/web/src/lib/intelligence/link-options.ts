import "server-only";
import { listObservationsForCompanyWithSignal } from "@/lib/observations";
import { mergeIntelligenceLinkOptions } from "./link-options-merge";
import { listIntelligenceForCompany } from "./queries";
import type { CompanyIntelligenceRow } from "./types";

export { mergeIntelligenceLinkOptions, observationToIntelligenceLinkRow } from "./link-options-merge";

export async function listIntelligenceLinkOptionsForCompany(opts: {
  accountId: string;
  companyUuid: string;
  limit?: number;
}): Promise<CompanyIntelligenceRow[]> {
  const limit = opts.limit ?? 500;
  const [intelligence, observations] = await Promise.all([
    listIntelligenceForCompany({ ...opts, limit }),
    listObservationsForCompanyWithSignal({ ...opts, limit }),
  ]);
  return mergeIntelligenceLinkOptions(intelligence, observations);
}
