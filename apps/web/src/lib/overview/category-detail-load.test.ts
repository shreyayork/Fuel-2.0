import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCategoryDetailPayloadLoading } from "./category-detail-load";

describe("isCategoryDetailPayloadLoading", () => {
  it("true while detail missing and no error", () => {
    assert.equal(
      isCategoryDetailPayloadLoading({ detail: null, loadError: null }),
      true,
    );
  });

  it("false once detail arrives", () => {
    assert.equal(
      isCategoryDetailPayloadLoading({ detail: { ok: true }, loadError: null }),
      false,
    );
  });

  it("false on error so empty/error UI can show", () => {
    assert.equal(
      isCategoryDetailPayloadLoading({
        detail: null,
        loadError: "Could not load this track.",
      }),
      false,
    );
  });
});
