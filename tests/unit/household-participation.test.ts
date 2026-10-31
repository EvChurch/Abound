import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  classifyHouseholdAdults,
  completedParticipationWindow,
  participationInputSchema,
} from "@/lib/giving/household-participation-contract";
import {
  buildParticipationRows,
  getHouseholdParticipation,
} from "@/lib/giving/household-participation";
import {
  participationFromParams,
  participationHref,
} from "@/lib/giving/household-participation-params";
import type { LocalAppUser } from "@/lib/auth/types";

type Household = Parameters<typeof buildParticipationRows>[0][number];
function household(
  id: number,
  statuses: Array<number | null> = [65],
  campusRockId = 3,
): Household {
  return {
    rockId: id,
    name: `Family ${id}`,
    campusRockId,
    campus: { name: "Synthetic campus" },
    members: statuses.map((status, index) => ({
      rockId: id * 1000 + index,
      lastSyncRunId: "run1",
      lastSyncedAt: new Date(asOf),
      person: {
        rockId: id * 100 + index,
        connectionStatusValueRockId: status,
        connectionStatus: status === null ? null : { value: String(status) },
        givingGroupRockId: id,
        primaryFamilyRockId: id,
      },
    })),
  };
}
const actor: LocalAppUser = {
  active: true,
  id: "staff",
  auth0Subject: "auth0|staff",
  name: null,
  email: null,
  rockPersonId: null,
};
const asOf = "2026-10-24T12:00:00.000Z";
function client(
  households: Household[],
  opts: { configured?: boolean; status?: string; unsupported?: number } = {},
) {
  const tx = {
    platformFundSetting: {
      findMany: vi.fn(async () =>
        opts.configured === false ? [] : [{ accountRockId: 1, enabled: true }],
      ),
    },
    syncRun: {
      findFirst: vi.fn(async () => ({
        id: "run1",
        status: opts.status ?? "SUCCEEDED",
        completedAt: new Date(asOf),
        startedAt: new Date(asOf),
      })),
    },
    rockHousehold: { findMany: vi.fn(async () => households) },
    givingFact: {
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () =>
        opts.unsupported ? [{ householdRockId: 1 }] : [],
      ),
    },
    rockFinancialAccount: {
      findMany: vi.fn(async () => [{ rockId: 1, name: "Enabled fund" }]),
    },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    } as unknown as PrismaClient,
  };
}

