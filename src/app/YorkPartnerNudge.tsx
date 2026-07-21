import React, { useEffect, useRef, useState } from "react";
import {
  yorkContactMailto,
  yorkOverviewPartnerCopy,
  yorkPersonalizedPartnerCopy,
  type YorkServiceOffer,
} from "./yorkIeUpsell";
import { dismissYorkOffer, isYorkOfferDismissed } from "./yorkDismiss";

/**
 * York partner nudge — compact LinkedIn / Claude-style placements:
 * - `sidebar` — thin left-rail promo (gated by parent until Overview is ready)
 * - `overview` — horizontal “Suggested” strip under loaded advisor/tracks
 * - `bar` — inline strip for track detail / initiatives
 */
export function YorkPartnerNudge({
  offer,
  className,
  onClick,
  cta = "Talk to York IE",
  message,
  variant = "bar",
  firstName,
  lead,
  headline,
  gapLabels,
  weakTrackLabels,
  onDismissed,
}: {
  offer: YorkServiceOffer;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  cta?: string;
  /** @deprecated Unused — kept for call-site compatibility. */
  showHelpSummary?: boolean;
  message?: string;
  variant?: "card" | "sidebar" | "overview" | "bar";
  firstName?: string;
  lead?: string;
  headline?: string;
  gapLabels?: string[];
  weakTrackLabels?: string[];
  onDismissed?: () => void;
}) {
  const [hidden, setHidden] = useState(() => isYorkOfferDismissed(offer.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHidden(isYorkOfferDismissed(offer.id));
  }, [offer.id]);

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

  const isCompanyWide = variant === "overview" || variant === "sidebar" || variant === "card";
  const personalized = isCompanyWide
    ? yorkOverviewPartnerCopy({ firstName, weakTrackLabels })
    : yorkPersonalizedPartnerCopy({
        firstName,
        offer,
        gapLabels,
        weakTrackLabels,
      });
  const mailto = yorkContactMailto(offer);
  const railLead = lead?.trim() || personalized.lead;
  const railHeadline = headline?.trim() || personalized.headline;

  const hide = (mode: "hide" | "forever") => {
    dismissYorkOffer(offer.id, mode);
    setMenuOpen(false);
    setHidden(true);
    onDismissed?.();
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
          setMenuOpen(open => !open);
        }}
      >
        ···
      </button>
      {menuOpen ? (
        <div className="york-card-menu-panel" role="menu">
          <button type="button" role="menuitem" onClick={() => hide("hide")}>
            Hide for 14 days
          </button>
          <button type="button" role="menuitem" onClick={() => hide("forever")}>
            Don’t show again
          </button>
        </div>
      ) : null}
    </div>
  );

  if (variant === "bar") {
    return (
      <aside
        className={`york-rail york-rail--detail${className ? ` ${className}` : ""}`}
        aria-label="Suggested York IE partnership"
      >
        <div className="york-rail-top">
          <span className="york-rail-kicker">Partner · York IE</span>
          {menu}
        </div>
        <p className="york-rail-lead">{railLead}</p>
        <p className="york-rail-headline">{message?.trim() || railHeadline}</p>
        <a className="ask-ai-btn york-rail-cta" href={mailto} onClick={onClick}>
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
        <div className="york-rail-mark" aria-hidden="true">YI</div>
        <div className="york-rail-copy">
          <span className="york-rail-kicker">Suggested · Partner</span>
          <strong className="york-rail-headline">{railHeadline}</strong>
          <em className="york-rail-lead">{railLead}</em>
        </div>
        <a className="ask-ai-btn york-rail-cta" href={mailto} onClick={onClick}>
          {cta}
        </a>
        {menu}
      </aside>
    );
  }

  // sidebar / card — compact left-rail promo
  return (
    <aside
      className={`york-rail york-rail--sidebar${className ? ` ${className}` : ""}`}
      aria-label="Suggested York IE partnership"
    >
      <div className="york-rail-top">
        <span className="york-rail-kicker">Partner</span>
        {menu}
      </div>
      <p className="york-rail-lead">{railLead}</p>
      <p className="york-rail-headline">{railHeadline}</p>
      <a className="ask-ai-btn york-rail-cta" href={mailto} onClick={onClick}>
        {cta}
      </a>
    </aside>
  );
}
