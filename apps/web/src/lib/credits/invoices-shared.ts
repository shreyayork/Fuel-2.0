/** Shared billing invoice constants (safe for client + server). */
export const BILLING_INVOICE_PAGE_SIZE = 20;

export const BILLING_INVOICES_EMPTY_COPY =
  "No invoices yet. Invoices will appear after the first successful payment.";

export function fuelInvoicePdfHeaders(
  filename: string,
  disposition: "inline" | "attachment",
): Record<string, string> {
  const safeFilename = filename.replace(/["\\\r\n]/g, "_");
  return {
    "content-type": "application/pdf",
    "content-disposition": `${disposition}; filename="${safeFilename}"`,
    "cache-control": "private, no-store",
  };
}
