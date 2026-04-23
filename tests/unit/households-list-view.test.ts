import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import { listHouseholds } from "@/lib/list-views/households-list";

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
  lifecycleSnapshotFindMany = vi.fn(async () => []),
  rockHouseholdFindMany = vi.fn(async () => []),
}: {
  givingFactFindMany?: ReturnType<typeof vi.fn>;
  lifecycleSnapshotFindMany?: ReturnType<typeof vi.fn>;
  rockHouseholdFindMany?: ReturnType<typeof vi.fn>;
} = {}) {
  const findMany = rockHouseholdFindMany;

  return {
    givingFact: {
      findMany: givingFactFindMany,
    },
    givingLifecycleSnapshot: {
      findMany: lifecycleSnapshotFindMany,
    },
    rockHousehold: {
      findMany,
    },
  } as unknown as PrismaClient & {
    givingFact: {
      findMany: typeof givingFactFindMany;
    };
    givingLifecycleSnapshot: {
      findMany: typeof lifecycleSnapshotFindMany;
    };
    rockHousehold: {
      findMany: typeof findMany;
    };
  };
}

describe("households list view", () => {
  it("defaults household results to active non-archived Rock households", async () => {
    const prisma = client();

    await listHouseholds({ first: 10 }, adminUser, prisma);

    expect(prisma.rockHousehold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              active: true,
              archived: false,
            }),
          ]),
        }),
      }),
    );
  });

  it("does not apply the default Rock status when status is explicitly filtered", async () => {
    const prisma = client();

    await listHouseholds(
      {
        filterDefinition: {
          conditions: [
            {
              field: "archived",
              operator: "EQUALS",
              type: "condition",
              value: true,
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

    expect(prisma.rockHousehold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ archived: true }],
        },
      }),
    );
  });

  it("loads lifecycle snapshots into household display rows", async () => {
    const prisma = client({
      lifecycleSnapshotFindMany: vi.fn(async () => [
        {
          householdRockId: 501,
          lifecycle: "REACTIVATED",
          summary: "Giving returned in the latest window.",
          windowEndedAt: new Date("2026-04-20T00:00:00Z"),
        },
        {
          householdRockId: 501,
          lifecycle: "REACTIVATED",
          summary: "Older duplicate lifecycle snapshot.",
          windowEndedAt: new Date("2026-04-19T00:00:00Z"),
        },
      ]),
      rockHouseholdFindMany: vi.fn(async () => [
        {
          _count: { members: 2, staffTasks: 0 },
          active: true,
          archived: false,
          campus: null,
          lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
          members: [],
          name: "Lifecycle Household",
          rockId: 501,
        },
      ]),
    });

    const connection = await listHouseholds({ first: 10 }, adminUser, prisma);

    expect(connection.edges[0]?.node.lifecycle).toEqual([
      {
        lifecycle: "REACTIVATED",
        summary: "Giving returned in the latest window.",
        windowEndedAt: new Date("2026-04-20T00:00:00Z"),
      },
    ]);
    expect(prisma.givingLifecycleSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          householdRockId: { in: [501] },
          resource: "HOUSEHOLD",
        },
      }),
    );
  });
});
