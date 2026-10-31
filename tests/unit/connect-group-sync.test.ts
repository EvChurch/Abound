import { describe, expect, it } from "vitest";

import type {
  RockApiGroup,
  RockApiGroupMember,
  RockSyncSlice,
} from "@/lib/rock/client";
import { rockPersonSliceToNormalized } from "@/lib/sync/run-sync";

function normalize(groups: RockApiGroup[], groupMembers: RockApiGroupMember[]) {
  const slice: RockSyncSlice = {
    groupTypes: [{ Id: 25 }, { Id: 46 }],
    groupRoles: [],
    definedValues: [],
    personAliases: [],
    people: [{ Id: 1 }],
    familyGroups: [],
    familyMembers: [],
    campuses: [],
    groups,
    groupMembers,
    financialAccounts: [],
    financialTransactions: [],
    financialTransactionDetails: [],
    financialScheduledTransactions: [],
    financialScheduledTransactionDetails: [],
  };
  return rockPersonSliceToNormalized(slice);
}

describe("Connect Group sync", () => {
  it("retains both source types and only parent links to synced groups", () => {
    const data = normalize(
      [
        { Id: 10, GroupTypeId: 24 },
        { Id: 20, GroupTypeId: 25, ParentGroupId: 10 },
        { Id: 30, GroupTypeId: 46, ParentGroupId: 20 },
      ],
      [
        { Id: 100, GroupId: 20, PersonId: 1, GroupMemberStatus: 1 },
        { Id: 101, GroupId: 30, PersonId: 1, GroupMemberStatus: 1 },
        { Id: 102, GroupId: 10, PersonId: 1, GroupMemberStatus: 1 },
      ],
    );
    expect(data.groups).toMatchObject([
      { rockId: 20, groupTypeRockId: 25, parentGroupRockId: null },
      { rockId: 30, groupTypeRockId: 46, parentGroupRockId: 20 },
    ]);
    expect(data.groupMembers).toMatchObject([
      { rockId: 100, groupTypeRockId: 25, activeConnectGroup: true },
      { rockId: 101, groupTypeRockId: 46, activeConnectGroup: true },
    ]);
    expect(data.groupMembers).toHaveLength(2);
  });

  it.each([25, 46])(
    "classifies type %i membership from group and member state",
    (groupTypeId) => {
      const cases = [
        { group: {}, member: { GroupMemberStatus: 1 }, active: true },
        {
          group: { IsActive: false },
          member: { GroupMemberStatus: 1 },
          active: false,
        },
        {
          group: { IsArchived: true },
          member: { GroupMemberStatus: 1 },
          active: false,
        },
        {
          group: {},
          member: { GroupMemberStatus: 1, IsArchived: true },
          active: false,
        },
        { group: {}, member: { GroupMemberStatus: 0 }, active: false },
        { group: {}, member: { GroupMemberStatus: 2 }, active: false },
        { group: {}, member: {}, active: false },
      ];
      for (const testCase of cases) {
        const data = normalize(
          [{ Id: 20, GroupTypeId: groupTypeId, ...testCase.group }],
          [{ Id: 100, GroupId: 20, PersonId: 1, ...testCase.member }],
        );
        expect(data.groupMembers[0]).toMatchObject({
          groupTypeRockId: groupTypeId,
          activeConnectGroup: testCase.active,
        });
      }
    },
  );

  it("flags contradictory member types and excludes them from active reporting", () => {
    const data = normalize(
      [{ Id: 20, GroupTypeId: 46 }],
      [
        {
          Id: 100,
          GroupId: 20,
          GroupTypeId: 25,
          PersonId: 1,
          GroupMemberStatus: 1,
        },
      ],
    );
    expect(data.groupMembers[0]).toMatchObject({
      groupTypeRockId: 46,
      activeConnectGroup: false,
    });
    expect(data.issues).toContainEqual(
      expect.objectContaining({
        rockId: "100",
        code: "GROUP_TYPE_MISMATCH",
      }),
    );
  });
});
