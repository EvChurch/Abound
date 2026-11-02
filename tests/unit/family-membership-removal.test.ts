import { describe, expect, it, vi } from "vitest";
import {
  RockClient,
  type RockApiGroupMember,
  type RockSyncSlice,
} from "@/lib/rock/client";
import {
  familyHistorySchema,
  type FamilyHistoryRow,
} from "@/lib/rock/family-membership-history";
import {
  confirmedFamilyRemovalEvidence,
  prepareFamilyMembershipReconciliation,
} from "@/lib/sync/family-membership-removal";

const known = {
  rockId: 900,
  personRockId: 100,
  householdRockId: 200,
  lastSyncedAt: new Date("2026-06-29T03:00:00Z"),
  sourceRemovalVerifiedAt: null,
};
const removalDate = "2026-06-29T15:46:28.377";
function row(
  Id: number,
  EntityTypeId: number,
  EntityId: number,
  Verb: string,
  CreatedDateTime = removalDate,
): FamilyHistoryRow {
  return {
    Id,
    EntityTypeId,
    EntityId,
    Verb,
    ChangeType: "Record",
    RelatedEntityTypeId: 16,
    RelatedEntityId: 200,
    CreatedDateTime,
  };
}
const history = [
  row(1, 90, 900, "ADDEDTOGROUP", "2026-06-22T19:03:35.32"),
  row(2, 15, 100, "REMOVEDFROMGROUP"),
  row(3, 90, 900, "REMOVEDFROMGROUP"),
];
const member: RockApiGroupMember = {
  Id: 900,
  GroupId: 200,
  PersonId: 100,
  GroupTypeId: 10,
  GroupRoleId: 3,
  GroupMemberStatus: 1,
  IsArchived: false,
};
function slice(): RockSyncSlice {
  return {
    groupTypes: [],
    groupRoles: [],
    definedValues: [],
    personAliases: [],
    people: [],
    familyGroups: [
      { Id: 200, GroupTypeId: 10, IsActive: true, IsArchived: false },
    ],
    familyMembers: [],
    campuses: [],
    groups: [],
    groupMembers: [],
    financialAccounts: [],
    financialTransactions: [],
    financialTransactionDetails: [],
    financialScheduledTransactions: [],
    financialScheduledTransactionDetails: [],
  };
}
function prep() {
  const db = {
    rockHouseholdMember: { findMany: vi.fn(async () => [known]) },
    syncIssue: { findFirst: vi.fn(async () => null) },
  };
  const rock = {
    findGroupMember: vi
      .fn<(id: number) => Promise<RockApiGroupMember | null>>()
      .mockResolvedValue(null),
    getFamilyMembershipHistory: vi.fn(async () => history),
  };
  return { db, rock };
}

