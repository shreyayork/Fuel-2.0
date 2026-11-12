/**
 * Right companion dock — accent colors per item (icons use left-nav Lucide glyphs).
 */

export const FUEL21_DOCK_ICON_SIZE = 17;

/** Soft hover wash + icon accent colors keyed by dock item id */
export const DOCK_ICON_META: Record<string, { color: string; wash: string }> = {
  company: { color: "#4F6BED", wash: "rgba(79, 107, 237, 0.12)" },
  profile: { color: "#0CA678", wash: "rgba(12, 166, 120, 0.12)" },
  context: { color: "#E67700", wash: "rgba(230, 119, 0, 0.12)" },
  rd: { color: "#099268", wash: "rgba(9, 146, 104, 0.12)" },
  gtm: { color: "#D9480F", wash: "rgba(217, 72, 15, 0.12)" },
  ga: { color: "#868E96", wash: "rgba(134, 142, 150, 0.14)" },
  intelligence: { color: "#1C7ED6", wash: "rgba(28, 126, 214, 0.12)" },
  initiatives: { color: "#C2255C", wash: "rgba(194, 37, 92, 0.12)" },
  dataroom: { color: "#0B9B8A", wash: "rgba(11, 155, 138, 0.12)" },
  blog: { color: "#7C5CBF", wash: "rgba(124, 92, 191, 0.12)" },
};
