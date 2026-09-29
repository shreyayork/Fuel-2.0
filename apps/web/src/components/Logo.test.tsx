import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { logoMarkMode } from "./Logo";

describe("logoMarkMode", () => {
  it("shows initials when no src (logo absent)", () => {
    assert.equal(logoMarkMode(null, null), "initials");
    assert.equal(logoMarkMode(null, "https://cdn.example.com/a.png"), "initials");
  });

  it("shows initials while src exists but has not loaded yet (async claim window)", () => {
    assert.equal(logoMarkMode("https://cdn.example.com/a.png", null), "initials");
  });

  it("shows image only after successful load for the current src", () => {
    const src = "https://cdn.example.com/a.png";
    assert.equal(logoMarkMode(src, src), "image");
  });

  it("falls back to initials when load fails / src mismatches (broken URL)", () => {
    assert.equal(
      logoMarkMode("https://cdn.example.com/missing.png", null),
      "initials",
    );
    assert.equal(
      logoMarkMode("https://cdn.example.com/b.png", "https://cdn.example.com/a.png"),
      "initials",
    );
  });

  it("swaps to image when claim resolves then logo arrives (loadedSrc catches up)", () => {
    const src = "https://static.york.ie/images/companies/claimed-uuid/logo";
    assert.equal(logoMarkMode(src, null), "initials");
    assert.equal(logoMarkMode(src, src), "image");
  });
});