describe("source-recorded family removal evidence", () => {
  it("requires exact member/person/family evidence and preserves the raw source timestamp", () => {
    expect(confirmedFamilyRemovalEvidence(known, history)).toMatchObject({
      memberRockId: 900,
      personRockId: 100,
      householdRockId: 200,
      memberHistoryRockId: 3,
      personHistoryRockId: 2,
      sourceRecordedAt: removalDate,
      directMemberReadStatus: 404,
    });
    for (const changed of [
      { rockId: 901 },
      { personRockId: 101 },
      { householdRockId: 201 },
    ])
      expect(
        confirmedFamilyRemovalEvidence({ ...known, ...changed }, history),
      ).toBeNull();
    expect(
      confirmedFamilyRemovalEvidence(
        known,
        history.filter((r) => r.EntityTypeId !== 15),
      ),
    ).toBeNull();
  });
  it("rejects a later old-ID re-add, later property changes and contradictory equal-time activity", () => {
    expect(
      confirmedFamilyRemovalEvidence(known, [
        ...history,
        row(4, 90, 900, "ADDEDTOGROUP", "2026-07-01T10:00:00"),
      ]),
    ).toBeNull();
    expect(
      confirmedFamilyRemovalEvidence(known, [
        ...history,
        {
          ...row(4, 90, 900, "MODIFY", "2026-07-01T10:00:00"),
          ChangeType: "Property",
        },
      ]),
    ).toBeNull();
    expect(
      confirmedFamilyRemovalEvidence(known, [
        ...history,
        row(4, 15, 100, "ADDEDTOGROUP"),
      ]),
    ).toBeNull();
  });
  it("allows a later new-ID association only with independently verified replacement presence", () => {
    const later = [
      ...history,
      row(4, 15, 100, "ADDEDTOGROUP", "2026-07-01T10:00:00"),
    ];
    expect(confirmedFamilyRemovalEvidence(known, later)).toBeNull();
    expect(confirmedFamilyRemovalEvidence(known, later, 901)).toMatchObject({
      replacementMemberRockId: 901,
      memberRockId: 900,
    });
  });
  it("does not replay an older removal proof after source reappearance", () => {
    expect(
      confirmedFamilyRemovalEvidence(known, history, undefined, {
        memberHistoryRockId: 3,
        sourceRecordedAt: removalDate,
      }),
    ).toBeNull();
    const newer = [
      ...history,
      row(4, 15, 100, "REMOVEDFROMGROUP", "2026-07-02T10:00:00"),
      row(5, 90, 900, "REMOVEDFROMGROUP", "2026-07-02T10:00:00"),
    ];
    expect(
      confirmedFamilyRemovalEvidence(known, newer, undefined, {
        memberHistoryRockId: 3,
        sourceRecordedAt: removalDate,
      }),
    ).toMatchObject({ memberHistoryRockId: 5 });
  });
  it("normalizes fractional precision without inventing offsets, and rejects incomplete or unordered history", () => {
    expect(
      confirmedFamilyRemovalEvidence(
        known,
        history.map((r) =>
          r.Id === 2 ? { ...r, CreatedDateTime: `${removalDate}0000` } : r,
        ),
      ),
    ).not.toBeNull();
    expect(() =>
      confirmedFamilyRemovalEvidence(known, [...history].reverse()),
    ).toThrow("ordered");
    expect(() =>
      confirmedFamilyRemovalEvidence(known, [...history, history[2]]),
    ).toThrow("Duplicate");
    expect(() =>
      familyHistorySchema.parse(
        history.map((r) => ({
          ...r,
          CreatedDateTime: r.CreatedDateTime + "Z",
        })),
      ),
    ).toThrow();
    expect(() =>
      familyHistorySchema.parse(
        Array.from({ length: 200 }, (_, i) => ({ ...history[0], Id: i + 1 })),
      ),
    ).toThrow();
  });
});

