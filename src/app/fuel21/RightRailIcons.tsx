import type { SVGProps } from "react";

/**
 * Right companion dock — filled icon set.
 * Solid fills, shared optical weight in a 24×24 box, restrained distinct colors.
 */

type IconProps = SVGProps<SVGSVGElement> & { color?: string };

const BASE = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  "aria-hidden": true as const,
};

/** Soft hover wash colors keyed by dock item id */
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
};

/** Company — building */
export function IconCompany({ color = DOCK_ICON_META.company.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3.5" y="5.5" width="10.2" height="15" rx="2" fill={color} />
      <rect x="12.8" y="9.5" width="7.7" height="11" rx="2" fill={color} fillOpacity="0.55" />
      <rect x="6" y="16.8" width="4" height="3.7" rx="0.7" fill="#fff" fillOpacity="0.95" />
      <rect x="5.5" y="8" width="2" height="2" rx="0.45" fill="#fff" fillOpacity="0.92" />
      <rect x="8.9" y="8" width="2" height="2" rx="0.45" fill="#fff" fillOpacity="0.92" />
      <rect x="5.5" y="11.4" width="2" height="2" rx="0.45" fill="#fff" fillOpacity="0.92" />
      <rect x="8.9" y="11.4" width="2" height="2" rx="0.45" fill="#fff" fillOpacity="0.92" />
      <rect x="15" y="12" width="2" height="2" rx="0.45" fill="#fff" fillOpacity="0.72" />
      <rect x="15" y="15.4" width="2" height="2" rx="0.45" fill="#fff" fillOpacity="0.72" />
    </svg>
  );
}

/** Profile — person */
export function IconProfile({ color = DOCK_ICON_META.profile.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="7.4" r="4.15" fill={color} />
      <path
        d="M4.2 19.5C4.2 16.15 7.5 13.7 12 13.7C16.5 13.7 19.8 16.15 19.8 19.5C19.8 20.35 19.15 21 18.3 21H5.7C4.85 21 4.2 20.35 4.2 19.5Z"
        fill={color}
      />
      <circle cx="12" cy="7.4" r="1.55" fill="#fff" fillOpacity="0.95" />
    </svg>
  );
}

/** Context — stacked layers */
export function IconContext({ color = DOCK_ICON_META.context.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 3.2L20.2 7.3L12 11.4L3.8 7.3L12 3.2Z" fill={color} />
      <path d="M3.8 10L12 14.1L20.2 10V12.2L12 16.3L3.8 12.2V10Z" fill={color} fillOpacity="0.72" />
      <path d="M3.8 14.5L12 18.6L20.2 14.5V16.7L12 20.8L3.8 16.7V14.5Z" fill={color} fillOpacity="0.48" />
    </svg>
  );
}

/** R&D — code block */
export function IconRD({ color = DOCK_ICON_META.rd.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="2.6" y="4.2" width="18.8" height="15.6" rx="3.2" fill={color} />
      <path d="M8.3 9.1L5.6 12L8.3 14.9" stroke="#fff" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.7 9.1L18.4 12L15.7 14.9" stroke="#fff" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.15 8.7L10.85 15.3" stroke="#fff" strokeWidth="2.15" strokeLinecap="round" />
    </svg>
  );
}

/** GTM — ascending bars */
export function IconGTM({ color = DOCK_ICON_META.gtm.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3.4" y="14" width="4.3" height="6.5" rx="1.4" fill={color} fillOpacity="0.42" />
      <rect x="9.85" y="9.4" width="4.3" height="11.1" rx="1.4" fill={color} fillOpacity="0.7" />
      <rect x="16.3" y="4.5" width="4.3" height="16" rx="1.4" fill={color} />
    </svg>
  );
}

/** G&A — civic building */
export function IconGA({ color = DOCK_ICON_META.ga.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 3.2L20.6 8H3.4L12 3.2Z" fill={color} />
      <rect x="3.2" y="8" width="17.6" height="2" rx="0.55" fill={color} />
      <rect x="5" y="10.5" width="2.7" height="7.7" rx="0.7" fill={color} fillOpacity="0.82" />
      <rect x="10.65" y="10.5" width="2.7" height="7.7" rx="0.7" fill={color} fillOpacity="0.82" />
      <rect x="16.3" y="10.5" width="2.7" height="7.7" rx="0.7" fill={color} fillOpacity="0.82" />
      <rect x="3.2" y="18.6" width="17.6" height="2.4" rx="0.7" fill={color} />
    </svg>
  );
}

/** Intelligence — broadcast / live signal */
export function IconIntelligence({ color = DOCK_ICON_META.intelligence.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="2.85" fill={color} />
      <path
        d="M7.15 7.15A6.85 6.85 0 0 0 5.2 12a6.85 6.85 0 0 0 1.95 4.85l1.55-1.55A4.65 4.65 0 0 1 7.4 12c0-1.2.45-2.3 1.3-3.15L7.15 7.15Z"
        fill={color}
        fillOpacity="0.55"
      />
      <path
        d="M16.85 7.15A6.85 6.85 0 0 1 18.8 12a6.85 6.85 0 0 1-1.95 4.85l-1.55-1.55A4.65 4.65 0 0 0 16.6 12c0-1.2-.45-2.3-1.3-3.15l1.55-1.7Z"
        fill={color}
        fillOpacity="0.55"
      />
      <path
        d="M4.35 4.35A10.8 10.8 0 0 0 1.4 12c0 2.9 1.15 5.55 2.95 7.65l1.6-1.6A8.55 8.55 0 0 1 3.6 12c0-2.25.87-4.3 2.3-5.85L4.35 4.35Z"
        fill={color}
        fillOpacity="0.32"
      />
      <path
        d="M19.65 4.35A10.8 10.8 0 0 1 22.6 12c0 2.9-1.15 5.55-2.95 7.65l-1.6-1.6A8.55 8.55 0 0 0 20.4 12c0-2.25-.87-4.3-2.3-5.85l1.55-1.8Z"
        fill={color}
        fillOpacity="0.32"
      />
    </svg>
  );
}

/** Initiatives — target */
export function IconInitiatives({ color = DOCK_ICON_META.initiatives.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12.8" r="8" fill={color} fillOpacity="0.22" />
      <circle cx="12" cy="12.8" r="5.35" fill={color} fillOpacity="0.48" />
      <circle cx="12" cy="12.8" r="2.65" fill={color} />
      <path
        d="M14.8 4.1L20.3 3.2L19.4 8.7L17.6 6.9L14.2 10.3L12.9 9L16.3 5.6L14.8 4.1Z"
        fill={color}
      />
    </svg>
  );
}

/** Data room — locked folder */
export function IconDataroom({ color = DOCK_ICON_META.dataroom.color, ...props }: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path
        d="M3.3 6.7C3.3 5.6 4.2 4.7 5.3 4.7H9.15C9.75 4.7 10.25 5 10.55 5.5L11.55 7H18.7C19.8 7 20.7 7.9 20.7 9V17.6C20.7 18.7 19.8 19.6 18.7 19.6H5.3C4.2 19.6 3.3 18.7 3.3 17.6V6.7Z"
        fill={color}
      />
      <rect x="9" y="11.2" width="6" height="5" rx="1.2" fill="#fff" />
      <path
        d="M10.35 11.2V9.9C10.35 9 11.1 8.25 12 8.25C12.9 8.25 13.65 9 13.65 9.9V11.2"
        stroke="#fff"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="13.6" r="0.9" fill={color} />
    </svg>
  );
}
