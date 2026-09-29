import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FuelInvoiceData } from "./types";

// pdfkit is CJS; load via createRequire for consistent Node/Next bundling.
const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit") as typeof import("pdfkit");

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 30;
const HEADER_HEIGHT = 82;
/** Wordmark + tagline column — wide enough that glyphs are not clipped. */
const HEADER_WORDMARK_X = MARGIN_X + 52;
const HEADER_WORDMARK_WIDTH = 210;
/** Gap from table-header label top to accent divider (10pt type + ~16pt below). */
const TABLE_HEADER_DIVIDER_GAP = 26;

const COLORS = {
  headerBg: "#12161a",
  accent: "#00b48a",
  ink: "#1b2024",
  muted: "#69737c",
  softMuted: "#8b9aa0",
  rule: "#e6e3da",
  footerInk: "#2b3238",
  paymentMuted: "#737373",
  amountPaidInk: "#333333",
  white: "#ffffff",
} as const;

function resolveInvoicePdfPath(...parts: string[]): string {
  const rel = path.join(...parts);
  const candidates = [
    path.join(path.dirname(fileURLToPath(import.meta.url)), rel),
    path.join(process.cwd(), "src/lib/credits/invoice-pdf", rel),
    path.join(process.cwd(), "apps/web/src/lib/credits/invoice-pdf", rel),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Render Fuel-branded invoice PDF matching Figma node 365:2 (A4 595×842).
 * All amounts/labels come from FuelInvoiceData (Stripe-sourced).
 */
export async function renderFuelInvoicePdf(
  data: FuelInvoiceData,
): Promise<Buffer> {
  const isPaid = data.status === "paid";

  const doc = new PDFDocument({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margin: 0,
    // Keep streams uncompressed so content is inspectable in tests/support.
    compress: false,
    info: {
      Title: data.invoiceNumber
        ? `Fuel invoice ${data.invoiceNumber}`
        : `Fuel invoice ${data.stripeInvoiceId}`,
      Author: "York IE",
      Creator: "Fuel",
    },
  });

  doc.registerFont("Inter", resolveInvoicePdfPath("fonts", "Inter-Regular.ttf"));
  doc.registerFont("InterMedium", resolveInvoicePdfPath("fonts", "Inter-Medium.ttf"));
  doc.registerFont("InterSemi", resolveInvoicePdfPath("fonts", "Inter-SemiBold.ttf"));
  doc.registerFont("SGBold", resolveInvoicePdfPath("fonts", "SpaceGrotesk-Bold.ttf"));
  doc.registerFont("SGMedium", resolveInvoicePdfPath("fonts", "SpaceGrotesk-Medium.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // --- Header ---
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT).fill(COLORS.headerBg);

  try {
    doc.image(resolveInvoicePdfPath("assets", "york-logo-header.png"), MARGIN_X, 20, {
      width: 40,
      height: 42,
    });
  } catch {
    // Logo optional at render-time — text wordmark still present.
  }
  // Draw the wordmark as type — the Figma SVG/PNG lockup is overflow-clipped
  // on both ends, which pdfkit would reproduce. Space Grotesk Bold matches
  // the header face; width is the remaining header column before INVOICE.
  doc
    .fillColor(COLORS.white)
    .font("SGBold")
    .fontSize(15)
    .text("YORK · IE", HEADER_WORDMARK_X, 27, {
      width: HEADER_WORDMARK_WIDTH,
      lineBreak: false,
      ellipsis: true,
    });
  doc
    .fillColor(COLORS.softMuted)
    .font("SGBold")
    .fontSize(9)
    .text("INVESTMENT + OPERATING FIRM", HEADER_WORDMARK_X, 50, {
      width: HEADER_WORDMARK_WIDTH,
      characterSpacing: 0.35,
      lineBreak: false,
      ellipsis: true,
    });

  const invoiceLabel = "INVOICE";
  const invoiceNumber = data.invoiceNumber ?? data.stripeInvoiceId;
  doc
    .fillColor(COLORS.accent)
    .font("SGBold")
    .fontSize(11)
    .text(invoiceLabel, PAGE_WIDTH - MARGIN_X - 220, 22, {
      width: 220,
      align: "right",
    });
  doc
    .fillColor(COLORS.white)
    .font("SGBold")
    .fontSize(22)
    .text(truncate(invoiceNumber, 28), PAGE_WIDTH - MARGIN_X - 280, 38, {
      width: 280,
      align: "right",
    });

  // --- Watermark ---
  try {
    doc.save();
    doc.opacity(0.04);
    doc.image(resolveInvoicePdfPath("assets", "york-watermark.png"), 205, 200, {
      width: 320,
      height: 336,
    });
    doc.restore();
  } catch {
    // ignore
  }

  let y = HEADER_HEIGHT + 30;

  // --- Meta row: FROM / BILL TO / DATES ---
  const col1X = MARGIN_X;
  const col2X = MARGIN_X + 160;
  const col3X = MARGIN_X + 360;
  const metaBottomPad = 28;

  const drawLabel = (text: string, x: number, top: number, width: number) => {
    doc
      .fillColor(COLORS.muted)
      .font("SGBold")
      .fontSize(10)
      .text(text, x, top, { width, characterSpacing: 0.6 });
  };

  drawLabel("FROM", col1X, y, 140);
  drawLabel("BILL TO", col2X, y, 180);
  drawLabel("DATE OF ISSUE", col3X, y, 150);

  const metaValueY = y + 18;
  doc
    .fillColor(COLORS.ink)
    .font("InterSemi")
    .fontSize(14)
    .text(truncate(data.business.name ?? "—", 28), col1X, metaValueY, {
      width: 140,
    });
  if (data.business.country) {
    doc
      .fillColor(COLORS.muted)
      .font("Inter")
      .fontSize(13)
      .text(data.business.country, col1X, metaValueY + 18, { width: 140 });
  }

  let billToY = metaValueY;
  if (data.customer.name) {
    doc
      .fillColor(COLORS.ink)
      .font("InterSemi")
      .fontSize(14)
      .text(truncate(data.customer.name, 36), col2X, billToY, {
        width: 180,
      });
    billToY += 18;
  }
  if (data.customer.country) {
    doc
      .fillColor(COLORS.muted)
      .font("Inter")
      .fontSize(13)
      .text(data.customer.country, col2X, billToY, { width: 180 });
    billToY += 16;
  }
  if (data.customer.email) {
    doc
      .fillColor(COLORS.muted)
      .font("Inter")
      .fontSize(12)
      .text(truncate(data.customer.email, 36), col2X, billToY, { width: 180 });
  }

  doc
    .fillColor(COLORS.ink)
    .font("InterMedium")
    .fontSize(13)
    .text(formatLongDate(data.issuedAt), col3X, metaValueY, { width: 150 });

  if (isPaid && data.paidAt) {
    drawLabel("DATE PAID", col3X, metaValueY + 28, 150);
    doc
      .fillColor(COLORS.ink)
      .font("InterMedium")
      .fontSize(13)
      .text(formatLongDate(data.paidAt), col3X, metaValueY + 46, {
        width: 150,
      });
  }

  const metaBlockBottom = Math.max(
    metaValueY + (data.business.country ? 36 : 18),
    billToY + 14,
    isPaid && data.paidAt ? metaValueY + 62 : metaValueY + 18,
  );

  y = metaBlockBottom + metaBottomPad;
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(PAGE_WIDTH - MARGIN_X, y)
    .strokeColor(COLORS.rule)
    .lineWidth(1)
    .stroke();

  y += 48;

  // --- Amount callout ---
  const calloutLabel = isPaid ? "AMOUNT PAID" : "AMOUNT DUE";
  const calloutAmount = isPaid ? data.amountPaid : data.amountDue;
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(MARGIN_X, y + 52)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();
  drawLabel(calloutLabel, MARGIN_X + 16, y, 160);
  doc
    .fillColor(COLORS.ink)
    .font("SGBold")
    .fontSize(22)
    .text(formatMoney(calloutAmount, data.currency), MARGIN_X + 16, y + 16, {
      width: 200,
    });
  const calloutSub = isPaid && data.paidAt
    ? `${data.currency.toUpperCase()} · paid ${formatShortDate(data.paidAt)}`
    : data.currency.toUpperCase();
  doc
    .fillColor(COLORS.muted)
    .font("Inter")
    .fontSize(12)
    .text(calloutSub, MARGIN_X + 16, y + 42, { width: 220 });

  y += 80;

  // --- Line table ---
  const qtyW = 60;
  const unitW = 100;
  const amtW = 100;
  const descW = PAGE_WIDTH - 2 * MARGIN_X - qtyW - unitW - amtW;
  const qtyX = MARGIN_X + descW;
  const unitX = qtyX + qtyW;
  const amtX = unitX + unitW;

  doc
    .fillColor(COLORS.muted)
    .font("SGBold")
    .fontSize(10);
  doc.text("DESCRIPTION", MARGIN_X, y, { width: descW });
  doc.text("QTY", qtyX, y, { width: qtyW, align: "center" });
  doc.text("UNIT PRICE", unitX, y, { width: unitW, align: "right" });
  doc.text("AMOUNT", amtX, y, { width: amtW, align: "right" });
  y += TABLE_HEADER_DIVIDER_GAP;
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(PAGE_WIDTH - MARGIN_X, y)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();
  y += 16;

  for (const item of data.lineItems) {
    const rowTop = y;
    doc
      .fillColor(COLORS.ink)
      .font("InterSemi")
      .fontSize(14)
      .text(truncate(item.description, 48), MARGIN_X, rowTop, {
        width: descW - 8,
      });
    let rowH = 18;
    if (item.detail) {
      doc
        .fillColor(COLORS.muted)
        .font("Inter")
        .fontSize(12)
        .text(truncate(item.detail, 48), MARGIN_X, rowTop + 18, {
          width: descW - 8,
        });
      rowH = 34;
    }
    doc
      .fillColor(COLORS.ink)
      .font("Inter")
      .fontSize(14)
      .text(String(item.quantity), qtyX, rowTop, {
        width: qtyW,
        align: "center",
      });
    doc.text(formatMoney(item.unitAmount, data.currency), unitX, rowTop, {
      width: unitW,
      align: "right",
    });
    doc
      .font("InterMedium")
      .text(formatMoney(item.amount, data.currency), amtX, rowTop, {
        width: amtW,
        align: "right",
      });
    y = rowTop + rowH + 12;
    doc
      .moveTo(MARGIN_X, y)
      .lineTo(PAGE_WIDTH - MARGIN_X, y)
      .strokeColor(COLORS.rule)
      .lineWidth(1)
      .stroke();
    y += 16;

    if (y > PAGE_HEIGHT - 200) {
      // Keep single-page invoices for typical Fuel charges; truncate excess visually.
      break;
    }
  }

  y += 20;

  // --- Totals ---
  const totalsW = 260;
  const totalsX = PAGE_WIDTH - MARGIN_X - totalsW;
  const drawTotalRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; muted?: boolean; size?: number },
  ) => {
    const color = opts?.muted ? COLORS.muted : COLORS.ink;
    doc
      .fillColor(color)
      .font(opts?.bold ? "SGBold" : "Inter")
      .fontSize(opts?.size ?? 14)
      .text(label, totalsX, y, { width: 140 });
    doc
      .fillColor(opts?.bold ? COLORS.amountPaidInk : color)
      .font(opts?.bold ? "SGBold" : "InterMedium")
      .fontSize(opts?.size ?? 14)
      .text(value, totalsX + 140, y, { width: 120, align: "right" });
    y += opts?.bold ? 28 : 24;
  };

  drawTotalRow("Subtotal", formatMoney(data.subtotal, data.currency));

  for (const discount of data.discounts) {
    drawTotalRow(
      discount.label,
      `−${formatMoney(discount.amount, data.currency)}`,
      { muted: true },
    );
  }
  for (const tax of data.taxes) {
    drawTotalRow(tax.label, formatMoney(tax.amount, data.currency), {
      muted: true,
    });
  }

  doc
    .moveTo(totalsX, y)
    .lineTo(PAGE_WIDTH - MARGIN_X, y)
    .strokeColor(COLORS.headerBg)
    .lineWidth(1.5)
    .stroke();
  y += 14;

  drawTotalRow(
    isPaid ? "Amount paid" : "Total",
    isPaid
      ? formatMoney(data.amountPaid, data.currency)
      : `${data.currency.toUpperCase()} ${formatMoney(data.total, data.currency)}`,
    { bold: true },
  );

  doc
    .moveTo(totalsX, y)
    .lineTo(PAGE_WIDTH - MARGIN_X, y)
    .strokeColor("#e6e6e6")
    .lineWidth(1)
    .stroke();
  y += 12;

  drawTotalRow(
    "Amount due",
    formatMoney(isPaid ? 0 : data.amountDue, data.currency),
    { muted: true },
  );

  if (data.payment) {
    doc
      .moveTo(totalsX, y)
      .lineTo(PAGE_WIDTH - MARGIN_X, y)
      .strokeColor(COLORS.rule)
      .lineWidth(1)
      .stroke();
    y += 12;
    doc
      .fillColor(COLORS.muted)
      .font("Inter")
      .fontSize(14)
      .text("Payment", totalsX, y, { width: totalsW });
    y += 18;
    const paidPart = data.payment.paidAt
      ? ` — ${formatShortDate(data.payment.paidAt)}`
      : "";
    doc
      .fillColor(COLORS.paymentMuted)
      .font("Inter")
      .fontSize(12)
      .text(
        `${data.payment.brand} ending in ${data.payment.last4}${paidPart}`,
        totalsX,
        y,
        { width: totalsW },
      );
  }

  // --- Footer ---
  const footerY = PAGE_HEIGHT - 60;
  doc
    .moveTo(48, footerY)
    .lineTo(PAGE_WIDTH - 48, footerY)
    .strokeColor(COLORS.rule)
    .lineWidth(1)
    .stroke();
  doc
    .fillColor(COLORS.footerInk)
    .font("SGMedium")
    .fontSize(13)
    .text("Thank you for using Fuel.", 48, footerY + 16, { width: 280 });
  doc
    .fillColor(COLORS.muted)
    .font("Inter")
    .fontSize(13)
    .text("York IE · york.ie", PAGE_WIDTH - 48 - 160, footerY + 16, {
      width: 160,
      align: "right",
    });

  doc.end();
  return done;
}
