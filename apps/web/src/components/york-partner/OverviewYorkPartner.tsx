"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultChipHeadlineMap,
  YORK_CATEGORY_LABELS,
  YORK_COMPANY_WIDE_OFFER_ID,
  YORK_DETAIL_OFFER_IDS,
  yorkDetailCopy,
  yorkOverviewCopy,
  type YorkChipHeadlineMap,
  type YorkPartnerCategoryId,
} from "@/lib/york-partner";
import { CATEGORY_IDS, type OverviewCategoryId } from "@/lib/overview/constants";
import type { OverviewApiResponse } from "@/lib/overview/types";
import { YorkPartnerNudge, useYorkOfferHidden } from "./YorkPartnerNudge";

function useChipHeadlines(): YorkChipHeadlineMap {
  const [map, setMap] = useState<YorkChipHeadlineMap>(() =>
    defaultChipHeadlineMap(),
  );
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/york-partner/chip-headlines")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { headlines?: YorkChipHeadlineMap } | null) => {
        if (!cancelled && json?.headlines) setMap(json.headlines);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return map;
}

export function OverviewYorkPartnerStrip({
  categories,
  firstName,
}: {
  categories: OverviewApiResponse["categories"];
  firstName?: string;
}) {
  const hidden = useYorkOfferHidden(YORK_COMPANY_WIDE_OFFER_ID);

  const categoriesWithGaps = useMemo(() => {
    const labels: string[] = [];
    for (const id of CATEGORY_IDS) {
      const cat = categories.find((c) => c.categoryId === id);
      if (cat && cat.weaknesses.length > 0) {
        labels.push(YORK_CATEGORY_LABELS[id as YorkPartnerCategoryId]);
      }
    }
    return labels;
  }, [categories]);

  if (hidden) return null;

  const copy = yorkOverviewCopy({ firstName, categoriesWithGaps });
  return (
    <div className="york-overview-suggest" aria-label="Suggested for you">
      <YorkPartnerNudge
        offerId={YORK_COMPANY_WIDE_OFFER_ID}
        variant="overview"
        lead={copy.lead}
        headline={copy.headline}
      />
    </div>
  );
}

export function DetailYorkPartnerNudge({
  categoryId,
  weaknesses,
  firstName,
}: {
  categoryId: OverviewCategoryId;
  weaknesses: Array<{ label: string }>;
  firstName?: string;
}) {
  const headlines = useChipHeadlines();
  const offerId = YORK_DETAIL_OFFER_IDS[categoryId];
  const hidden = useYorkOfferHidden(offerId);

  if (hidden) return null;

  const copy = yorkDetailCopy({
    firstName,
    categoryId,
    needsImprovementLabels: weaknesses.map((w) => w.label),
    headlines,
  });

  return (
    <YorkPartnerNudge
      offerId={offerId}
      variant="detail"
      className="york-nudge--detail"
      lead={copy.lead}
      headline={copy.headline}
    />
  );
}
