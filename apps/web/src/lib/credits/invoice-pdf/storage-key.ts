/** Deterministic S3 key for Fuel branded invoice PDFs (idempotent overwrite). */
export function billingInvoicePdfKey(
  accountId: string,
  stripeInvoiceId: string,
): string {
  const safeInvoiceId = stripeInvoiceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `accounts/${accountId}/invoices/${safeInvoiceId}.pdf`;
}
