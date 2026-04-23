import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveLifecycleFilteredRockIds } from "@/lib/list-views/lifecycle-filtering";

describe("lifecycle filtering", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves healthy people as recent givers without another lifecycle signal", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T00:00:00.000Z"));

    const client = {
      givingFact: {
        findMany: vi.fn(async () => [
          {
            effectiveMonth: new Date("2026-04-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2026-04-10T00:00:00.000Z"),
            personRockId: 1,
          },
          {
            effectiveMonth: new Date("2026-04-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2026-04-10T00:00:00.000Z"),
            personRockId: 2,
          },
          {
            effectiveMonth: new Date("2025-12-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2025-12-10T00:00:00.000Z"),
            personRockId: 3,
          },
        ]),
      },
      givingLifecycleSnapshot: {
        findMany: vi.fn(async () => [
          {
            householdRockId: null,
            personRockId: 2,
          },
        ]),
      },
      platformFundSetting: {
        findMany: vi.fn(async () => [{ accountRockId: 169, enabled: true }]),
      },
    } as unknown as PrismaClient;

    await expect(
      resolveLifecycleFilteredRockIds(
        {
          field: "lifecycle",
          operator: "EQUALS",
          type: "condition",
          value: "HEALTHY",
        },
        "PERSON",
        client,
      ),
    ).resolves.toEqual([1]);
    expect(client.givingFact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountRockId: {
            in: [169],
          },
          personRockId: {
            not: null,
          },
        }),
      }),
    );
  });
});
