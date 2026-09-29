import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { yorkChipHeadlines } from "@/db/schema";
import {
  DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
  YORK_CHIP_SETTINGS_CATEGORY,
  YORK_MARKETING_BANNER_DISMISS_DAYS_KEY,
} from "./constants";
import {
  coerceMarketingBannerDismissDays,
  validateMarketingBannerDismissDaysInput,
} from "./banner-settings-shared";

export {
  coerceMarketingBannerDismissDays,
  marketingBannerDismissHideMs,
  parseMarketingBannerDismissDays,
  validateMarketingBannerDismissDaysInput,
  type BannerDismissDaysValidation,
} from "./banner-settings-shared";

function settingsRowId(): string {
  return `ych_${randomUUID()}`;
}

export async function getMarketingBannerDismissDays(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ headline: yorkChipHeadlines.headline })
    .from(yorkChipHeadlines)
    .where(
      and(
        eq(yorkChipHeadlines.category, YORK_CHIP_SETTINGS_CATEGORY),
        eq(yorkChipHeadlines.chipLabel, YORK_MARKETING_BANNER_DISMISS_DAYS_KEY),
      ),
    )
    .limit(1);
  if (!row) return DEFAULT_MARKETING_BANNER_DISMISS_DAYS;
  return coerceMarketingBannerDismissDays(row.headline);
}

export async function setMarketingBannerDismissDays(opts: {
  days: number;
  updatedByEmail: string;
}): Promise<void> {
  const validated = validateMarketingBannerDismissDaysInput(opts.days);
  if (!validated.ok) throw new Error(validated.message);

  const db = await getDb();
  const now = new Date();
  const headline = String(validated.days);
  const existing = await db
    .select()
    .from(yorkChipHeadlines)
    .where(
      and(
        eq(yorkChipHeadlines.category, YORK_CHIP_SETTINGS_CATEGORY),
        eq(yorkChipHeadlines.chipLabel, YORK_MARKETING_BANNER_DISMISS_DAYS_KEY),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(yorkChipHeadlines)
      .set({
        headline,
        updatedByEmail: opts.updatedByEmail,
        updatedAt: now,
      })
      .where(eq(yorkChipHeadlines.id, existing[0].id));
    return;
  }

  await db.insert(yorkChipHeadlines).values({
    id: settingsRowId(),
    category: YORK_CHIP_SETTINGS_CATEGORY,
    chipLabel: YORK_MARKETING_BANNER_DISMISS_DAYS_KEY,
    headline,
    updatedByEmail: opts.updatedByEmail,
    createdAt: now,
    updatedAt: now,
  });
}
