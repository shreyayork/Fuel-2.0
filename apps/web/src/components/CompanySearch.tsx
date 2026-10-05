"use client";

import { useEffect, useRef, useState } from "react";
import { TOUCH_TARGET_MIN } from "@/lib/responsive";
import type { Theme } from "@/lib/theme";
import { Logo } from "./atoms";
import {
  COMPANY_SEARCH_INPUT_CLASS,
  COMPANY_SEARCH_PLACEHOLDER,
  companySearchPlaceholderCss,
} from "./company-search-placeholder";
import { G } from "./icons";

type Hit = {
  uuid: string;
  name: string;
  domain?: string;
  shortDescription?: string;
  employeeCount?: string;
  totalFundingUsd?: number;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
};

function formatFunding(n?: number): string | null {
  if (!n) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function formatLocation(h: Hit): string | null {
  const parts = [h.locationCity, h.locationState, h.locationCountry].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

const CACHE = new Map<string, Hit[]>();
const CACHE_MAX = 40;
const MIN_SEARCH_CHARS = 3;

export function CompanySearch({
  t,
  fluid = false,
}: {
  t: Theme;
  /** Stretch to parent width (mobile header). */
  fluid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  /** Query we last resolved (cache hit or completed fetch) — avoids "No matches" before first response. */
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < MIN_SEARCH_CHARS) {
      setResults([]);
      setLoading(false);
      setResolvedFor(null);
      return;
    }

    const cached = CACHE.get(q);
    if (cached) {
      setResults(cached);
      setLoading(false);
      setResolvedFor(q);
      return;
    }

    setLoading(true);
    setResolvedFor(null);
    setResults([]);

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fuel-data/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setResults([]);
        } else {
          const json = (await res.json()) as { results: Hit[] };
          const list = json.results ?? [];
          setResults(list);
          CACHE.set(q, list);
          if (CACHE.size > CACHE_MAX) {
            const firstKey = CACHE.keys().next().value;
            if (firstKey) CACHE.delete(firstKey);
          }
        }
        setResolvedFor(q);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setResolvedFor(q);
        }
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_SEARCH_CHARS;
  const showNoMatches =
    !loading && resolvedFor === trimmed && trimmed.length >= MIN_SEARCH_CHARS && results.length === 0;

  return (
    <div ref={boxRef} style={{ position: "relative", width: fluid ? "100%" : undefined }}>
      <style>{companySearchPlaceholderCss(t.muted)}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxSizing: "border-box",
          color: t.muted,
          // Match Tour + Ask Fuel AI header CTAs.
          height: TOUCH_TARGET_MIN,
          padding: "0 12px",
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          background: t.panel,
          width: fluid ? "100%" : undefined,
        }}
      >
        {G.search}
        <input
          className={COMPANY_SEARCH_INPUT_CLASS}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={COMPANY_SEARCH_PLACEHOLDER}
          autoComplete="off"
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontFamily: t.sans,
            fontSize: fluid ? 16 : 13,
            color: t.ink,
            width: fluid ? "100%" : 260,
            minWidth: 0,
            flex: 1,
          }}
        />
        {loading ? (
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.mutedSoft }}>…</span>
        ) : null}
      </div>
      {open && trimmed ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            left: fluid ? 0 : undefined,
            width: fluid ? "100%" : undefined,
            minWidth: fluid ? 0 : 360,
            maxWidth: "min(100vw - 32px, 420px)",
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0,0,0,0.32)",
            maxHeight: "min(480px, 70dvh)",
            overflowY: "auto",
            zIndex: 200,
          }}
        >
          {tooShort ? (
            <div
              style={{
                padding: 16,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
                textAlign: "center",
              }}
            >
              Please enter at least 3 characters to search.
            </div>
          ) : null}
          {showNoMatches ? (
            <div
              style={{
                padding: 16,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
                textAlign: "center",
              }}
            >
              No matches found.
            </div>
          ) : null}
          {results.map((h) => {
            const loc = formatLocation(h);
            const funding = formatFunding(h.totalFundingUsd);
            return (
              <a
                key={h.uuid}
                href={`/company/${h.uuid}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderBottom: `1px solid ${t.ruleSoft}`,
                  textDecoration: "none",
                  color: t.ink,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = t.panelAlt;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                <Logo
                  t={t}
                  co={{ logo: h.name.slice(0, 2).toUpperCase(), name: h.name, uuid: h.uuid }}
                  size={28}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: t.ink,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {h.name}
                    {h.domain ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontWeight: 400,
                          fontSize: 11,
                          color: t.muted,
                        }}
                      >
                        {h.domain}
                      </span>
                    ) : null}
                  </div>
                  {h.shortDescription ? (
                    <div
                      style={{
                        fontFamily: t.sans,
                        fontSize: 11,
                        color: t.muted,
                        marginTop: 2,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {h.shortDescription}
                    </div>
                  ) : null}
                  {(loc || funding || h.employeeCount) ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 4,
                        fontFamily: t.mono,
                        fontSize: 10,
                        color: t.mutedSoft,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {loc ? <span>{loc}</span> : null}
                      {funding ? <span>{funding}</span> : null}
                      {h.employeeCount && h.employeeCount !== "unknown" ? (
                        <span>{h.employeeCount} FTE</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
