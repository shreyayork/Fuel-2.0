import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_INITIATIVE_EXCLUDED_STATUSES,
  COMPLETED_INITIATIVE_STATUSES,
  initiativeIdsForMilestoneDetails,
  initiativeIdsForProgressDetails,
  isSuggestedInitiativeStatus,
  parseCompanyInitiativeOffset,
  parseCompanyInitiativePageSize,
  parseCompanyInitiativeStatus,
} from "./company-initiatives-paging";

describe("company initiatives paging", () => {
  it("defaults to the active first page with 20 items", () => {
    assert.equal(parseCompanyInitiativeStatus(null), "active");
    assert.equal(parseCompanyInitiativePageSize(null), 20);
    assert.equal(parseCompanyInitiativeOffset(null), 0);
  });

  it("accepts only supported page sizes", () => {
    assert.equal(parseCompanyInitiativePageSize("10"), 10);
    assert.equal(parseCompanyInitiativePageSize("20"), 20);
    assert.equal(parseCompanyInitiativePageSize("50"), 50);
    assert.equal(parseCompanyInitiativePageSize("25"), null);
    assert.equal(parseCompanyInitiativePageSize("not-a-number"), null);
  });

  it("accepts active/completed status and non-negative integer offsets", () => {
    assert.equal(parseCompanyInitiativeStatus("completed"), "completed");
    assert.equal(parseCompanyInitiativeStatus("suggested"), null);
    assert.equal(parseCompanyInitiativeOffset("40"), 40);
    assert.equal(parseCompanyInitiativeOffset("-1"), null);
    assert.equal(parseCompanyInitiativeOffset("1.5"), null);
  });

  it("defines active as every status outside suggestions and completion", () => {
    assert.deepEqual(ACTIVE_INITIATIVE_EXCLUDED_STATUSES, [
      "draft",
      "suggested",
      "completed",
      "complete",
    ]);
    assert.deepEqual(COMPLETED_INITIATIVE_STATUSES, ["completed", "complete"]);
    const exclusions = ACTIVE_INITIATIVE_EXCLUDED_STATUSES as readonly string[];
    assert.equal(exclusions.includes("paused"), false);
    assert.equal(exclusions.includes("archived"), false);
  });

  it("treats draft and suggested as suggested-initiative statuses", () => {
    assert.equal(isSuggestedInitiativeStatus("draft"), true);
    assert.equal(isSuggestedInitiativeStatus("suggested"), true);
    assert.equal(isSuggestedInitiativeStatus("active"), false);
  });

  it("loads milestones for suggested rows but skips their progress", () => {
    const items = [
      { id: "sug-1", status: "draft" },
      { id: "sug-2", status: "suggested" },
      { id: "act-1", status: "active" },
    ];
    assert.deepEqual(initiativeIdsForMilestoneDetails(items), ["sug-1", "sug-2", "act-1"]);
    assert.deepEqual(initiativeIdsForProgressDetails(items), ["act-1"]);
  });
});
