"use client";

import { useEffect } from "react";
import { recordRecentCompany } from "@/lib/recent-companies";

export function RecordCompanyVisit({
  uuid,
  name,
  accountId,
  domain,
  logoUrl,
}: {
  uuid: string;
  name: string;
  accountId: string;
  domain?: string;
  logoUrl?: string;
}) {
  useEffect(() => {
    void recordRecentCompany({ uuid, name, accountId, domain, logoUrl });
  }, [uuid, name, accountId, domain, logoUrl]);
  return null;
}
