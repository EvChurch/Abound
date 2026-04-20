import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { refreshGivingLifecycleSnapshots } from "@/lib/giving/lifecycle-snapshots";

describe("lifecycle snapshots", () => {
  it("creates person and household lifecycle snapshots with safe summaries", async () => {
    const createMany = vi.fn(async ({ data }) => ({ count: data.length }));
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          givingLifecycleSnapshot: {
            createMany,
            deleteMany,
          },
        }),
      ),
      givingFact: {
        findMany: vi.fn(async () => [
          {
            amount: "100.00",
            effectiveMonth: new Date("2026-03-01T00:00:00.000Z"),
            householdRockId: 20,
            occurredAt: new Date("2026-03-15T00:00:00.000Z"),
            personRockId: 10,
            reliabilityKind: "ONE_OFF",
          },
        ]),
      },
      givingLifecycleSnapshot: {},
    } as unknown as PrismaClient;

    await expect(
      refreshGivingLifecycleSnapshots(
        {
          referenceDate: new Date("2026-04-20T00:00:00.000Z"),
          syncRunId: "sync_1",
        },
        client,
      ),
    ).resolves.toEqual({
      householdSnapshots: 1,
      personSnapshots: 1,
      totalSnapshots: 2,
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        lastSyncRunId: "sync_1",
      },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          lifecycle: "NEW",
          personRockId: 10,
          resource: "PERSON",
          summary: "First giving activity appears in the current window.",
        }),
        expect.objectContaining({
          householdRockId: 20,
          lifecycle: "NEW",
          resource: "HOUSEHOLD",
        }),
      ]),
    });
  });
});
