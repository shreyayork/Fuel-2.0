"use client";

import { useEffect, useState } from "react";
import {
  YORK_COMPANY_WIDE_OFFER_ID,
  yorkSidebarCopy,
} from "@/lib/york-partner";
import { YorkPartnerNudge, useYorkOfferHidden } from "./YorkPartnerNudge";

/** Design SidebarYorkReachOut — brief settle after first shell paint. */
const SIDEBAR_PARTNER_SETTLE_MS = 2800;

/**
 * Survive AppShell/Shell remounts on soft nav (force-dynamic layout refresh).
 * Without this, every route change restarts the settle timer and the banner blinks.
 */
let sidebarPartnerSettled = false;
let sidebarPartnerSettlePromise: Promise<void> | null = null;

function waitForSidebarPartnerSettle(): Promise<void> {
  if (sidebarPartnerSettled) return Promise.resolve();
  if (!sidebarPartnerSettlePromise) {
    sidebarPartnerSettlePromise = new Promise((resolve) => {
      window.setTimeout(() => {
        sidebarPartnerSettled = true;
        sidebarPartnerSettlePromise = null;
        resolve();
      }, SIDEBAR_PARTNER_SETTLE_MS);
    });
  }
  return sidebarPartnerSettlePromise;
}

export function SidebarYorkPartnerSlot({
  firstName,
  expanded,
}: {
  firstName?: string;
  expanded: boolean;
}) {
  const [visible, setVisible] = useState(sidebarPartnerSettled);
  const dismissed = useYorkOfferHidden(YORK_COMPANY_WIDE_OFFER_ID);

  useEffect(() => {
    let cancelled = false;
    void waitForSidebarPartnerSettle().then(() => {
      if (!cancelled) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!expanded || !visible || dismissed) return null;

  const copy = yorkSidebarCopy(firstName);
  return (
    <div style={{ marginBottom: 10 }}>
      <YorkPartnerNudge
        offerId={YORK_COMPANY_WIDE_OFFER_ID}
        variant="sidebar"
        className="sidebar-york-nudge"
        lead={copy.lead}
        headline={copy.headline}
      />
    </div>
  );
}
