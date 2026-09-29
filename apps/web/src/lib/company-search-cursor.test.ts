import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompanySearchOsBody,
  COMPANY_SEARCH_CURSOR_SORT_ID,
  COMPANY_SEARCH_CURSOR_SORT_SCORE_ID,
  decodeCompanySearchCursor,
  encodeCompanySearchCursor,
  InvalidCompanySearchCursorError,
  resolveCompanySearchPagination,
} from "./company-search-cursor";
import { clampSearchLimit, clampSearchOffset } from "./company-search-paging";

describe("company search cursor encode/decode", () => {
  it("round-trips search_after values", () => {
    const sa = ["000005f0-ac09-4c67-9086-92180e11b083"];
    const encoded = encodeCompanySearchCursor(sa);
    assert.notEqual(encoded, JSON.stringify(sa));
    assert.deepEqual(decodeCompanySearchCursor(encoded), sa);
  });

  it("treats empty cursor as first page", () => {
    assert.equal(decodeCompanySearchCursor(""), undefined);
    assert.equal(decodeCompanySearchCursor("   "), undefined);
  });

  it("rejects malformed cursors", () => {
    assert.throws(() => decodeCompanySearchCursor("not-base64!!!"), InvalidCompanySearchCursorError);
    assert.throws(
      () => decodeCompanySearchCursor(Buffer.from("{}", "utf8").toString("base64url")),
      InvalidCompanySearchCursorError,
    );
    assert.throws(
      () =>
        decodeCompanySearchCursor(
          Buffer.from(JSON.stringify({ v: 99, sa: ["x"] }), "utf8").toString("base64url"),
        ),
      InvalidCompanySearchCursorError,
    );
    assert.throws(
      () =>
        decodeCompanySearchCursor(
          Buffer.from(JSON.stringify({ v: 1, sa: [] }), "utf8").toString("base64url"),
        ),
      InvalidCompanySearchCursorError,
    );
  });
});

describe("resolveCompanySearchPagination", () => {
  const parseOffset = (raw: string | null, fallback: number) =>
    clampSearchOffset(raw == null || raw === "" ? fallback : Number(raw));

  it("keeps offset mode when only offset is provided", () => {
    const p = resolveCompanySearchPagination({
      offsetParam: "100",
      cursorParam: null,
      parseOffset,
    });
    assert.deepEqual(p, { mode: "offset", offset: 100 });
  });

  it("defaults to offset 0 when neither param is present", () => {
    const p = resolveCompanySearchPagination({
      offsetParam: null,
      cursorParam: null,
      parseOffset,
    });
    assert.deepEqual(p, { mode: "offset", offset: 0 });
  });

  it("enters cursor mode for empty cursor (first page)", () => {
    const p = resolveCompanySearchPagination({
      offsetParam: null,
      cursorParam: "",
      parseOffset,
    });
    assert.deepEqual(p, { mode: "cursor", searchAfter: undefined });
  });

  it("decodes cursor for subsequent pages", () => {
    const sa = ["abc-id"];
    const cursor = encodeCompanySearchCursor(sa);
    const p = resolveCompanySearchPagination({
      offsetParam: null,
      cursorParam: cursor,
      parseOffset,
    });
    assert.equal(p.mode, "cursor");
    if (p.mode === "cursor") assert.deepEqual(p.searchAfter, sa);
  });

  it("rejects offset + cursor together", () => {
    const p = resolveCompanySearchPagination({
      offsetParam: "0",
      cursorParam: "",
      parseOffset,
    });
    assert.deepEqual(p, { mode: "error", error: "offset_cursor_conflict" });
  });

  it("rejects invalid cursor", () => {
    const p = resolveCompanySearchPagination({
      offsetParam: null,
      cursorParam: "%%%",
      parseOffset,
    });
    assert.deepEqual(p, { mode: "error", error: "invalid_cursor" });
  });
});

