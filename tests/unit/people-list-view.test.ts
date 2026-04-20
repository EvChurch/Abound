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

function client(givingFactFindMany: ReturnType<typeof vi.fn> = vi.fn()) {
  const findMany = vi.fn(async () => []);

  return {
    givingFact: {
      findMany: givingFactFindMany,
    },
    rockPerson: {
      findMany,
    },
  } as unknown as PrismaClient & {
    givingFact: {
      findMany: typeof givingFactFindMany;
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
          AND: [
            expect.objectContaining({
              householdMembers: {
                some: {
                  archived: false,
                  groupRole: {
                    name: {
                      equals: "Child",
                      mode: "insensitive",
                    },
                  },
                },
              },
            }),
          ],
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
    const prisma = client(givingFactFindMany);

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
});