describe("household participation definitions", () => {
  it("uses all adult statuses, explicit precedence and a labelled temporary negative proxy", () => {
    expect(
      classifyHouseholdAdults([
        { connectionStatusValueRockId: 1406 },
        { connectionStatusValueRockId: 146 },
        { connectionStatusValueRockId: 1229 },
        { connectionStatusValueRockId: 65 },
      ]),
    ).toMatchObject({
      stage: "GROWING",
      christianStatus: "UNKNOWN",
      proxyAdultCount: 1,
    });
    expect(
      classifyHouseholdAdults([
        { connectionStatusValueRockId: 65 },
        { connectionStatusValueRockId: 65 },
      ]).christianStatus,
    ).toBe("NON_CHRISTIAN");
    expect(
      classifyHouseholdAdults([
        {
          connectionStatusValueRockId: 65,
          explicitChristianStatus: "CHRISTIAN",
        },
        { connectionStatusValueRockId: null },
      ]),
    ).toMatchObject({
      christianStatus: "CHRISTIAN",
      mismatch: true,
      proxyAdultCount: 0,
    });
    expect(
      classifyHouseholdAdults([{ connectionStatusValueRockId: 1229 }])
        .christianStatus,
    ).toBe("UNKNOWN");
    expect(classifyHouseholdAdults([]).christianStatus).toBe("UNKNOWN");
  });
  it.each([1, 3, 6, 12, 24])(
    "uses %i completed UTC months and keeps current month out",
    (months) => {
      const w = completedParticipationWindow(
        new Date("2026-01-01T00:00:00Z"),
        months,
      );
      expect(w.end.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(w.latestStart.toISOString()).toBe("2025-12-01T00:00:00.000Z");
      expect(
        (w.end.getUTCFullYear() - w.start.getUTCFullYear()) * 12 +
          w.end.getUTCMonth() -
          w.start.getUTCMonth(),
      ).toBe(months);
    },
  );
  it("nets signed refunds exactly, includes annual givers and counts recorded donors distinctly", () => {
    const h = household(1, [65, 65]);
    const facts = [
      {
        householdRockId: 1,
        personRockId: 100,
        effectiveMonth: new Date("2026-03-01Z"),
        amount: "0.30",
      },
      {
        householdRockId: 1,
        personRockId: 100,
        effectiveMonth: new Date("2026-09-01Z"),
        amount: "-0.10",
      },
      {
        householdRockId: 1,
        personRockId: 101,
        effectiveMonth: new Date("2026-09-01Z"),
        amount: "-0.20",
      },
    ];
    const [zero] = buildParticipationRows([h], facts, new Date("2026-09-01Z"));
    expect(zero).toMatchObject({
      givingSelected: false,
      givingLatest: false,
      recordedGivers: 1,
    });
    const [annual] = buildParticipationRows(
      [h],
      facts.slice(0, 1),
      new Date("2026-09-01Z"),
    );
    expect(annual).toMatchObject({
      givingSelected: true,
      givingLatest: false,
      recordedGivers: 1,
    });
  });
  it("never duplicates a shared giving group's participation across families or campus filters", () => {
    const a = household(1),
      b = household(2, [65], 2);
    b.members[0].person.givingGroupRockId = 1;
    const rows = buildParticipationRows(
      [a, b],
      [
        {
          householdRockId: 1,
          personRockId: 100,
          effectiveMonth: new Date("2026-09-01Z"),
          amount: "50",
        },
      ],
      new Date("2026-09-01Z"),
    );
    expect(
      rows.every(
        (r) =>
          r.givingSelected === null &&
          r.reviewReasons.includes("AMBIGUOUS_GIVING_HOUSEHOLD"),
      ),
    ).toBe(true);
  });
  it("flags overlapping family membership and missing giving identity without dropping demographics", () => {
    const a = household(1),
      b = household(2);
    b.members[0].person.rockId = a.members[0].person.rockId;
    b.members[0].person.givingGroupRockId = null;
    b.members[0].person.primaryFamilyRockId = null;
    const rows = buildParticipationRows([a, b], [], new Date("2026-09-01Z"));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.givingSelected === null)).toBe(true);
    expect(rows[1].reviewReasons).toContain("MISSING_GIVING_HOUSEHOLD");
  });
  it("attributes a unique differing giving group once and flags the relationship for review", () => {
    const h = household(1);
    h.members[0].person.givingGroupRockId = 99;
    const [row] = buildParticipationRows(
      [h],
      [
        {
          householdRockId: 99,
          personRockId: 100,
          effectiveMonth: new Date("2026-09-01Z"),
          amount: "5",
        },
      ],
      new Date("2026-09-01Z"),
    );
    expect(row).toMatchObject({
      givingSelected: true,
      givingHouseholdRockIds: [99],
      reviewReasons: ["DIFFERENT_GIVING_HOUSEHOLD"],
    });
  });
  it("preserves the exact cohort and period through URLs and repeated fund selections", () => {
    const input = participationInputSchema.parse({
      months: 24,
      asOf,
      campusRockIds: [3, null],
      fundRockIds: [1, 2],
      christianStatus: "UNKNOWN",
      giving: "LATEST",
      snapshotId: "abc",
    });
    const href = participationHref(input, { after: 200 });
    const search = Object.fromEntries(
      new URL(href, "https://example.test").searchParams,
    );
    expect(participationFromParams(search)).toEqual({ ...input, after: 200 });
    expect(
      participationFromParams({ funds: ["", "1", "2"], christianStatus: "" }),
    ).toMatchObject({ fundRockIds: [1, 2], christianStatus: undefined });
  });
  it("rejects unsupported windows, unbounded pages and pagination without context", () => {
    for (const input of [
      { months: 2 },
      { first: 101 },
      { after: 3 },
      { unexpected: true },
    ])
      expect(participationInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("shared household participation service", () => {
  it("aggregates the full cohort and enumerates the exact count over multiple pages", async () => {
    const { db, tx } = client(
      Array.from({ length: 123 }, (_, i) =>
        household(i + 1, i % 2 === 0 ? [65] : [1229]),
      ),
    );
    const first = await getHouseholdParticipation(
      { asOf, months: 12, first: 50 },
      actor,
      db,
    );
    expect(first.totalCount).toBe(123);
    expect(first.summaries.at(-1)).toMatchObject({
      households: 123,
      nonChristian: 62,
      unknown: 61,
      participationRate: 0,
      christianParticipationRate: null,
    });
    const ids = first.rows.map((r) => r.rockId);
    let next = first.nextAfter;
    while (next !== null) {
      const page = await getHouseholdParticipation(
        { ...first.filters, after: next, snapshotId: first.snapshotId },
        actor,
        db,
      );
      ids.push(...page.rows.map((r) => r.rockId));
      next = page.nextAfter;
      expect(page.totalCount).toBe(first.totalCount);
    }
    expect(new Set(ids).size).toBe(123);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "RepeatableRead",
      timeout: 30000,
    });
    expect(tx.rockHousehold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          members: {
            some: expect.objectContaining({
              groupMemberStatus: 1,
              groupRoleRockId: 3,
              archived: false,
              person: {
                recordStatusValueRockId: 3,
                deceased: false,
                mergedIntoPersonRockId: null,
              },
            }),
          },
        }),
      }),
    );
    expect(tx.givingFact.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionRockId: { not: null },
          transactionDetailRockId: { not: null },
          scheduledTransactionDetailRockId: null,
          transaction: { transactionTypeValueRockId: 53, status: null },
          effectiveMonth: {
            gte: new Date("2025-10-01Z"),
            lt: new Date("2026-10-01Z"),
          },
        }),
      }),
    );
  });
  it("withholds unconfigured fund measures and incomplete/unsupported rates", async () => {
    const unconfigured = await getHouseholdParticipation(
      { asOf },
      actor,
      client([household(1)], { configured: false }).db,
    );
    expect(unconfigured.rows[0].givingSelected).toBeNull();
    expect(unconfigured.summaries.at(-1)?.giving).toBeNull();
    for (const opts of [
      { status: "PARTIAL" },
      { status: "STARTED" },
      { unsupported: 1 },
    ]) {
      const result = await getHouseholdParticipation(
        { asOf },
        actor,
        client([household(1)], opts).db,
      );
      expect(result.dataComplete).toBe(false);
      expect(result.summaries.at(-1)?.participationRate).toBeNull();
    }
  });
  it("validates fund scope and rejects stale snapshot continuations", async () => {
    const { db } = client([household(1)]);
    await expect(
      getHouseholdParticipation({ asOf, fundRockIds: [9] }, actor, db),
    ).rejects.toThrow("enabled platform funds");
    await expect(
      getHouseholdParticipation({ asOf, snapshotId: "old" }, actor, db),
    ).rejects.toThrow("Report data changed");
    await expect(
      getHouseholdParticipation({}, { ...actor, active: false }, db),
    ).rejects.toThrow("Local application access");
  });
  it("flags memberships not seen since the last full sync without silently dropping households", async () => {
    const h = household(1);
    h.members[0].lastSyncRunId = "older";
    h.members[0].lastSyncedAt = new Date("2025-01-01Z");
    const result = await getHouseholdParticipation(
      { asOf },
      actor,
      client([h]).db,
    );
    expect(result.totalCount).toBe(1);
    expect(result.dataComplete).toBe(false);
    expect(result.rows[0]).toMatchObject({
      givingSelected: null,
      reviewReasons: ["STALE_ADULT_MEMBERSHIP"],
    });
    expect(result.summaries.at(-1)?.participationRate).toBeNull();
  });
  it("keeps cross-campus ambiguity visible after campus filtering and withholds its rate", async () => {
    const a = household(1),
      b = household(2, [65], 2);
    b.members[0].person.givingGroupRockId = 1;
    const result = await getHouseholdParticipation(
      { asOf, campusRockIds: [3] },
      actor,
      client([a, b]).db,
    );
    expect(result.totalCount).toBe(1);
    expect(result.rows[0].givingSelected).toBeNull();
    expect(result.summaries.at(-1)).toMatchObject({
      households: 1,
      unresolvedGiving: 1,
      participationRate: null,
    });
  });
});

