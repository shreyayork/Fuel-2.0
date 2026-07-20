import React from "react";
import {
  yorkContactMailto,
  yorkNudgeMessage,
  yorkNudgeSummary,
  type YorkServiceOffer,
} from "./yorkIeUpsell";

/**
 * Compact partner nudge — outcome + optional help summary + CTA.
 * Pattern: contextual upgrade bars (Stripe / Linear / Notion), not a pitch card.
 */
export function YorkPartnerNudge({
  offer,
  className,
  onClick,
  cta = "Talk →",
  showHelpSummary = false,
  message,
}: {
  offer: YorkServiceOffer;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  cta?: string;
  /** Show a one-line “what we help with” under the outcome (detail / drawer). */
  showHelpSummary?: boolean;
  /** Override the primary line (e.g. initiative-specific copy). */
  message?: string;
}) {
  const summary = showHelpSummary ? yorkNudgeSummary(offer) : "";
  const hasSummary = Boolean(summary);
  const primary = message?.trim() || yorkNudgeMessage(offer);

  return (
    <a
      className={`york-nudge${hasSummary ? " has-summary" : ""}${className ? ` ${className}` : ""}`}
      href={yorkContactMailto(offer)}
      onClick={onClick}
    >
      <span className="york-nudge-brand">York IE</span>
      <span className="york-nudge-copy">
        <span className="york-nudge-msg">{primary}</span>
        {hasSummary ? <span className="york-nudge-summary">{summary}</span> : null}
      </span>
      <span className="york-nudge-cta">{cta}</span>
    </a>
  );
}
