import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleSuperAdminUserRows,
  buildCognitoListStreams,
  buildNextUsersCursor,
  cognitoNameSearchPrefix,
  compareSignedUpAt,
  decodeUsersCursor,
  deriveUserLifecycle,
  encodeUsersCursor,
  escapeIlikePattern,
  mapCognitoListUser,
  normalizeUsersSearch,
  parseSuperAdminUsersQuery,
  pickPrimaryMembership,
  sanitizeCognitoFilterValue,
  sortBySignedUpAt,
  summarizePlan,
  type SuperAdminMembershipRow,
} from "./user-lifecycle";

function membership(
  partial: Partial<SuperAdminMembershipRow> & { email: string; accountId: string },
): SuperAdminMembershipRow {
  return {
    accountName: "Acme",
    accountType: "ORGANIZATION",
    role: "member",
    isCreator: false,
    companyName: null,
    planSlug: "free",
    cancelAtPeriodEnd: false,
    periodEndsAt: null,
    topUpBalance: 0,
    memberCreatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("sanitizeCognitoFilterValue", () => {
  it("strips quotes and backslashes", () => {
    assert.equal(sanitizeCognitoFilterValue('jane\\"x'), "janex");
  });
});

describe("buildCognitoListStreams", () => {
  it("lists the pool when query is empty", () => {
    assert.deepEqual(buildCognitoListStreams("  "), [{ id: "t" }]);
  });

  it("uses exact email match for a full address", () => {
    assert.deepEqual(buildCognitoListStreams("Jane@York.ie"), [
      { id: "email", filter: 'email = "jane@york.ie"' },
    ]);
  });

  it("preserves plus-addressing in email filters", () => {
    assert.deepEqual(buildCognitoListStreams("dev+qa@york.ie"), [
      { id: "email", filter: 'email = "dev+qa@york.ie"' },
    ]);
  });

  it("uses email prefix plus Title Case name prefixes for non-email queries", () => {
    const streams = buildCognitoListStreams("ann");
    assert.equal(streams.length, 4);
    assert.equal(streams[0]?.filter, 'email ^= "ann"');
    assert.equal(streams[1]?.filter, 'given_name ^= "Ann"');
    assert.equal(streams[2]?.filter, 'family_name ^= "Ann"');
    assert.equal(streams[3]?.filter, 'name ^= "Ann"');
  });
});

describe("mapCognitoListUser", () => {
  it("keeps only allowlisted attributes and requires email", () => {
    const mapped = mapCognitoListUser({
      username: "abc",
      userStatus: "CONFIRMED",
      enabled: true,
      userCreateDate: new Date("2026-04-01T12:00:00.000Z"),
      attributes: [
        { Name: "email", Value: "Pat@York.ie" },
        { Name: "given_name", Value: "Pat" },
        { Name: "family_name", Value: "Lee" },
        { Name: "email_verified", Value: "true" },
        { Name: "phone_number", Value: "+15555550100" },
        { Name: "custom:secret", Value: "nope" },
      ],
    });
    assert.deepEqual(mapped, {
      username: "abc",
      email: "pat@york.ie",
      name: "Pat Lee",
      emailVerified: true,
      status: "CONFIRMED",
      enabled: true,
      createdAt: "2026-04-01T12:00:00.000Z",
    });
    assert.equal(JSON.stringify(mapped).includes("phone"), false);
    assert.equal(JSON.stringify(mapped).includes("nope"), false);
  });

  it("returns null without an email", () => {
    assert.equal(
      mapCognitoListUser({
        username: "uuid",
        attributes: [{ Name: "given_name", Value: "Pat" }],
      }),
      null,
    );
  });
});

describe("deriveUserLifecycle", () => {
  it("prefers disabled and unconfirmed over account state", () => {
    assert.equal(
      deriveUserLifecycle({
        enabled: false,
        cognitoStatus: "CONFIRMED",
        accountCreated: true,
        onboardingCompleted: true,
      }).key,
      "disabled",
    );
    assert.equal(
      deriveUserLifecycle({
        enabled: true,
        cognitoStatus: "UNCONFIRMED",
        accountCreated: false,
        onboardingCompleted: false,
      }).label,
      "Email unconfirmed",
    );
  });

  it("uses product terms for claim vs invite", () => {
    assert.equal(
      deriveUserLifecycle({
        enabled: true,
        cognitoStatus: "CONFIRMED",
        accountCreated: false,
        onboardingCompleted: false,
      }).label,
      "Onboarding incomplete",
    );
    assert.equal(
      deriveUserLifecycle({
        enabled: true,
        cognitoStatus: "CONFIRMED",
        accountCreated: true,
        onboardingCompleted: true,
      }).label,
      "Onboarding completed",
    );
    assert.equal(
      deriveUserLifecycle({
        enabled: true,
        cognitoStatus: "CONFIRMED",
        accountCreated: true,
        onboardingCompleted: false,
      }).label,
      "Account created",
    );
  });
});

describe("summarizePlan", () => {
  const periodEnd = Date.parse("2026-09-01T00:00:00.000Z");

  it("returns no plan without an account", () => {
    assert.equal(
      summarizePlan({
        hasAccount: false,
        planSlug: "pro",
        cancelAtPeriodEnd: false,
        periodEndsAt: null,
        topUpBalance: null,
      }).kind,
      "none",
    );
  });

  it("maps free, active pro, canceling, and expired", () => {
    assert.equal(
      summarizePlan({
        hasAccount: true,
        planSlug: "free",
        cancelAtPeriodEnd: false,
        periodEndsAt: null,
        topUpBalance: 0,
      }).label,
      "Free",
    );
    assert.equal(
      summarizePlan({
        hasAccount: true,
        planSlug: "pro",
        cancelAtPeriodEnd: false,
        periodEndsAt: periodEnd,
        topUpBalance: 500,
      }).label,
      "Pro",
    );
    assert.equal(
      summarizePlan({
        hasAccount: true,
        planSlug: "pro",
        cancelAtPeriodEnd: true,
        periodEndsAt: periodEnd,
        topUpBalance: 0,
        now: Date.parse("2026-08-01T00:00:00.000Z"),
      }).kind,
      "pro_canceling",
    );
    assert.equal(
      summarizePlan({
        hasAccount: true,
        planSlug: "pro",
        cancelAtPeriodEnd: true,
        periodEndsAt: periodEnd,
        topUpBalance: 0,
        now: Date.parse("2026-09-02T00:00:00.000Z"),
      }).kind,
      "expired",
    );
  });
});

describe("assembleSuperAdminUserRows", () => {
  it("overlays memberships and treats creator as onboarding completed", () => {
    const rows = assembleSuperAdminUserRows(
      [
        {
          username: "a",
          email: "founder@acme.com",
          name: "Founder",
          emailVerified: true,
          status: "CONFIRMED",
          enabled: true,
          createdAt: "2026-01-02T00:00:00.000Z",
        },
        {
          username: "b",
          email: "ghost@acme.com",
          name: null,
          emailVerified: true,
          status: "CONFIRMED",
          enabled: true,
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      [
        membership({
          email: "founder@acme.com",
          accountId: "acc_1",
          role: "owner",
          isCreator: true,
          planSlug: "pro",
          companyName: "Acme Co",
        }),
      ],
    );
    assert.equal(rows[0]?.lifecycle.key, "onboarding_completed");
    assert.equal(rows[0]?.workspace?.name, "Acme");
    assert.equal(rows[0]?.workspace?.companyName, "Acme Co");
    assert.equal(rows[0]?.plan.kind, "pro");
    assert.equal(rows[1]?.lifecycle.key, "onboarding_incomplete");
    assert.equal(rows[1]?.plan.kind, "none");
    assert.equal(rows[1]?.workspace, null);
  });
});

describe("pickPrimaryMembership", () => {
  it("prefers creator then owner", () => {
    const owner = membership({
      email: "a@x.com",
      accountId: "1",
      role: "owner",
      isCreator: false,
    });
    const creator = membership({
      email: "a@x.com",
      accountId: "2",
      role: "member",
      isCreator: true,
    });
    assert.equal(pickPrimaryMembership([owner, creator])?.accountId, "2");
  });
});

describe("users cursor", () => {
  it("rejects a cursor bound to a different query", () => {
    const encoded = encodeUsersCursor({
      v: 2,
      q: "ann",
      tokens: { email: "tok" },
      done: [],
      s: "desc",
    });
    assert.equal(decodeUsersCursor(encoded, "bob", "desc"), "invalid");
    const parsed = parseSuperAdminUsersQuery(
      new URLSearchParams({ q: "bob", cursor: encoded }),
    );
    assert.equal(parsed.ok, false);
  });

  it("rejects a cursor bound to a different sort", () => {
    const encoded = encodeUsersCursor({
      v: 2,
      q: "ann",
      tokens: {},
      done: [],
      o: 20,
      s: "desc",
    });
    assert.equal(decodeUsersCursor(encoded, "ann", "asc"), "invalid");
  });

  it("builds a next cursor only while a stream remains", () => {
    assert.equal(
      buildNextUsersCursor({
        q: "",
        sort: "desc",
        streams: [{ id: "t", done: true }],
      }),
      null,
    );
    const next = buildNextUsersCursor({
      q: "ann",
      sort: "asc",
      streams: [{ id: "email", token: "n", done: false }],
    });
    assert.equal(next?.tokens.email, "n");
    assert.equal(next?.s, "asc");
  });
});

describe("signed-up sort", () => {
  it("title-cases Cognito name prefixes", () => {
    assert.equal(cognitoNameSearchPrefix("ann"), "Ann");
    assert.equal(cognitoNameSearchPrefix("MARY JANE"), "Mary Jane");
  });

  it("orders newest first by default and keeps nulls last", () => {
    const rows = sortBySignedUpAt(
      [
        { createdAt: "2026-01-01T00:00:00.000Z" },
        { createdAt: null },
        { createdAt: "2026-03-01T00:00:00.000Z" },
      ],
      "desc",
    );
    assert.equal(rows[0]?.createdAt, "2026-03-01T00:00:00.000Z");
    assert.equal(rows[1]?.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(rows[2]?.createdAt, null);
    assert.ok(compareSignedUpAt("2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "desc") < 0);
  });
});

describe("escapeIlikePattern", () => {
  it("strips wildcard characters", () => {
    assert.equal(escapeIlikePattern("a%b_c"), "abc");
  });
});

describe("parseSuperAdminUsersQuery", () => {
  it("defaults limit 20, empty search, and signed-up desc", () => {
    const parsed = parseSuperAdminUsersQuery(new URLSearchParams());
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.q, "");
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.sort, "desc");
    assert.equal(parsed.cursor, null);
  });
});

describe("normalizeUsersSearch", () => {
  it("restores plus-addressing after form-urlencoded + → space decode", () => {
    assert.equal(
      normalizeUsersSearch("soumya.m 110@york.ie"),
      "soumya.m+110@york.ie",
    );
  });

  it("decodes a percent-encoded plus email (double-encode client path)", () => {
    assert.equal(
      normalizeUsersSearch("soumya.m%2B110%40york.ie"),
      "soumya.m+110@york.ie",
    );
  });

  it("keeps spaces in name searches", () => {
    assert.equal(normalizeUsersSearch("Ann Lee"), "Ann Lee");
  });
});