describe("saved household classification filters", () => {
  it("preserves the fields from URL filters and rejects unrecognised values", async () => {
    const { buildHouseholdFilter, paramsFromSearch } =
      await import("@/lib/list-views/page-params");
    const { getListViewFilterCatalog } =
      await import("@/lib/list-views/filter-catalog");
    const { validateFilterDefinition } =
      await import("@/lib/list-views/filter-schema");
    const filter = buildHouseholdFilter({
      householdStage: "GROWING",
      householdChristianStatus: "UNKNOWN",
    });
    expect(
      buildHouseholdFilter(
        paramsFromSearch(
          new URLSearchParams(
            "householdStage=GROWING&householdChristianStatus=UNKNOWN&after=next",
          ),
        ),
      ),
    ).toEqual(filter);
    expect(filter.conditions).toEqual([
      {
        type: "condition",
        field: "householdStage",
        operator: "EQUALS",
        value: "GROWING",
      },
      {
        type: "condition",
        field: "householdChristianStatus",
        operator: "EQUALS",
        value: "UNKNOWN",
      },
    ]);
    expect(
      validateFilterDefinition(filter, getListViewFilterCatalog("HOUSEHOLDS"))
        .ok,
    ).toBe(true);
    expect(
      validateFilterDefinition(
        buildHouseholdFilter({ householdStage: "Exploring" }),
        getListViewFilterCatalog("HOUSEHOLDS"),
      ).ok,
    ).toBe(false);
  });
});
