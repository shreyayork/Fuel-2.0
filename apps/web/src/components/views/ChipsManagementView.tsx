"use client";

import { useMemo, useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import { SectionHead } from "@/components/atoms";
import { useTheme } from "@/components/ThemeContext";
import {
  YORK_CATEGORY_LABELS,
  YORK_PARTNER_CATEGORIES,
  type YorkPartnerCategoryId,
} from "@/lib/york-partner";
import type { ChipAdminRow } from "@/lib/york-partner";
import {
  resetCategoryChipHeadlinesAction,
  resetChipHeadlineAction,
  saveChipHeadlineAction,
  saveMarketingBannerDismissDaysAction,
} from "@/app/(super-admin)/super-admin/chips/actions";
import { DEFAULT_MARKETING_BANNER_DISMISS_DAYS } from "@/lib/york-partner/constants";

type ChipsTab = YorkPartnerCategoryId | "banner";

function button(t: Theme, variant: "primary" | "ghost" = "ghost"): React.CSSProperties {
  const map = {
    primary: { bg: t.ink, color: t.bg, border: t.ink },
    ghost: { bg: "transparent", color: t.inkSoft, border: t.rule },
  } as const;
  const v = map[variant];
  return {
    padding: "6px 12px",
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function inputStyle(t: Theme): React.CSSProperties {
  return {
    padding: "7px 9px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 13,
    width: "100%",
  };
}

export function ChipsManagementView({
  rows,
  dismissHideDays,
}: {
  rows: ChipAdminRow[];
  dismissHideDays: number;
}) {
  const t = useTheme();
  const [tab, setTab] = useState<ChipsTab>("dev");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [bannerDaysDraft, setBannerDaysDraft] = useState(String(dismissHideDays));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const bannerDaysValue = bannerDaysDraft.trim();

  const filtered = useMemo(
    () => rows.filter((r) => r.category === tab),
    [rows, tab],
  );

  const draftKey = (category: string, chipLabel: string) =>
    `${category}::${chipLabel}`;

  const valueFor = (row: ChipAdminRow) =>
    drafts[draftKey(row.category, row.chipLabel)] ?? row.headline;

  const saveRow = (row: ChipAdminRow) => {
    const headline = valueFor(row).trim();
    if (!headline) {
      setMessage("Headline is required.");
      return;
    }
    if (headline.length > 120) {
      setMessage("Headline must be 120 characters or fewer.");
      return;
    }
    const fd = new FormData();
    fd.set("category", row.category);
    fd.set("chipLabel", row.chipLabel);
    fd.set("headline", headline);
    startTransition(async () => {
      await saveChipHeadlineAction(fd);
      setMessage("Saved.");
    });
  };

  const resetRow = (row: ChipAdminRow) => {
    const fd = new FormData();
    fd.set("category", row.category);
    fd.set("chipLabel", row.chipLabel);
    startTransition(async () => {
      await resetChipHeadlineAction(fd);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey(row.category, row.chipLabel)];
        return next;
      });
      setMessage("Reset to default.");
    });
  };

  const resetCategory = () => {
    if (tab === "banner") return;
    const fd = new FormData();
    fd.set("category", tab);
    startTransition(async () => {
      await resetCategoryChipHeadlinesAction(fd);
      setDrafts({});
      setMessage(`Reset ${YORK_CATEGORY_LABELS[tab]} to defaults.`);
    });
  };

  const saveBannerDismissDays = () => {
    const fd = new FormData();
    fd.set("dismissHideDays", bannerDaysValue);
    startTransition(async () => {
      const result = await saveMarketingBannerDismissDaysAction(fd);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Saved banner dismissal duration.");
    });
  };

  const resetBannerDismissDays = () => {
    setBannerDaysDraft(String(DEFAULT_MARKETING_BANNER_DISMISS_DAYS));
    setMessage(`Reset draft to ${DEFAULT_MARKETING_BANNER_DISMISS_DAYS}-day default. Save to apply.`);
  };

  return (
    <div>
      <SectionHead
        t={t}
        title="Chips management"
        subtitle="Marketing headlines for York IE partner rails. Defaults ship in code; Save stores Super Admin overrides."
        right={
          tab === "banner" ? null : (
            <button
              type="button"
              onClick={resetCategory}
              disabled={pending}
              style={button(t)}
            >
              Reset {YORK_CATEGORY_LABELS[tab]} to defaults
            </button>
          )
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {YORK_PARTNER_CATEGORIES.map((id) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                ...button(t, active ? "primary" : "ghost"),
                fontWeight: active ? 600 : 500,
              }}
            >
              {YORK_CATEGORY_LABELS[id]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setTab("banner")}
          style={{
            ...button(t, tab === "banner" ? "primary" : "ghost"),
            fontWeight: tab === "banner" ? 600 : 500,
          }}
        >
          Banner
        </button>
      </div>

      {message ? (
        <p style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, margin: "0 0 12px" }}>
          {message}
        </p>
      ) : null}

      {tab === "banner" ? (
        <div
          style={{
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            padding: 16,
            background: t.panel,
          }}
        >
          <label
            htmlFor="banner-dismiss-days"
            style={{
              display: "block",
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              marginBottom: 6,
            }}
          >
            Marketing banner dismissal duration
          </label>
          <p
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
              margin: "0 0 12px",
              lineHeight: 1.45,
            }}
          >
            Controls how long partner marketing banners stay hidden when a user
            chooses the temporary dismiss option. Saved value applies to new
            temporary dismissals only.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              id="banner-dismiss-days"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={bannerDaysDraft}
              onChange={(e) => setBannerDaysDraft(e.target.value)}
              style={{ ...inputStyle(t), width: 96 }}
              aria-describedby="banner-dismiss-days-help"
            />
            <span
              id="banner-dismiss-days-help"
              style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft }}
            >
              days
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={saveBannerDismissDays}
              style={button(t, "primary")}
            >
              Save
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={resetBannerDismissDays}
              style={button(t)}
            >
              Reset to default
            </button>
          </div>
        </div>
      ) : (
      <div
        style={{
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          overflow: "hidden",
          background: t.panel,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px, 0.35fr) minmax(0, 1fr) auto",
            gap: 12,
            padding: "10px 14px",
            borderBottom: `1px solid ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 11,
            fontWeight: 600,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span>Chip label</span>
          <span>Marketing headline</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <p style={{ padding: 16, color: t.muted, fontFamily: t.sans, fontSize: 13 }}>
            Loading chip headlines…
          </p>
        ) : (
          filtered.map((row) => (
            <div
              key={`${row.category}-${row.chipLabel}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(140px, 0.35fr) minmax(0, 1fr) auto",
                gap: 12,
                padding: "10px 14px",
                borderBottom: `1px solid ${t.rule}`,
                alignItems: "center",
              }}
            >
              <div style={{ fontFamily: t.sans, fontSize: 13, color: t.ink, fontWeight: 500 }}>
                {row.chipLabel}
                {row.isOverride ? (
                  <span style={{ display: "block", fontSize: 11, color: t.accent, marginTop: 2 }}>
                    Override
                  </span>
                ) : null}
              </div>
              <input
                value={valueFor(row)}
                maxLength={120}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [draftKey(row.category, row.chipLabel)]: e.target.value,
                  }))
                }
                style={inputStyle(t)}
                aria-label={`Headline for ${row.chipLabel}`}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => saveRow(row)}
                  style={button(t, "primary")}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={pending || !row.isOverride}
                  onClick={() => resetRow(row)}
                  style={button(t)}
                >
                  Reset
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
}
