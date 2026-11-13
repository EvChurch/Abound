import { describe, expect, it, vi } from "vitest";

import type { RockSyncSlice } from "@/lib/rock/client";
import {
  MAX_MISSING_MEMBERSHIP_READS,
  refreshKnownConnectMemberships,
} from "@/lib/sync/membership-refresh";

function emptySlice(groupTypeId = 25): RockSyncSlice {
  return {
    groupTypes: [],
    groupRoles: [],
    definedValues: [],
    personAliases: [],
    people: [],
    familyGroups: [],
    familyMembers: [],
    campuses: [],
    groups: [{ Id: 20, GroupTypeId: groupTypeId }],
    groupMembers: [],
    financialAccounts: [],
    financialTransactions: [],
    financialTransactionDetails: [],
    financialScheduledTransactions: [],
    financialScheduledTransactionDetails: [],
  };
}

const known = { rockId: 100, groupRockId: 20, personRockId: 1 };
const archived = {
  Id: 100,
  GroupId: 20,
  PersonId: 1,
  GroupMemberStatus: 1,
  IsArchived: true,
};

function client(rows = [known]) {
  return { rockGroupMember: { findMany: vi.fn(async () => rows) } };
}

describe("refreshKnownConnectMemberships", () => {
  it.each([25, 46])(
    "rehydrates known type-%i membership without mutating the slice",
    async (type) => {
      const slice = emptySlice(type);
      const db = client();
      const rock = { getGroupMember: vi.fn(async () => archived) };
      const result = await refreshKnownConnectMemberships(
        slice,
        db as never,
        rock,
      );
      expect(result.issues).toEqual([]);
      expect(result.slice.groupMembers).toEqual([archived]);
      expect(slice.groupMembers).toEqual([]);
      expect(db.rockGroupMember.findMany).toHaveBeenCalledWith({
        where: {
          groupTypeRockId: { in: [25, 46] },
          groupRockId: { in: [20] },
          rockId: { notIn: [] },
          archived: false,
        },
        select: { rockId: true, groupRockId: true, personRockId: true },
        orderBy: { rockId: "asc" },
        take: MAX_MISSING_MEMBERSHIP_READS + 1,
      });
      expect(rock.getGroupMember).toHaveBeenCalledWith(100);
    },
  );

  it("does not read already-returned members individually", async () => {
    const slice = emptySlice();
    slice.groupMembers = [archived];
    const db = client([]);
    const rock = { getGroupMember: vi.fn() };
    const result = await refreshKnownConnectMemberships(
      slice,
      db as never,
      rock,
    );
    expect(result.slice).toBe(slice);
    expect(db.rockGroupMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ rockId: { notIn: [100] } }),
      }),
    );
    expect(rock.getGroupMember).not.toHaveBeenCalled();
  });

  it("does not reconcile outside source-confirmed Connect Groups", async () => {
    const db = client();
    const rock = { getGroupMember: vi.fn() };
    await refreshKnownConnectMemberships(emptySlice(24), db as never, rock);
    expect(db.rockGroupMember.findMany).not.toHaveBeenCalled();
    expect(rock.getGroupMember).not.toHaveBeenCalled();
  });

  it("reports an exceeded bound without starting individual reads", async () => {
    const slice = emptySlice();
    const db = client(
      Array.from({ length: MAX_MISSING_MEMBERSHIP_READS + 1 }, (_, i) => ({
        ...known,
        rockId: 100 + i,
      })),
    );
    const rock = { getGroupMember: vi.fn() };
    const result = await refreshKnownConnectMemberships(
      slice,
      db as never,
      rock,
    );
    expect(result.slice).toBe(slice);
    expect(result.issues).toMatchObject([
      { severity: "ERROR", code: "MEMBERSHIP_REFRESH_LIMIT" },
    ]);
    expect(rock.getGroupMember).not.toHaveBeenCalled();
  });

  it.each([
    { ...archived, Id: 101 },
    { ...archived, GroupId: 21 },
    { ...archived, PersonId: 2 },
  ])("preserves a local row when source identity changes", async (member) => {
    const slice = emptySlice();
    const result = await refreshKnownConnectMemberships(
      slice,
      client() as never,
      {
        getGroupMember: vi.fn(async () => member),
      },
    );
    expect(result.slice).toBe(slice);
    expect(result.issues).toMatchObject([
      {
        severity: "ERROR",
        rockId: "100",
        code: "MEMBERSHIP_REFRESH_UNRESOLVED",
      },
    ]);
  });

  it("preserves unresolved rows, suppresses raw errors and still includes verified rows", async () => {
    const slice = emptySlice();
    const result = await refreshKnownConnectMemberships(
      slice,
      client([known, { ...known, rockId: 101 }]) as never,
      {
        getGroupMember: vi.fn(async (id) => {
          if (id === 100)
            throw new Error("private response and synthetic-secret");
          return { ...archived, Id: id };
        }),
      },
    );
    expect(result.slice.groupMembers).toEqual([{ ...archived, Id: 101 }]);
    expect(result.issues).toMatchObject([{ severity: "ERROR", rockId: "100" }]);
    expect(JSON.stringify(result.issues)).not.toMatch(
      /private response|synthetic-secret/,
    );
  });
});
