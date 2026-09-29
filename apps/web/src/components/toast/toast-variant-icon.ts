export type ToastVariant = "error" | "success" | "warning" | "info";

/** Glyph inside the filled variant badge — matches Fuel success/error conventions. */
export function toastVariantIcon(variant: ToastVariant): string {
  switch (variant) {
    case "error":
      return "!";
    case "success":
      return "✓";
    case "warning":
    case "info":
      return "•";
  }
}
