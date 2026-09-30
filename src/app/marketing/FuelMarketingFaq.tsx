import React, { useEffect, useMemo, useState } from "react";
import { FuelIcon } from "../icons";
import {
  getHelpFaqForAudience,
  type HelpFaqAudience,
  type HelpFaqItem,
} from "../FuelHelpFaq";
const LANDING_FAQ_IDS: Record<HelpFaqAudience, string[]> = {
  founder: [
    "what-is-fuel",
    "how-fuel-helps",
    "benchmarks",
    "how-credits-work",
    "legal-policies",
  ],
  investor: [
    "what-is-fuel-investor",
    "investor-getting-started",
    "investor-portfolios",
    "investor-pipeline",
    "investor-legal",
  ],
};

function pickLandingFaq(audience: HelpFaqAudience): HelpFaqItem[] {
  const byId = Object.fromEntries(getHelpFaqForAudience(audience).map(item => [item.id, item]));
  return LANDING_FAQ_IDS[audience].map(id => byId[id]).filter(Boolean);
}

export function FuelMarketingFaq() {
  const [audience, setAudience] = useState<HelpFaqAudience>("founder");
  const items = useMemo(() => pickLandingFaq(audience), [audience]);
  const [openId, setOpenId] = useState<string | null>(() => items[0]?.id ?? null);

  useEffect(() => {
    setOpenId(items[0]?.id ?? null);
  }, [items]);

  return (
    <section className="mkt-section mkt-faq is-wash" id="faq" aria-labelledby="mkt-faq-title">
      <div className="mkt-faq-head">
        <div className="mkt-kicker is-left">FAQ</div>
        <h2 id="mkt-faq-title">Questions before you sign in</h2>
        <p>Separate answers for operating companies and investment firms — plus policies that apply to both.</p>
        <div className="mkt-faq-tabs" role="tablist" aria-label="Audience">
          <button
            type="button"
            role="tab"
            aria-selected={audience === "founder"}
            className={audience === "founder" ? "is-active" : ""}
            onClick={() => setAudience("founder")}
          >
            Founders &amp; operators
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={audience === "investor"}
            className={audience === "investor" ? "is-active" : ""}
            onClick={() => setAudience("investor")}
          >
            Investors
          </button>
        </div>
      </div>

      <div className="mkt-faq-grid" role="tabpanel">
        {items.map(item => {
          const expanded = openId === item.id;
          return (
            <div key={item.id} className={`mkt-faq-item${expanded ? " is-open" : ""}`}>
              <button
                type="button"
                className="mkt-faq-q"
                aria-expanded={expanded}
                onClick={() => setOpenId(expanded ? null : item.id)}
              >
                <span>{item.question}</span>
                <FuelIcon name="chevronDown" size={16} className="mkt-faq-caret" />
              </button>
              {expanded ? (
                <div className="mkt-faq-a">
                  <p className="mkt-faq-lead">{item.answer}</p>
                  {item.points ? (
                    <ul className="mkt-faq-points">
                      {item.points.map((point, index) => (
                        <li key={index}>
                          <span className="mkt-faq-point-label">{point.label}</span>
                          {" — "}
                          {point.body}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.footnote ? <p className="mkt-faq-note">{item.footnote}</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
