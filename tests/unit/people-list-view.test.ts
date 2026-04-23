import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import { listPeople } from "@/lib/list-views/people-list";

const adminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN",
};

function client({
  givingFactFindMany = vi.fn(async () => []),
  givingPledgeFindMany = vi.fn(async () => []),
  pledgeDecisionFindMany = vi.fn(async () => []),
  rockFinancialAccountFindMany = vi.fn(async () => []),
  lifecycleSnapshotFindMany = vi.fn(async () => []),
  rockPersonFindMany = vi.fn(async () => []),
}: {
  givingFactFindMany?: ReturnType<typeof vi.fn>;
  givingPledgeFindMany?: ReturnType<typeof vi.fn>;
  lifecycleSnapshotFindMany?: ReturnType<typeof vi.fn>;
  pledgeDecisionFindMany?: ReturnType<typeof vi.fn>;
  rockFinancialAccountFindMany?: ReturnType<typeof vi.fn>;
  rockPersonFindMany?: ReturnType<typeof vi.fn>;
} = {}) {
  const findMany = rockPersonFindMany;

  return {
    givingFact: {
      findMany: givingFactFindMany,
    },
    givingPledge: {
      findMany: givingPledgeFindMany,
    },
    givingPledgeRecommendationDecision: {
      findMany: pledgeDecisionFindMany,
    },
    givingLifecycleSnapshot: {
      findMany: lifecycleSnapshotFindMany,
    },
    rockFinancialAccount: {
      findMany: rockFinancialAccountFindMany,
    },
    rockPerson: {
      findMany,
    },
  } as unknown as PrismaClient & {
    givingFact: {
      findMany: typeof givingFactFindMany;
    };
    givingPledge: {
      findMany: typeof givingPledgeFindMany;
    };
    givingPledgeRecommendationDecision: {
      findMany: typeof pledgeDecisionFindMany;
    };
    givingLifecycleSnapshot: {
      findMany: typeof lifecycleSnapshotFindMany;
    };
    rockFinancialAccount: {
      findMany: typeof rockFinancialAccountFindMany;
    };
    rockPerson: {
      findMany: typeof findMany;
    };
  };
}

