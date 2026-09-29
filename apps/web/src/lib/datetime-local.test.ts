import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  datetimeLocalToIsoUtc,
  parseDatetimeLocalWallClock,
  toDatetimeLocalValue,
} from "./datetime-local";

describe("datetime-local wall clock ↔ UTC", () => {
  it("maps 11:35 IST to 06:05 UTC (reported F20A-252 case)", () => {
    const ist = 330;
    const date = parseDatetimeLocalWallClock("2026-09-24T11:35", ist);
    assert.ok(date);
    assert.equal(date.toISOString(), "2026-09-24T06:05:00.000Z");
    assert.equal(toDatetimeLocalValue(date, ist), "2026-09-24T11:35");
    assert.notEqual(toDatetimeLocalValue(date, ist), "2026-09-24T05:05");
  });

  it("maps 11:35 US Eastern (UTC−5) to 16:35 UTC", () => {
    const est = -300;
    const date = parseDatetimeLocalWallClock("2026-03-15T11:35", est);
    assert.ok(date);
    assert.equal(date.toISOString(), "2026-03-15T16:35:00.000Z");
    assert.equal(toDatetimeLocalValue(date, est), "2026-03-15T11:35");
  });

  it("round-trips via ISO for FormData wire format", () => {
    const iso = datetimeLocalToIsoUtc("2026-09-24T11:35", 330);
    assert.equal(iso, "2026-09-24T06:05:00.000Z");
    const back = parseDatetimeLocalWallClock(iso!, 330);
    assert.ok(back);
    assert.equal(back.toISOString(), iso);
  });

  it("does not treat bare datetime-local as UTC when offset is IST", () => {
    // Bug pattern: `new Date("2026-09-24T11:35")` on a UTC server stores 11:35Z.
    const wrongUtcServer = new Date("2026-09-24T11:35:00.000Z");
    const correct = parseDatetimeLocalWallClock("2026-09-24T11:35", 330)!;
    assert.notEqual(wrongUtcServer.toISOString(), correct.toISOString());
    assert.equal(
      toDatetimeLocalValue(wrongUtcServer, 330),
      "2026-09-24T17:05",
    );
  });
});
