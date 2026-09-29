import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { THEMES } from "@/lib/theme";
import {
  COMPANY_SEARCH_INPUT_CLASS,
  COMPANY_SEARCH_PLACEHOLDER,
  companySearchPlaceholderCss,
} from "./company-search-placeholder";

describe("companySearchPlaceholderCss", () => {
  it("pins muted color + opacity so Tailwind currentcolor mix cannot hide placeholder", () => {
    const css = companySearchPlaceholderCss(THEMES.editorial.muted);
    assert.match(css, new RegExp(`\\.${COMPANY_SEARCH_INPUT_CLASS}::placeholder`));
    assert.match(css, new RegExp(`color:${THEMES.editorial.muted}`));
    assert.match(css, /opacity:1/);
  });

  it("keeps the public placeholder copy stable", () => {
    assert.equal(COMPANY_SEARCH_PLACEHOLDER, "Search companies…");
  });
});