describe("bounded full-sync membership preparation", () => {
  it("produces a revision-bound cessation decision without editing Rock fields or the input slice", async () => {
    const { db, rock } = prep();
    const source = slice();
    const result = await prepareFamilyMembershipReconciliation(
      source,
      db as never,
      rock,
    );
    expect(result.removals).toHaveLength(1);
    expect(result.removals[0].known.lastSyncedAt).toEqual(known.lastSyncedAt);
    expect(result.issues).toEqual([]);
    expect(source.familyMembers).toEqual([]);
    expect(rock.getFamilyMembershipHistory).toHaveBeenCalledWith(100, 900);
  });
  it("uses actual readable archive/status values instead of manufacturing a removal", async () => {
    const { db, rock } = prep();
    rock.findGroupMember.mockResolvedValue({ ...member, IsArchived: true });
    const result = await prepareFamilyMembershipReconciliation(
      slice(),
      db as never,
      rock,
    );
    expect(result.removals).toEqual([]);
    expect(result.slice.familyMembers[0]).toMatchObject({ IsArchived: true });
    expect(rock.getFamilyMembershipHistory).not.toHaveBeenCalled();
  });
  it.each([
    "missing history",
    "identity mismatch",
    "read failure",
    "history cap",
  ])("keeps %s unresolved", async (mode) => {
    const { db, rock } = prep();
    if (mode === "missing history")
      rock.getFamilyMembershipHistory.mockResolvedValue([]);
    if (mode === "identity mismatch")
      rock.findGroupMember.mockResolvedValue({ ...member, PersonId: 101 });
    if (mode === "read failure")
      rock.findGroupMember.mockRejectedValue(new Error("source unavailable"));
    if (mode === "history cap")
      rock.getFamilyMembershipHistory.mockRejectedValue(new Error("bound"));
    const result = await prepareFamilyMembershipReconciliation(
      slice(),
      db as never,
      rock,
    );
    expect(result.removals).toEqual([]);
    expect(result.issues[0]).toMatchObject({
      severity: "ERROR",
      code: "FAMILY_MEMBERSHIP_REMOVAL_UNRESOLVED",
    });
  });
  it("does not perform any source read when the candidate cap is exceeded", async () => {
    const { db, rock } = prep();
    db.rockHouseholdMember.findMany.mockResolvedValue(
      Array.from({ length: 201 }, (_, i) => ({ ...known, rockId: 900 + i })),
    );
    const result = await prepareFamilyMembershipReconciliation(
      slice(),
      db as never,
      rock,
    );
    expect(result.issues[0].code).toBe(
      "FAMILY_MEMBERSHIP_RECONCILIATION_LIMIT",
    );
    expect(rock.findGroupMember).not.toHaveBeenCalled();
  });
  it("independently verifies a new source ID while retaining the old ID's removal proof", async () => {
    const { db, rock } = prep();
    const source = slice();
    source.familyMembers = [{ ...member, Id: 901 }];
    rock.findGroupMember.mockImplementation(async (id) =>
      id === 900 ? null : { ...member, Id: 901 },
    );
    rock.getFamilyMembershipHistory.mockResolvedValue([
      ...history,
      row(4, 15, 100, "ADDEDTOGROUP", "2026-07-01T10:00:00"),
    ]);
    const result = await prepareFamilyMembershipReconciliation(
      source,
      db as never,
      rock,
    );
    expect(result.removals[0].evidence.replacementMemberRockId).toBe(901);
    expect(result.slice.familyMembers.map((m) => m.Id)).toEqual([901]);
  });
  it("requires a direct same-identity read to restore a marked membership", async () => {
    const { db, rock } = prep();
    db.rockHouseholdMember.findMany.mockResolvedValue([
      { ...known, sourceRemovalVerifiedAt: new Date() },
    ] as never);
    const source = slice();
    source.familyMembers = [member];
    rock.findGroupMember.mockResolvedValue(member);
    const result = await prepareFamilyMembershipReconciliation(
      source,
      db as never,
      rock,
    );
    expect(result.restorations).toHaveLength(1);
    expect(result.removals).toEqual([]);
  });
});

describe("typed membership/history reads", () => {
  it("treats only HTTP 404 as absence", async () => {
    for (const status of [403, 500]) {
      const client = new RockClient({
        baseUrl: "https://rock.example.test",
        restKey: "synthetic-key",
        fetcher: async () => new Response(null, { status }),
      });
      await expect(client.findGroupMember(900)).rejects.toThrow(
        `status ${status}`,
      );
    }
    const client = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "synthetic-key",
      fetcher: async () => new Response(null, { status: 404 }),
    });
    await expect(client.findGroupMember(900)).resolves.toBeNull();
  });
  it("requests exact typed IDs and a complete bounded metadata-only history response", async () => {
    const paths: string[] = [];
    const client = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "synthetic-key",
      fetcher: async (input, init) => {
        expect(init?.method).toBe("GET");
        paths.push(String(input));
        return Response.json(history);
      },
    });
    await expect(client.getFamilyMembershipHistory(100, 900)).resolves.toEqual(
      history,
    );
    const url = new URL(paths[0]);
    expect(url.pathname).toBe("/api/Histories");
    expect(url.searchParams.get("$filter")).toContain(
      "EntityTypeId eq 90 and EntityId eq 900",
    );
    expect(url.searchParams.get("$select")).not.toContain("Value");
    expect(url.searchParams.get("$top")).toBe("200");
    await expect(client.getFamilyMembershipHistory(0, 900)).rejects.toThrow(
      "positive",
    );
  });
});
