import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideDataRoomAccess } from "./access-policy";

describe("decideDataRoomAccess", () => {
  it("allows catalog companies owned by the account", () => {
    assert.equal(
      decideDataRoomAccess({
        isCatalog: true,
        catalogOwnedByAccount: true,
        isPrimaryCompany: false,
        portfolioManagerEnabled: false,
      }),
      "allow",
    );
  });

  it("rejects catalog companies not owned by the account", () => {
    assert.equal(
      decideDataRoomAccess({
        isCatalog: true,
        catalogOwnedByAccount: false,
        isPrimaryCompany: false,
        portfolioManagerEnabled: true,
      }),
      "not_found",
    );
  });

  it("allows the primary company workspace", () => {
    assert.equal(
      decideDataRoomAccess({
        isCatalog: false,
        catalogOwnedByAccount: false,
        isPrimaryCompany: true,
        portfolioManagerEnabled: false,
      }),
      "allow",
    );
  });

  it("allows external fuel-data companies for portfolio managers", () => {
    assert.equal(
      decideDataRoomAccess({
        isCatalog: false,
        catalogOwnedByAccount: false,
        isPrimaryCompany: false,
        portfolioManagerEnabled: true,
      }),
      "allow",
    );
  });

  it("allows external fuel-data companies for non-primary founders", () => {
    assert.equal(
      decideDataRoomAccess({
        isCatalog: false,
        catalogOwnedByAccount: false,
        isPrimaryCompany: false,
        portfolioManagerEnabled: false,
      }),
      "allow",
    );
  });
});
