import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toastVariantIcon, type ToastVariant } from "./toast-variant-icon";

describe("toastVariantIcon", () => {
  const cases: Array<[ToastVariant, string]> = [
    ["success", "✓"],
    ["error", "!"],
    ["warning", "•"],
    ["info", "•"],
  ];

  for (const [variant, glyph] of cases) {
    it(`${variant} → ${glyph}`, () => {
      assert.equal(toastVariantIcon(variant), glyph);
    });
  }
});
