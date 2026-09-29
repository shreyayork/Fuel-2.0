import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPageNoticeUpdate,
  EMPTY_PAGE_NOTICE,
  flushPendingPageNotice,
} from "./page-notice";

describe("applyPageNoticeUpdate", () => {
  it("clears page and pending when message is null", () => {
    assert.deepEqual(
      applyPageNoticeUpdate(
        { page: "visible", pending: "queued" },
        null,
        false,
      ),
      EMPTY_PAGE_NOTICE,
    );
  });

  it("queues notice while drawer blocks the page banner", () => {
    assert.deepEqual(
      applyPageNoticeUpdate(EMPTY_PAGE_NOTICE, "Intelligence generated.", true),
      { page: null, pending: "Intelligence generated." },
    );
  });

  it("shows notice immediately when drawer is not blocking", () => {
    assert.deepEqual(
      applyPageNoticeUpdate(EMPTY_PAGE_NOTICE, "Intelligence generated.", false),
      { page: "Intelligence generated.", pending: null },
    );
  });
});

describe("flushPendingPageNotice", () => {
  it("promotes pending notice after drawer closes", () => {
    assert.deepEqual(
      flushPendingPageNotice(
        { page: null, pending: "Initiatives generating…" },
        false,
      ),
      { page: "Initiatives generating…", pending: null },
    );
  });

  it("keeps pending notice while drawer still blocks", () => {
    const state = { page: null, pending: "Initiatives generating…" };
    assert.deepEqual(flushPendingPageNotice(state, true), state);
  });
});
