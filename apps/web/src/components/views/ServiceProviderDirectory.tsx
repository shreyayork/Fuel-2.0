"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  normalizeExternalHref,
  providerInitials,
} from "@/lib/service-provider-links";
import type { Theme } from "@/lib/theme";
import type { ServiceProvider } from "@/db/schema";
import { Chip, Label, SectionHead } from "../atoms";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { useTheme } from "../ThemeContext";
import {
  SERVICE_PROVIDER_CATEGORIES,
  categoryLabel,
  type ServiceProviderCategory,
} from "@/lib/service-providers-constants";

export function ServiceProviderDirectory({
  rows,
  superAdmin,
}: {
  rows: ServiceProvider[];
  superAdmin: boolean;
}) {
  const t = useTheme();
  const [category, setCategory] = useState<ServiceProviderCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      const haystack = [r.name, r.description ?? "", (r.tags ?? []).join(" ")].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, category, query]);

  // Group by category for display.
  const groups = useMemo(() => {
    const map = new Map<ServiceProviderCategory, ServiceProvider[]>();
    for (const r of filtered) {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return SERVICE_PROVIDER_CATEGORIES
      .filter((c) => map.has(c))
      .map((c) => ({ category: c, items: map.get(c)! }));
  }, [filtered]);

  return (
    <div>
      <SectionHead
        t={t}
        title="Service providers"
        subtitle="Hand-curated directory of vendors, service firms, and partners York IE works with."
        right={
          superAdmin ? (
            <Link
              href="/super-admin/service-providers"
              style={{
                padding: "8px 14px",
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.inkSoft,
                textDecoration: "none",
              }}
            >
              Manage (super admin)
            </Link>
          ) : undefined
        }
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search providers…"
          style={{
            padding: "8px 12px",
            background: t.panelAlt,
            color: t.ink,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 13,
            flex: "1 1 260px",
            minWidth: 200,
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ServiceProviderCategory | "all")}
          style={{
            padding: "8px 12px",
            background: t.panelAlt,
            color: t.ink,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 13,
            minWidth: 180,
          }}
        >
          <option value="all">All categories</option>
          {SERVICE_PROVIDER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: t.panel,
            border: `1px solid ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
          }}
        >
          No providers match. Try a broader search.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {groups.map((g) => (
            <div key={g.category}>
              <Label t={t} style={{ marginBottom: 8 }}>
                {categoryLabel(g.category)} · {g.items.length}
              </Label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
                  gap: 10,
                }}
              >
                {g.items.map((r) => (
                  <ProviderCard key={r.id} t={t} provider={r} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 5 lines at 12px / 1.5 — max only; short copy keeps natural height. */
const DESCRIPTION_LINES = 5;
const DESCRIPTION_FONT = 12;
const DESCRIPTION_LINE_HEIGHT = 1.5;
const DESCRIPTION_MAX_PX = DESCRIPTION_FONT * DESCRIPTION_LINE_HEIGHT * DESCRIPTION_LINES;
const POPOVER_CLOSE_MS = 160;

function ProviderCard({ t, provider }: { t: Theme; provider: ServiceProvider }) {
  const websiteHref = normalizeExternalHref(provider.website);
  const linkedinHref = normalizeExternalHref(provider.linkedinUrl);
  const tags = provider.tags?.slice(0, 4) ?? [];

  return (
    <div
      style={{
        padding: 14,
        background: t.panel,
        border: `1px solid ${provider.visibility === "internal" ? t.accent : t.rule}`,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <ProviderLogo t={t} name={provider.name} logoUrl={provider.logoUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: 600,
              color: t.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {provider.name}
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>
            {categoryLabel(provider.category)}
            {provider.visibility === "internal" ? " · Internal" : ""}
          </div>
        </div>
      </div>
      {provider.description ? <ClampedText t={t} text={provider.description} /> : null}
      {tags.length ? (
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "nowrap",
            overflow: "hidden",
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          {tags.map((tag) => (
            <Chip key={tag} t={t} tone="ghost">
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 10,
          fontFamily: t.sans,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {websiteHref ? (
          <a href={websiteHref} target="_blank" rel="noreferrer" style={{ color: t.accent, textDecoration: "none" }}>
            Website
          </a>
        ) : null}
        {linkedinHref ? (
          <a href={linkedinHref} target="_blank" rel="noreferrer" style={{ color: t.accent, textDecoration: "none" }}>
            LinkedIn
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ClampedText({ t, text }: { t: Theme; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    };
  }, [text]);

  const cancelClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const keepOpen = () => {
    if (!truncated) return;
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), POPOVER_CLOSE_MS);
  };

  const showTip = truncated && open;

  return (
    <Popover open={showTip} onOpenChange={(next) => truncated && setOpen(next)}>
      <PopoverAnchor asChild>
        <div
          ref={ref}
          tabIndex={truncated ? 0 : undefined}
          role={truncated ? "button" : undefined}
          aria-expanded={truncated ? showTip : undefined}
          aria-haspopup={truncated ? "dialog" : undefined}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleClose}
          onFocus={keepOpen}
          onBlur={(e) => {
            const next = e.relatedTarget;
            if (next instanceof Node && bodyRef.current?.contains(next)) return;
            scheduleClose();
          }}
          onKeyDown={(e) => {
            if (!truncated) return;
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((v) => !v);
              if (!open) {
                requestAnimationFrame(() => bodyRef.current?.focus());
              }
            }
          }}
          style={{
            fontFamily: t.sans,
            fontSize: DESCRIPTION_FONT,
            color: t.inkSoft,
            lineHeight: DESCRIPTION_LINE_HEIGHT,
            maxHeight: DESCRIPTION_MAX_PX,
            overflow: "hidden",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: DESCRIPTION_LINES,
            WebkitBoxOrient: "vertical",
            cursor: truncated ? "help" : undefined,
            outline: "none",
          }}
        >
          {text}
        </div>
      </PopoverAnchor>
      <PopoverContent
        t={t}
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
        style={{
          maxWidth: "min(320px, calc(100vw - 24px))",
          maxHeight: "min(240px, 50vh)",
          overflowY: "auto",
          padding: "10px 12px",
        }}
      >
        <div
          ref={bodyRef}
          tabIndex={showTip ? 0 : undefined}
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.inkSoft,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProviderLogo({
  t,
  name,
  logoUrl,
}: {
  t: Theme;
  name: string;
  logoUrl: string | null;
}) {
  const initials = providerInitials(name);
  const src = logoUrl?.trim();
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          objectFit: "contain",
          background: t.panelAlt,
          border: `1px solid ${t.rule}`,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 4,
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: t.sans,
        fontSize: 12,
        fontWeight: 700,
        color: t.muted,
        flexShrink: 0,
      }}
    >
      {initials || "·"}
    </div>
  );
}
