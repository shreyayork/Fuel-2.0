"use client";

import { useEffect, useRef, useState } from "react";
import {
  YORK_PARTNER_CTA_LABEL,
  YORK_SERVICES_REQUEST_URL,
} from "@/lib/york-partner";
import {
  dismissYorkOffer,
  getMarketingBannerDismissDaysClient,
  getYorkPartnerDismissMap,
  isYorkOfferDismissed,
  isYorkPartnerDismissHydrated,
  loadYorkPartnerDismissMap,
  subscribeYorkPartnerDismiss,
} from "@/lib/york-partner/dismiss";
import { DEFAULT_MARKETING_BANNER_DISMISS_DAYS } from "@/lib/york-partner/constants";

export type YorkPartnerNudgeVariant = "sidebar" | "overview" | "detail";

export function useMarketingBannerDismissDays(): number {
  const [days, setDays] = useState(() =>
    isYorkPartnerDismissHydrated()
      ? getMarketingBannerDismissDaysClient()
      : DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
  );

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      setDays(getMarketingBannerDismissDaysClient());
    };
    void loadYorkPartnerDismissMap().then(() => {
      if (!cancelled) sync();
    });
    const unsubscribe = subscribeYorkPartnerDismiss(sync);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return days;
}

export function useYorkOfferHidden(offerId: string): boolean {
  const [hidden, setHidden] = useState(() =>
    isYorkPartnerDismissHydrated()
      ? isYorkOfferDismissed(offerId, getYorkPartnerDismissMap())
      : true,
  );

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      setHidden(isYorkOfferDismissed(offerId, getYorkPartnerDismissMap()));
    };
    void loadYorkPartnerDismissMap().then(() => {
      if (!cancelled) sync();
    });
    const unsubscribe = subscribeYorkPartnerDismiss(sync);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [offerId]);

  return hidden;
}

export function YorkPartnerNudge({
  offerId,
  variant,
  lead,
  headline,
  className,
  cta = YORK_PARTNER_CTA_LABEL,
  onDismissed,
}: {
  offerId: string;
  variant: YorkPartnerNudgeVariant;
  lead: string;
  headline: string;
  className?: string;
  cta?: string;
  onDismissed?: () => void;
}) {
  const hidden = useYorkOfferHidden(offerId);
  const dismissHideDays = useMarketingBannerDismissDays();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (hidden) return null;

  const hide = (mode: "hide" | "forever") => {
    dismissYorkOffer(offerId, mode);
    setMenuOpen(false);
    onDismissed?.();
  };

  const contactLinkProps = {
    href: YORK_SERVICES_REQUEST_URL,
    target: "_blank" as const,
    rel: "noopener noreferrer",
  };

  const menu = (
    <div className="york-card-menu" ref={menuRef}>
      <button
        type="button"
        className="york-card-menu-trigger"
        aria-label="More options"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
      >
        ···
      </button>
      {menuOpen ? (
        <div className="york-card-menu-panel" role="menu">
          <button type="button" role="menuitem" onClick={() => hide("hide")}>
            Hide for {dismissHideDays} day{dismissHideDays === 1 ? "" : "s"}
          </button>
          <button type="button" role="menuitem" onClick={() => hide("forever")}>
            Don’t show again
          </button>
        </div>
      ) : null}
    </div>
  );

  if (variant === "detail") {
    return (
      <aside
        className={`york-rail york-rail--detail${className ? ` ${className}` : ""}`}
        aria-label="Suggested York IE partnership"
      >
        <div className="york-rail-top">
          <span className="york-rail-kicker">Partner · York IE</span>
          {menu}
        </div>
        <p className="york-rail-lead">{lead}</p>
        <p className="york-rail-headline">{headline}</p>
        <a className="ask-ai-btn york-rail-cta" {...contactLinkProps}>
          {cta}
        </a>
      </aside>
    );
  }

  if (variant === "overview") {
    return (
      <aside
        className={`york-rail york-rail--overview${className ? ` ${className}` : ""}`}
        aria-label="Suggested York IE partnership"
      >
        <div className="york-rail-mark" aria-hidden="true">
          YI
        </div>
        <div className="york-rail-copy">
          <span className="york-rail-kicker">Suggested · Partner</span>
          <strong className="york-rail-headline">{headline}</strong>
          <em className="york-rail-lead">{lead}</em>
        </div>
        <a className="ask-ai-btn york-rail-cta" {...contactLinkProps}>
          {cta}
        </a>
        {menu}
      </aside>
    );
  }

  return (
    <aside
      className={`york-rail york-rail--sidebar${className ? ` ${className}` : ""}`}
      aria-label="Suggested York IE partnership"
    >
      <div className="york-rail-top">
        <span className="york-rail-kicker">Partner</span>
        {menu}
      </div>
      <p className="york-rail-lead">{lead}</p>
      <p className="york-rail-headline">{headline}</p>
      <a className="ask-ai-btn york-rail-cta" {...contactLinkProps}>
        {cta}
      </a>
    </aside>
  );
}
