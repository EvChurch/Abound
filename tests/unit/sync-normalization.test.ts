import { describe, expect, it, vi } from "vitest";

import {
  deleteStaleRockGroupMemberIdentity,
  normalizeRockText,
  resolveAuthorizedPersonRockId,
} from "@/lib/sync/run-sync";

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
});
