import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  excludeClaimedCompany,
  recentCompaniesForAccount,
  type RecentCompany,
} from "./recent-companies-shared";

const entries: RecentCompany[] = [
  {
    uuid: "global-swiggy",
    name: "Swiggy",
    viewedAt: 4,
  },
  {
    uuid: "cat_account-a",
    name: "Account A Company",
    accountId: "account-a",
    viewedAt: 3,
  },
  {
    uuid: "global-zomato",
    name: "Zomato",
    viewedAt: 2,
  },
  {
    uuid: "cat_account-b",
    name: "Account B Company",
    accountId: "account-b",
    viewedAt: 1,
  },
];

describe("recentCompaniesForAccount", () => {
  it("shows global companies across accounts and scopes catalog companies", () => {
    assert.deepEqual(
      recentCompaniesForAccount(entries, "account-a").map((entry) => entry.uuid),
      ["global-swiggy", "cat_account-a", "global-zomato"],
    );
    assert.deepEqual(
      recentCompaniesForAccount(entries, "account-b").map((entry) => entry.uuid),
      ["global-swiggy", "global-zomato", "cat_account-b"],
    );
  });

  it("preserves global ordering when no account is active", () => {
    assert.deepEqual(
      recentCompaniesForAccount(entries, null).map((entry) => entry.uuid),
      ["global-swiggy", "global-zomato"],
    );
  });
});

describe("excludeClaimedCompany", () => {
  it("removes the claimed/primary company from the list", () => {
    assert.deepEqual(
      excludeClaimedCompany(entries, "global-swiggy").map((e) => e.uuid),
      ["cat_account-a", "global-zomato", "cat_account-b"],
    );
  });

  it("is a no-op when primary is unset", () => {
    assert.deepEqual(
      excludeClaimedCompany(entries, null).map((e) => e.uuid),
      entries.map((e) => e.uuid),
    );
    assert.deepEqual(
      excludeClaimedCompany(entries, undefined).map((e) => e.uuid),
      entries.map((e) => e.uuid),
    );
  });
});
