import { describe, expect, it, vi } from "vitest";

import {
  deleteStaleRockGroupMemberIdentity,
  normalizeRockText,
  recordRockPersonAliasMovement,
  resolveRockPersonAliasMovement,
  resolveRockPersonPrimaryAliasOwnership,
  resolveAuthorizedPersonRockId,
  transferLocalRockPersonOwnership,
} from "@/lib/sync/run-sync";

function mergeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: vi.fn(async () => 0),
    appUser: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    communicationAutomationRecipient: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    communicationPrep: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    givingPledge: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    rockPerson: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    rockPersonAlias: {
      findUnique: vi.fn(async () => null),
    },
    rockPersonAliasMovement: {
      create: vi.fn(async () => ({})),
    },
    staffTask: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    ...overrides,
  };
}

describe("sync normalization", () => {
  it("normalizes blank Rock text fields to null", () => {
    expect(normalizeRockText("")).toBeNull();
    expect(normalizeRockText("   ")).toBeNull();
    expect(normalizeRockText(null)).toBeNull();
    expect(normalizeRockText(undefined)).toBeNull();
    expect(normalizeRockText(" Amy ")).toBe("Amy");
  });

  it("removes stale group member rows before replacing Rock member IDs", async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }));

    await deleteStaleRockGroupMemberIdentity(
      { rockGroupMember: { deleteMany } } as never,
      {
        groupRockId: 25,
        groupRoleRockId: 12,
        personRockId: 910001,
        rockId: 78989,
      },
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        groupRockId: 25,
        groupRoleRockId: 12,
        personRockId: 910001,
        rockId: {
          not: 78989,
        },
      },
    });
  });

  it("matches stale group members with null roles", async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }));

    await deleteStaleRockGroupMemberIdentity(
      { rockGroupMember: { deleteMany } } as never,
      {
        groupRockId: 25,
        groupRoleRockId: undefined,
        personRockId: 910001,
        rockId: 78989,
      },
    );

    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          groupRoleRockId: null,
        }),
      }),
    );
  });

  it("resolves authorized person through Rock alias ownership before primary aliases", () => {
    const people = [
      {
        primaryAliasRockId: 9505,
        rockId: 9498,
      },
      {
        primaryAliasRockId: 13808,
        rockId: 13801,
      },
    ];
    const personRockIdByAliasRockId = new Map([
      [9505, 9498],
      [13808, 9498],
    ]);

    expect(
      resolveAuthorizedPersonRockId({
        aliasRockId: 13808,
        people,
        personRockIdByAliasRockId,
      }),
    ).toBe(9498);
  });

  it("falls back to primary alias matching when alias ownership is unavailable", () => {
    expect(
      resolveAuthorizedPersonRockId({
        aliasRockId: 13808,
        people: [
          {
            primaryAliasRockId: 13808,
            rockId: 13801,
          },
        ],
        personRockIdByAliasRockId: new Map(),
      }),
    ).toBe(13801);
  });

  it("records Rock alias owner movement before replacing the alias", async () => {
    const tx = mergeTransaction({
      rockPersonAlias: {
        findUnique: vi.fn(async () => ({
          personRockId: 15588,
        })),
      },
    });

    await recordRockPersonAliasMovement(tx as never, {
      rockId: 15595,
      personRockId: 9498,
      sourceUpdatedAt: new Date("2026-08-06T10:19:00.000Z"),
      lastSyncRunId: "sync_1",
    });

    expect(tx.rockPersonAliasMovement.create).toHaveBeenCalledWith({
      data: {
        aliasRockId: 15595,
        fromPersonRockId: 15588,
        toPersonRockId: 9498,
        sourceUpdatedAt: new Date("2026-08-06T10:19:00.000Z"),
        syncRunId: "sync_1",
      },
    });
    expect(tx.rockPerson.updateMany).toHaveBeenCalledWith({
      where: {
        rockId: 15588,
      },
      data: {
        mergedAt: expect.any(Date),
        mergedIntoPersonRockId: 9498,
      },
    });
    expect(tx.staffTask.updateMany).toHaveBeenCalledWith({
      where: {
        personRockId: 15588,
      },
      data: {
        personRockId: 9498,
      },
    });
  });

  it("does not record alias movement when ownership is unchanged", async () => {
    const tx = mergeTransaction({
      rockPersonAlias: {
        findUnique: vi.fn(async () => ({
          personRockId: 9498,
        })),
      },
    });

    await recordRockPersonAliasMovement(tx as never, {
      rockId: 15595,
      personRockId: 9498,
      sourceUpdatedAt: null,
      lastSyncRunId: "sync_1",
    });

    expect(tx.rockPersonAliasMovement.create).not.toHaveBeenCalled();
    expect(tx.rockPerson.updateMany).not.toHaveBeenCalled();
  });

  it("skips merge resolution when an alias does not have a surviving owner", async () => {
    const tx = mergeTransaction();

    await resolveRockPersonAliasMovement(tx as never, {
      aliasRockId: 15595,
      fromPersonRockId: 15588,
      sourceUpdatedAt: null,
      syncRunId: "sync_1",
      toPersonRockId: null,
    });

    expect(tx.rockPersonAliasMovement.create).not.toHaveBeenCalled();
    expect(tx.rockPerson.updateMany).not.toHaveBeenCalled();
  });

  it("marks stale local people merged when their primary alias now belongs to another person", async () => {
    const tx = mergeTransaction({
      rockPerson: {
        findMany: vi.fn(async () => [{ rockId: 15588 }]),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    });

    await resolveRockPersonPrimaryAliasOwnership(tx as never, {
      rockId: 15595,
      personRockId: 9498,
    });

    expect(tx.rockPerson.findMany).toHaveBeenCalledWith({
      where: {
        primaryAliasRockId: 15595,
        rockId: {
          not: 9498,
        },
      },
      select: {
        rockId: true,
      },
    });
    expect(tx.rockPerson.updateMany).toHaveBeenCalledWith({
      where: {
        rockId: {
          in: [15588],
        },
      },
      data: {
        mergedAt: expect.any(Date),
        mergedIntoPersonRockId: 9498,
      },
    });
    expect(tx.staffTask.updateMany).toHaveBeenCalledWith({
      where: {
        personRockId: 15588,
      },
      data: {
        personRockId: 9498,
      },
    });
  });

  it("does not reconcile primary alias ownership without a surviving person", async () => {
    const tx = mergeTransaction();

    await resolveRockPersonPrimaryAliasOwnership(tx as never, {
      rockId: 15595,
      personRockId: null,
    });

    expect(tx.rockPerson.findMany).not.toHaveBeenCalled();
    expect(tx.rockPerson.updateMany).not.toHaveBeenCalled();
  });

  it("moves local app-owned person references to the surviving Rock person", async () => {
    const tx = mergeTransaction();

    await transferLocalRockPersonOwnership(tx as never, {
      fromPersonRockId: 15588,
      toPersonRockId: 9498,
    });

    expect(tx.appUser.updateMany).toHaveBeenCalledWith({
      where: {
        rockPersonId: "15588",
      },
      data: {
        rockPersonId: "9498",
      },
    });
    expect(tx.communicationPrep.updateMany).toHaveBeenCalledWith({
      where: {
        personRockId: 15588,
      },
      data: {
        personRockId: 9498,
      },
    });
    expect(tx.communicationAutomationRecipient.updateMany).toHaveBeenCalledWith(
      {
        where: {
          personRockId: 15588,
          resource: "PERSON",
        },
        data: {
          personRockId: 9498,
          recipientKey: "PERSON:9498",
        },
      },
    );
    expect(tx.givingPledge.updateMany).toHaveBeenCalledWith({
      where: {
        personRockId: 15588,
      },
      data: {
        personRockId: 9498,
      },
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(4);
  });
});