describe("buildCompanySearchOsBody", () => {
  const query = { match_all: {} };
  const sourceFields = ["uuid", "name"];

  it("offset mode uses from and does not set search_after/sort", () => {
    const body = buildCompanySearchOsBody({
      limit: 50,
      query,
      sourceFields,
      pagination: { mode: "offset", offset: 9950 },
    });
    assert.equal(body.from, 9950);
    assert.equal(body.size, 50);
    assert.equal(body.search_after, undefined);
    assert.equal(body.sort, undefined);
  });

  it("cursor first page has no from and sorts by _id", () => {
    const body = buildCompanySearchOsBody({
      limit: 50,
      query,
      sourceFields,
      pagination: { mode: "cursor", hasTextQuery: false },
    });
    assert.equal("from" in body, false);
    assert.equal(body.search_after, undefined);
    assert.deepEqual(body.sort, COMPANY_SEARCH_CURSOR_SORT_ID);
    assert.equal(body.size, 50);
  });

  it("cursor continuation sets search_after and never from", () => {
    const sa = ["00001385-a61a-49e5-a3ac-5de0b5f707f7"];
    const body = buildCompanySearchOsBody({
      limit: 50,
      query,
      sourceFields,
      pagination: { mode: "cursor", searchAfter: sa, hasTextQuery: false },
    });
    assert.equal("from" in body, false);
    assert.deepEqual(body.search_after, sa);
    assert.deepEqual(body.sort, COMPANY_SEARCH_CURSOR_SORT_ID);
  });

  it("text query cursor uses score + _id sort", () => {
    const body = buildCompanySearchOsBody({
      limit: 10,
      query: { bool: { should: [{ match: { name: "stripe" } }] } },
      sourceFields,
      pagination: { mode: "cursor", hasTextQuery: true },
    });
    assert.equal("from" in body, false);
    assert.deepEqual(body.sort, COMPANY_SEARCH_CURSOR_SORT_SCORE_ID);
  });

  it("cursor body can page past the 10k from+size window (no from)", () => {
    // Simulate deep crawl: many search_after hops; body must never include `from`.
    let searchAfter: unknown[] | undefined;
    for (let page = 0; page < 5; page++) {
      const body = buildCompanySearchOsBody({
        limit: 50,
        query,
        sourceFields,
        pagination: { mode: "cursor", searchAfter, hasTextQuery: false },
      });
      assert.equal("from" in body, false);
      assert.ok(!("from" in body));
      // Pretend OpenSearch returned a sort key past the 10k window boundary.
      searchAfter = [`deep-page-${page * 50 + 10000}`];
      assert.ok(page === 0 || Array.isArray(body.search_after));
    }
  });

  it("preserves filters/query on cursor pages", () => {
    const filtered = {
      bool: { filter: [{ terms: { categories: ["fintech"] } }] },
    };
    const body = buildCompanySearchOsBody({
      limit: 50,
      query: filtered,
      sourceFields,
      pagination: {
        mode: "cursor",
        searchAfter: ["id-1"],
        hasTextQuery: false,
      },
    });
    assert.deepEqual(body.query, filtered);
    assert.equal("from" in body, false);
  });
});

describe("limit cap (shared with public API)", () => {
  it("remains capped at 50", () => {
    assert.equal(clampSearchLimit(50), 50);
    assert.equal(clampSearchLimit(51), 50);
    assert.equal(clampSearchLimit(999), 50);
  });
});

describe("nextCursor omission helper", () => {
  it("omits nextCursor when page is short (final page)", () => {
    const limit = 50;
    const hitsLen = 12;
    const lastSort = ["final-id"];
    const nextSearchAfter = hitsLen > 0 && hitsLen >= limit ? lastSort : undefined;
    assert.equal(nextSearchAfter, undefined);
  });

  it("keeps nextCursor when page is full", () => {
    const limit = 50;
    const hitsLen = 50;
    const lastSort = ["more-id"];
    const nextSearchAfter = hitsLen > 0 && hitsLen >= limit ? lastSort : undefined;
    assert.deepEqual(nextSearchAfter, lastSort);
    const nextCursor = encodeCompanySearchCursor(nextSearchAfter!);
    assert.ok(nextCursor.length > 0);
  });
});
