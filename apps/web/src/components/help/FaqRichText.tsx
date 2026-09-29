"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAgentDrawerOptional } from "@/components/AgentDrawer";
import type { Theme } from "@/lib/theme";
import {
  getFaqActionType,
  parseFaqInline,
  resolveFaqLinkHref,
  type FaqInlineSegment,
} from "@/lib/faq-rich-text";

/**
 * Design-library link treatment (`.fuel-help-mail` / `.fuel-help-shortcut`):
 * accent color, weight 650, no underline → underline on hover. No icon.
 */
export function faqHelpLinkStyle(t: Theme, hovered: boolean): CSSProperties {
  return {
    background: "none",
    border: 0,
    color: t.accent,
    cursor: "pointer",
    font: "inherit",
    fontWeight: 650,
    padding: 0,
    textDecoration: hovered ? "underline" : "none",
    overflowWrap: "anywhere",
  };
}

function companyUuidFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/company\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function FaqHelpLink({ t, href, children }: { t: Theme; href: string; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a
      href={href}
      style={faqHelpLinkStyle(t, hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}

function FaqAskFuelActionLink({ t, children }: { t: Theme; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const drawer = useAgentDrawerOptional();
  return (
    <button
      type="button"
      title="Open Ask Fuel AI"
      style={faqHelpLinkStyle(t, hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        // openDrawer sets open=true — if already open, stays open (no toggle).
        drawer?.openDrawer();
      }}
    >
      {children}
    </button>
  );
}

function FaqUnresolvedLink({ t, children }: { t: Theme; children: ReactNode }) {
  return (
    <span
      title="Open a company first to use this link"
      style={{
        color: t.muted,
        fontWeight: 650,
        cursor: "not-allowed",
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </span>
  );
}

export function FaqRichText({
  t,
  value,
  companyId,
  as: Tag = "span",
  style,
}: {
  t: Theme;
  value: string | null | undefined;
  /** Active / fallback company UUID for `{{company_id}}` substitution. */
  companyId?: string | null;
  as?: "span" | "p";
  style?: CSSProperties;
}) {
  const pathname = usePathname();
  const resolvedCompanyId = companyUuidFromPath(pathname) ?? companyId ?? null;
  const segments = parseFaqInline(value ?? "");
  if (segments.length === 0) return null;

  return (
    <Tag style={style}>
      {segments.map((seg, i) => (
        <FaqSegment key={i} t={t} segment={seg} companyId={resolvedCompanyId} />
      ))}
    </Tag>
  );
}

function FaqSegment({
  t,
  segment,
  companyId,
}: {
  t: Theme;
  segment: FaqInlineSegment;
  companyId: string | null;
}) {
  if (segment.type === "text") return <>{segment.text}</>;

  if (getFaqActionType(segment.href) === "ask-fuel") {
    return <FaqAskFuelActionLink t={t}>{segment.text}</FaqAskFuelActionLink>;
  }

  const resolved = resolveFaqLinkHref(segment.href, companyId);
  if (!resolved.ok) {
    return <FaqUnresolvedLink t={t}>{segment.text}</FaqUnresolvedLink>;
  }
  return (
    <FaqHelpLink t={t} href={resolved.href}>
      {segment.text}
    </FaqHelpLink>
  );
}
