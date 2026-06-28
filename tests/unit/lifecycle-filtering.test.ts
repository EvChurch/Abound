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

  it("resolves lapsed people from older multi-month giving facts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T00:00:00.000Z"));

    const client = {
      givingFact: {
        findMany: vi.fn(async () => [
          {
            effectiveMonth: new Date("2025-01-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2025-01-10T00:00:00.000Z"),
            personRockId: 1,
          },
          {
            effectiveMonth: new Date("2025-02-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2025-02-10T00:00:00.000Z"),
            personRockId: 1,
          },
          {
            effectiveMonth: new Date("2025-03-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2025-03-10T00:00:00.000Z"),
            personRockId: 1,
          },
          {
            effectiveMonth: new Date("2026-04-01T00:00:00.000Z"),
            householdRockId: null,
            occurredAt: new Date("2026-04-10T00:00:00.000Z"),
            personRockId: 2,
          },
        ]),
      },
      givingLifecycleSnapshot: {
        findMany: vi.fn(async () => []),
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
          value: "LAPSED",
        },
        "PERSON",
        client,
      ),
    ).resolves.toEqual([1]);
    expect(client.givingLifecycleSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lifecycle: {
            in: ["LAPSED"],
          },
        }),
      }),
    );
  });

  it("resolves never-given people from synced people without giving facts or lifecycle snapshots", async () => {
    const client = {
      givingFact: {
        findMany: vi.fn(async () => [
          {
            householdRockId: null,
            personRockId: 1,
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
      rockPerson: {
        findMany: vi.fn(async () => [
          { rockId: 1 },
          { rockId: 2 },
          { rockId: 3 },
        ]),
      },
    } as unknown as PrismaClient;

    await expect(
      resolveLifecycleFilteredRockIds(
        {
          field: "lifecycle",
          operator: "EQUALS",
          type: "condition",
          value: "NEVER_GIVEN",
        },
        "PERSON",
        client,
      ),
    ).resolves.toEqual([3]);
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
