import { describe, expect, it, vi } from "vitest";

import { RockClient, type RockSyncSlice } from "@/lib/rock/client";
import { performRockFullSyncJob } from "@/lib/sync/jobs";
import {
  rockPersonSliceToNormalized,
  syncRockSlice,
} from "@/lib/sync/run-sync";

vi.mock("@/lib/sync/run-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sync/run-sync")>();
  return {
    ...actual,
    syncRockSlice: vi.fn(async () => ({
      syncRunId: "sync_test",
      status: "SUCCEEDED",
      recordsRead: 0,
      recordsWritten: 0,
      recordsSkipped: 0,
      issueCount: 0,
    })),
  };
});

describe("full sync of an archived membership omitted by Rock collections", () => {
  it("refreshes the known row by ID and clears active participation through the real normalizer", async () => {
    const archivedMember = {
      Id: 100,
      GroupId: 20,
      PersonId: 1,
      GroupTypeId: 25,
      GroupMemberStatus: 1,
      IsArchived: true,
    };
    const fetcher = vi.fn(async () => Response.json(archivedMember));
    const rockClient = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "synthetic-key",
      fetcher: fetcher as typeof fetch,
    });
    const slice: RockSyncSlice = {
      groupTypes: [{ Id: 25 }],
      groupRoles: [],
      definedValues: [],
      personAliases: [],
      people: [{ Id: 1 }],
      familyGroups: [],
      familyMembers: [],
      campuses: [],
      groups: [{ Id: 20, GroupTypeId: 25, IsActive: true, IsArchived: false }],
      groupMembers: [],
      financialAccounts: [],
      financialTransactions: [],
      financialTransactionDetails: [],
      financialScheduledTransactions: [],
      financialScheduledTransactionDetails: [],
    };
    vi.spyOn(rockClient, "getFullSyncSlice").mockResolvedValue(slice);
    const prisma = {
      rockGroupMember: {
        findMany: vi.fn(async () => [
          { rockId: 100, groupRockId: 20, personRockId: 1 },
        ]),
      },
    };

    await performRockFullSyncJob({}, { prisma: prisma as never, rockClient });

    expect(fetcher).toHaveBeenCalledWith(
      "https://rock.example.test/api/GroupMembers/100",
      expect.objectContaining({ method: "GET" }),
    );
    const prepared = vi.mocked(syncRockSlice).mock.calls.at(-1)![1];
    expect(rockPersonSliceToNormalized(prepared).groupMembers).toMatchObject([
      { rockId: 100, archived: true, activeConnectGroup: false },
    ]);
    expect(slice.groupMembers).toEqual([]);
  });
});
