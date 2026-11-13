export type FuelInvestor = {
  id: string;
  name: string;
  domain: string;
};

/** Directory shown on the founder Investors page. Alphabetical, same order as the product grid. */
export const FUEL_INVESTORS: FuelInvestor[] = [
  { id: "360-capital", name: "360 Capital", domain: "360cap.vc" },
  { id: "3i", name: "3i Group", domain: "3i.com" },
  { id: "3ts", name: "3TS Capital Partners", domain: "3tscapital.com" },
  { id: "abengoa", name: "Abengoa Solar", domain: "abengoasolar.com" },
  { id: "abs", name: "ABS Ventures", domain: "absventures.com" },
  { id: "acadia", name: "Acadia Woods Partners", domain: "acadiawoods.com" },
  { id: "accel", name: "Accel", domain: "accel.com" },
  { id: "accomplice", name: "Accomplice", domain: "accomplice.co" },
  { id: "ackerley", name: "Ackerley Partners", domain: "ackerleypartners.com" },
  { id: "acton", name: "Acton Capital", domain: "actoncapital.com" },
  { id: "adams", name: "Adams Street Partners", domain: "adamsstreetpartners.com" },
  { id: "adobe", name: "Adobe", domain: "adobe.com" },
  { id: "adobe-ventures", name: "Adobe Ventures", domain: "adobe.com" },
  { id: "atv", name: "Advanced Technology Ventures", domain: "atvcapital.com" },
  { id: "allegiance", name: "Allegiance Capital", domain: "allegiancecapital.com" },
  { id: "allen-b", name: "Allen & Buckeridge", domain: "a-b.com.au" },
  { id: "allen-co", name: "Allen & Company", domain: "allenco.com" },
  { id: "ab", name: "AllianceBernstein", domain: "alliancebernstein.com" },
  { id: "aoa", name: "Alliance of Angels", domain: "allianceofangels.com" },
  { id: "alloy", name: "Alloy Ventures", domain: "alloyventures.com" },
  { id: "alpha", name: "Alpha Group", domain: "gdalpha.com" },
  { id: "alsop", name: "Alsop Louie Partners", domain: "alsop-louie.com" },
  { id: "altos", name: "Altos Ventures", domain: "altos.vc" },
  { id: "amazon", name: "Amazon", domain: "amazon.com" },
  { id: "asi", name: "Ambient Sound Investments", domain: "asi.ee" },
  { id: "a16z", name: "Andreessen Horowitz", domain: "a16z.com" },
  { id: "benchmark", name: "Benchmark", domain: "benchmark.com" },
  { id: "bessemer", name: "Bessemer Venture Partners", domain: "bvp.com" },
  { id: "first-round", name: "First Round", domain: "firstround.com" },
  { id: "founders-fund", name: "Founders Fund", domain: "foundersfund.com" },
  { id: "gc", name: "General Catalyst", domain: "generalcatalyst.com" },
  { id: "gv", name: "GV", domain: "gv.com" },
  { id: "greylock", name: "Greylock", domain: "greylock.com" },
  { id: "index", name: "Index Ventures", domain: "indexventures.com" },
  { id: "insight", name: "Insight Partners", domain: "insightpartners.com" },
  { id: "khosla", name: "Khosla Ventures", domain: "khoslaventures.com" },
  { id: "kleiner", name: "Kleiner Perkins", domain: "kleinerperkins.com" },
  { id: "lightspeed", name: "Lightspeed", domain: "lsvp.com" },
  { id: "nea", name: "NEA", domain: "nea.com" },
  { id: "sequoia", name: "Sequoia Capital", domain: "sequoiacap.com" },
  { id: "softbank", name: "SoftBank", domain: "softbank.com" },
  { id: "tiger", name: "Tiger Global", domain: "tigerglobal.com" },
  { id: "york", name: "York IE", domain: "york.ie" },
  { id: "yc", name: "Y Combinator", domain: "ycombinator.com" },
];

export const INVESTOR_PAGE_SIZE = 24;

export function investorLogoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
