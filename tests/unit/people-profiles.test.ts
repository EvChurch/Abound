import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  getRockHouseholdProfile,
  getRockPersonProfile,
} from "@/lib/people/profiles";

const adminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN",
};

const pastoralCareUser: LocalAppUser = {
  ...adminUser,
  id: "user_2",
  role: "PASTORAL_CARE",
};

const financeUser: LocalAppUser = {
  ...adminUser,
  id: "user_3",
  role: "FINANCE",
};

const campus = {
  name: "North Campus",
  rockId: 30,
  shortCode: "N",
};

const household = {
  active: true,
  archived: false,
  campus,
  lastSyncedAt: new Date("2026-04-18T10:01:00.000Z"),
  name: "Donor Family",
  rockId: 920001,
};

const person = {
  deceased: false,
  email: "jane@example.com",
  emailActive: true,
  firstName: "Jane",
  givingGroupRockId: 920001,
  givingHousehold: household,
  givingId: "G-910001",
  givingLeaderRockId: null,
  householdMembers: [
    {
      archived: false,
      groupMemberStatus: 1,
      groupRole: {
        name: "Adult",
      },
      household,
      rockId: 1,
    },
  ],
  lastSyncedAt: new Date("2026-04-18T10:01:00.000Z"),
  lastSyncRunId: "sync_1",
  lastName: "Donor",
  nickName: "Jane",
  photoRockId: 12345,
  primaryAliasRockId: 1001,
  primaryCampus: campus,
  primaryFamilyRockId: 920001,
  primaryHousehold: household,
  recordStatus: {
    value: "Active",
  },
  rockId: 910001,
};

function profileClient() {
  return {
    givingFact: {
      findMany: vi.fn(async () => [
        {
          amount: "125.50",
          effectiveMonth: new Date("2026-04-01T00:00:00.000Z"),
          occurredAt: new Date("2026-04-07T00:00:00.000Z"),
          reliabilityKind: "ONE_OFF",
        },
      ]),
    },
    rockHousehold: {
      findUnique: vi.fn(async () => ({
        ...household,
        givingPeople: [person],
        members: [
          {
            archived: false,
            groupMemberStatus: 1,
            groupRole: {
              name: "Child",
            },
            person: {
              ...person,
              firstName: "Zoe",
              lastName: "Donor",
              nickName: "Zoe",
              rockId: 910003,
            },
            rockId: 3,
          },
          {
            archived: false,
            groupMemberStatus: 1,
            groupRole: {
              name: "Adult",
            },
            person,
            rockId: 1,
          },
          {
            archived: false,
            groupMemberStatus: 1,
            groupRole: {
              name: "Adult",
            },
            person: {
              ...person,
              firstName: "Adam",
              lastName: "Donor",
              nickName: "Adam",
              rockId: 910002,
            },
            rockId: 2,
          },
        ],
      })),
    },
    rockPerson: {
      findUnique: vi.fn(async () => person),
    },
    staffTask: {
      findMany: vi.fn(async () => [
        {
          assignedTo: {
            email: "care@example.com",
            name: "Care User",
          },
          createdAt: new Date("2026-04-18T10:00:00.000Z"),
          dueAt: null,
          householdRockId: 920001,
          id: "task_1",
          personRockId: 910001,
          priority: "HIGH",
          status: "OPEN",
          title: "Call Jane",
        },
      ]),
    },
  } as unknown as PrismaClient;
}

describe("people profile service", () => {
  it("returns role-visible person profile data for finance users", async () => {
    const profile = await getRockPersonProfile(
      { rockId: 910001 },
      financeUser,
      profileClient(),
    );

    expect(profile).toMatchObject({
      amountsHidden: false,
      displayName: "Jane Donor",
      photoUrl: "/api/rock/person-photo/12345",
      givingSummary: {
        totalGiven: "125.50",
      },
      primaryHousehold: {
        name: "Donor Family",
      },
      staffTasks: [
        {
          title: "Call Jane",
        },
      ],
    });
  });

  it("hides giving summaries from pastoral care users", async () => {
    const profile = await getRockPersonProfile(
      { rockId: 910001 },
      pastoralCareUser,
      profileClient(),
    );

    expect(profile?.amountsHidden).toBe(true);
    expect(profile?.givingSummary).toBeNull();
  });

  it("returns household members and finance-visible household giving", async () => {
    const profile = await getRockHouseholdProfile(
      { rockId: 920001 },
      adminUser,
      profileClient(),
    );

    expect(profile).toMatchObject({
      amountsHidden: false,
      members: [
        {
          groupRole: "Adult",
          person: {
            displayName: "Adam Donor",
          },
        },
        {
          groupRole: "Adult",
          person: {
            displayName: "Jane Donor",
          },
        },
        {
          groupRole: "Child",
          person: {
            displayName: "Zoe Donor",
          },
        },
      ],
      givingSummary: {
        totalGiven: "125.50",
      },
    });
  });

  it("returns null for missing synced Rock records", async () => {
    const client = {
      rockPerson: {
        findUnique: vi.fn(async () => null),
      },
    } as unknown as PrismaClient;

    await expect(
      getRockPersonProfile({ rockId: 999 }, adminUser, client),
    ).resolves.toBeNull();
  });
});
