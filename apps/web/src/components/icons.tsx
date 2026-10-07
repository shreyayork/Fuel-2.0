// Minimal line-icon glyphs (from the design prototype). No emoji.
import type { ReactElement } from "react";

const svg = (d: string, size = 12) =>
  (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d={d} />
    </svg>
  ) as ReactElement;

export const G = {
  search: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  plus: svg("M12 5v14M5 12h14", 14),
  arrow: svg("M5 12h14M13 6l6 6-6 6"),
  back: svg("M19 12H5M11 6l-6 6 6 6", 14),
  bolt: svg("M13 2L3 14h7l-1 8 11-14h-7l0-6z"),
  filter: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16l-6.2 7.4V18l-3.6 2v-7.6L4 5z" />
    </svg>
  ),
  mail: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={3} y={5} width={18} height={14} rx={1} />
      <path d="M3 7l9 7 9-7" />
    </svg>
  ),
  cal: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={3} y={5} width={18} height={16} rx={1} />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  chat: svg("M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z"),
  link: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
      <path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
    </svg>
  ),
  doc: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  ),
  user: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  grid: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={3} y={3} width={7} height={7} />
      <rect x={14} y={3} width={7} height={7} />
      <rect x={3} y={14} width={7} height={7} />
      <rect x={14} y={14} width={7} height={7} />
    </svg>
  ),
  list: svg("M3 6h18M3 12h18M3 18h18"),
  close: svg("M6 6l12 12M18 6l-12 12", 14),
  edit: svg("M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z", 14),
  view: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  ),
  trash: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  check: svg("M5 13l4 4L19 7", 14),
  dot3: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <circle cx={5} cy={12} r={1.5} />
      <circle cx={12} cy={12} r={1.5} />
      <circle cx={19} cy={12} r={1.5} />
    </svg>
  ),
} as const;
