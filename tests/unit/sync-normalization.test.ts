import { describe, expect, it, vi } from "vitest";

import {
  deleteStaleRockGroupMemberIdentity,
  normalizeRockText,
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
});
