import { describe, expect, it, vi } from "vitest";
import {
  persistConfirmedFamilyRemoval,
  persistCurrentFamilyMember,
} from "@/lib/sync/family-membership-persistence";
const checkedAt = new Date("2026-11-02T00:00:00Z");
const known = {
  rockId: 900,
  personRockId: 100,
  householdRockId: 200,
  lastSyncedAt: new Date("2026-06-29T00:00:00Z"),
  sourceRemovalVerifiedAt: null,
};
const proof = {
  version: 1,
  memberHistoryRockId: 3,
  sourceRecordedAt: "2026-06-29T15:46:28.377",
  personHistoryRockId: 2,
};
const decision = { known, verifiedAt: checkedAt, evidence: proof };
const live = {
  rockId: 900,
  personRockId: 100,
  householdRockId: 200,
  groupRoleRockId: 3,
  groupMemberStatus: 1,
  archived: false,
  lastSyncRunId: "new-full",
};
function client(removed = false) {
  return {
    rockHouseholdMember: {
      findUnique: vi.fn(async () => ({
        ...known,
        lastSyncRunId: "old-full",
        sourceRemovalVerifiedAt: removed ? checkedAt : null,
        sourceRemovalEvidence: removed ? proof : null,
      })),
      updateMany: vi
        .fn<
          (args: {
            where: Record<string, unknown>;
            data: Record<string, unknown>;
          }) => Promise<{ count: number }>
        >()
        .mockResolvedValue({ count: 1 }),
      create: vi.fn(),
    },
    syncIssue: { create: vi.fn(), updateMany: vi.fn() },
  };
}
describe("atomic family membership presence writes", () => {
  it("writes the revision-bound marker and audit without changing Rock-owned flags", async () => {
    const tx = client();
    expect(
      await persistConfirmedFamilyRemoval(tx as never, decision, "new-full"),
    ).toBe(true);
    const change = tx.rockHouseholdMember.updateMany.mock.calls[0][0];
    expect(change.where).toMatchObject({
      ...known,
      sourceRemovalVerifiedAt: null,
    });
    expect(change.data).toMatchObject({
      sourceRemovalVerifiedAt: checkedAt,
      sourceRemovalEvidence: proof,
      lastSyncRunId: "new-full",
    });
    expect(change.data).not.toHaveProperty("archived");
    expect(change.data).not.toHaveProperty("groupMemberStatus");
    expect(tx.syncIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "FAMILY_MEMBERSHIP_REMOVAL_CONFIRMED",
          redactedDetail: expect.objectContaining(proof),
        }),
      }),
    );
  });
  it("preserves a concurrently changed row and emits no success audit", async () => {
    const tx = client();
    tx.rockHouseholdMember.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await persistConfirmedFamilyRemoval(tx as never, decision, "new-full"),
    ).toBe(false);
    expect(tx.syncIssue.create).not.toHaveBeenCalled();
  });
  it("cannot clear a confirmed removal through an ordinary/person-slice upsert", async () => {
    const tx = client(true);
    expect(
      await persistCurrentFamilyMember(
        tx as never,
        live,
        undefined,
        "new-full",
      ),
    ).toEqual({ written: false, audited: false });
    expect(tx.rockHouseholdMember.updateMany).not.toHaveBeenCalled();
  });
  it("restores only the directly verified same identity/revision and retains the previous proof in audit", async () => {
    const tx = client(true);
    const restore = {
      ...decision,
      known: { ...known, sourceRemovalVerifiedAt: checkedAt },
      evidence: { directMemberReadStatus: 200 },
    };
    expect(
      await persistCurrentFamilyMember(tx as never, live, restore, "new-full"),
    ).toEqual({ written: true, audited: true });
    expect(tx.rockHouseholdMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lastSyncedAt: known.lastSyncedAt,
          sourceRemovalVerifiedAt: checkedAt,
        }),
        data: expect.objectContaining({ sourceRemovalVerifiedAt: null }),
      }),
    );
    expect(tx.syncIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "FAMILY_MEMBERSHIP_SOURCE_REAPPEARED",
          redactedDetail: expect.objectContaining({
            previousRemovalHistoryRockId: 3,
            previousSourceRecordedAt: proof.sourceRecordedAt,
          }),
        }),
      }),
    );
  });
  it.each(["identity", "revision"])(
    "does not restore a changed %s",
    async (kind) => {
      const tx = client(true);
      const restore = {
        ...decision,
        known: {
          ...known,
          sourceRemovalVerifiedAt: checkedAt,
          ...(kind === "identity"
            ? { personRockId: 101 }
            : { lastSyncedAt: new Date("2026-07-01Z") }),
        },
      };
      expect(
        await persistCurrentFamilyMember(
          tx as never,
          live,
          restore,
          "new-full",
        ),
      ).toEqual({ written: false, audited: false });
      expect(tx.syncIssue.create).not.toHaveBeenCalled();
    },
  );
});