describe("people list view", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults people results to adults", async () => {
    const prisma = client();

    await listPeople({ first: 10 }, adminUser, prisma);

    expect(prisma.rockPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              householdMembers: {
                some: {
                  archived: false,
                  household: {
                    active: true,
                    archived: false,
                  },
                  groupRole: {
                    name: {
                      equals: "Adult",
                      mode: "insensitive",
                    },
                  },
                },
              },
            }),
          ]),
        }),
      }),
    );
  });

  it("allows filtering to children explicitly", async () => {
    const prisma = client();

    await listPeople(
      {
        filterDefinition: {
          conditions: [
            {
              field: "ageGroup",
              operator: "EQUALS",
              type: "condition",
              value: "CHILDREN",
            },
          ],
          mode: "all",
          type: "group",
        },
        first: 10,
      },
      adminUser,
      prisma,
    );

    expect(prisma.rockPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              householdMembers: {
                some: {
                  archived: false,
                  household: {
                    active: true,
                    archived: false,
                  },
                },
              },
            }),
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  householdMembers: {
                    some: {
                      archived: false,
                      household: {
                        active: true,
                        archived: false,
                      },
                      groupRole: {
                        name: {
                          equals: "Child",
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it("filters people by Rock connection status without removing record status support", async () => {
    const prisma = client();

    await listPeople(
      {
        filterDefinition: {
          conditions: [
            {
              field: "connectionStatus",
              operator: "EQUALS",
              type: "condition",
              value: "Member",
            },
            {
              field: "recordStatus",
              operator: "EQUALS",
              type: "condition",
              value: "Active",
            },
          ],
          mode: "all",
          type: "group",
        },
        first: 10,
      },
      adminUser,
      prisma,
    );

    expect(prisma.rockPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  connectionStatus: {
                    value: "Member",
                  },
                }),
                expect.objectContaining({
                  recordStatus: {
                    value: "Active",
                  },
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it("filters lifecycle selections through giving facts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00Z"));

    const givingFactFindMany = vi.fn(async () => [
      {
        amount: "25",
        effectiveMonth: new Date("2026-04-01T00:00:00Z"),
        householdRockId: 1001,
        id: "fact_1",
        occurredAt: new Date("2026-04-10T00:00:00Z"),
        personRockId: 101,
        reliabilityKind: "ONE_TIME",
      },
      {
        amount: "25",
        effectiveMonth: new Date("2025-01-01T00:00:00Z"),
        householdRockId: 1002,
        id: "fact_2",
        occurredAt: new Date("2025-01-10T00:00:00Z"),
        personRockId: 202,
        reliabilityKind: "ONE_TIME",
      },
    ]);
    const prisma = client({
      givingFactFindMany,
      lifecycleSnapshotFindMany: vi.fn(async () => {
        throw Object.assign(new Error("Missing lifecycle snapshot table"), {
          code: "P2021",
        });
      }),
    });

    await listPeople(
      {
        filterDefinition: {
          conditions: [
            {
              field: "lifecycle",
              operator: "EQUALS",
              type: "condition",
              value: "NEW",
            },
          ],
          mode: "all",
          type: "group",
        },
        first: 10,
      },
      adminUser,
      prisma,
    );

    expect(prisma.rockPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ rockId: { in: [101] } }),
          ]),
        }),
      }),
    );
  });

  it("summarizes pledge status and outstanding recommendations for display rows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00Z"));

    const prisma = client({
      givingFactFindMany: vi.fn(async (query) => {
        if (query?.where?.personRockId?.in) {
          return [
            ...Array.from({ length: 9 }, (_, index) => ({
              accountRockId: 20,
              amount: "50",
              effectiveMonth: new Date(Date.UTC(2025, 7 + index, 1)),
              occurredAt: new Date(Date.UTC(2025, 7 + index, 10)),
              personRockId: 101,
              reliabilityKind: "ONE_TIME",
            })),
          ];
        }

        return [];
      }),
      givingPledgeFindMany: vi.fn(async () => [
        {
          account: { name: "General Fund", rockId: 10 },
          accountRockId: 10,
          amount: "100",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          endDate: null,
          id: "pledge_active",
          period: "MONTHLY",
          personRockId: 101,
          source: "STAFF_ENTERED",
          startDate: null,
          status: "ACTIVE",
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
      pledgeDecisionFindMany: vi.fn(async () => []),
      rockFinancialAccountFindMany: vi.fn(async () => [
        { active: true, name: "Building Fund", rockId: 20 },
        { active: true, name: "General Fund", rockId: 10 },
      ]),
      rockPersonFindMany: vi.fn(async () => [
        {
          _count: { staffTasks: 0 },
          connectionStatus: { value: "Prospect" },
          deceased: false,
          email: "pat@example.com",
          emailActive: true,
          firstName: "Pat",
          lastName: "Pledge",
          lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
          nickName: null,
          photoRockId: null,
          primaryCampus: null,
          primaryHousehold: null,
          recordStatus: { value: "Active" },
          rockId: 101,
        },
      ]),
    });

    const connection = await listPeople({ first: 10 }, adminUser, prisma);

    expect(connection.edges[0]?.node.pledgeSummary).toEqual({
      active: [
        {
          accountName: "General Fund",
          amount: "100.00",
          period: "MONTHLY",
        },
      ],
      draft: [],
      review: [
        {
          accountName: "Building Fund",
          amount: "50.00",
          period: "MONTHLY",
        },
      ],
    });
  });

  it("loads lifecycle snapshots into people display rows", async () => {
    const prisma = client({
      lifecycleSnapshotFindMany: vi.fn(async () => [
        {
          lifecycle: "NEW",
          personRockId: 101,
          summary: "First gift in the latest window.",
          windowEndedAt: new Date("2026-04-20T00:00:00Z"),
        },
        {
          lifecycle: "NEW",
          personRockId: 101,
          summary: "Older duplicate lifecycle snapshot.",
          windowEndedAt: new Date("2026-04-19T00:00:00Z"),
        },
      ]),
      rockPersonFindMany: vi.fn(async () => [
        {
          _count: { staffTasks: 0 },
          connectionStatus: { value: "Prospect" },
          deceased: false,
          email: null,
          emailActive: null,
          firstName: "Pat",
          lastName: "Lifecycle",
          lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
          nickName: null,
          photoRockId: null,
          primaryCampus: null,
          primaryHousehold: null,
          recordStatus: { value: "Active" },
          rockId: 101,
        },
      ]),
    });

    const connection = await listPeople({ first: 10 }, adminUser, prisma);

    expect(connection.edges[0]?.node.lifecycle).toEqual([
      {
        lifecycle: "NEW",
        summary: "First gift in the latest window.",
        windowEndedAt: new Date("2026-04-20T00:00:00Z"),
      },
    ]);
    expect(prisma.givingLifecycleSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          personRockId: { in: [101] },
          resource: "PERSON",
        },
      }),
    );
  });

  it("filters people to rows with selected pledge management states", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00Z"));

    const prisma = client({
      givingFactFindMany: vi.fn(async () => [
        ...Array.from({ length: 9 }, (_, index) => ({
          accountRockId: 20,
          amount: "50",
          effectiveMonth: new Date(Date.UTC(2025, 7 + index, 1)),
          occurredAt: new Date(Date.UTC(2025, 7 + index, 10)),
          personRockId: 101,
          reliabilityKind: "ONE_TIME",
        })),
        {
          accountRockId: 20,
          amount: "50",
          effectiveMonth: new Date("2026-04-01T00:00:00Z"),
          occurredAt: new Date("2026-04-10T00:00:00Z"),
          personRockId: 202,
          reliabilityKind: "ONE_TIME",
        },
      ]),
      givingPledgeFindMany: vi.fn(async () => []),
      pledgeDecisionFindMany: vi.fn(async () => []),
      rockFinancialAccountFindMany: vi.fn(async () => [
        { active: true, name: "Building Fund", rockId: 20 },
      ]),
    });

    await listPeople(
      {
        filterDefinition: {
          conditions: [
            {
              field: "pledgeState",
              operator: "IN",
              type: "condition",
              value: ["REVIEW", "ACTIVE"],
            },
          ],
          mode: "all",
          type: "group",
        },
        first: 10,
      },
      adminUser,
      prisma,
    );

    expect(prisma.rockPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ rockId: { in: [101] } }),
          ]),
        }),
      }),
    );
  });
});
