import React from "react";
import {
  FUEL_FOUNDER_HELP_FAQ,
  FUEL_INVESTOR_HELP_FAQ,
  type HelpFaqItem,
} from "../FuelHelpFaq";
import type { HelpFaqAdminEntry } from "./faqAdminStore";

function reactNodeToPlain(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToPlain).join("");
  if (React.isValidElement(node)) return reactNodeToPlain(node.props.children);
  return "";
}

function pointsToText(points: HelpFaqItem["points"]): string {
  if (!points?.length) return "";
  return points
    .map(p => `${reactNodeToPlain(p.label).trim()} – ${reactNodeToPlain(p.body).trim()}`)
    .join("\n");
}

export function seedHelpFaqAdminFromCatalog(): HelpFaqAdminEntry[] {
  const founder = FUEL_FOUNDER_HELP_FAQ.map(item => ({
    id: item.id,
    question: item.question,
    answer: reactNodeToPlain(item.answer).trim(),
    pointsText: pointsToText(item.points),
    footnote: reactNodeToPlain(item.footnote).trim(),
    published: true,
    founder: true,
    investor: false,
  }));
  const investor = FUEL_INVESTOR_HELP_FAQ.map(item => ({
    id: item.id,
    question: item.question,
    answer: reactNodeToPlain(item.answer).trim(),
    pointsText: pointsToText(item.points),
    footnote: reactNodeToPlain(item.footnote).trim(),
    published: true,
    founder: false,
    investor: true,
  }));
  return [...founder, ...investor];
}
