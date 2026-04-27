import { describe, expect, it, vi } from "vitest";

import {
  assertValidRockPersonSyncJobData,
  enqueueRockFullSync,
  enqueueRockPersonSync,
  performRockFullSyncJob,
  performRockPersonSyncJob,
  ROCK_FULL_SYNC_QUEUE,
  scheduleRockFullSync,
  ROCK_PERSON_SYNC_QUEUE,
  scheduleRockPersonSync,
} from "@/lib/sync/jobs";

describe("pg-boss sync jobs", () => {
  it("enqueues full sync jobs with singleton protection", async () => {
    const boss = {
      send: vi.fn(async () => "job_1"),
    };

    await expect(enqueueRockFullSync(boss as never)).resolves.toBe("job_1");
    expect(boss.send).toHaveBeenCalledWith(
      ROCK_FULL_SYNC_QUEUE,
      {},
      { singletonKey: "full" },
    );
  });

  it("schedules full sync jobs with cron", async () => {
    const boss = {
      schedule: vi.fn(async () => undefined),
    };

    await scheduleRockFullSync(boss as never, {}, "0 * * * *", "test-key");

    expect(boss.schedule).toHaveBeenCalledWith(
      ROCK_FULL_SYNC_QUEUE,
      "0 * * * *",
      { requestedBy: "schedule" },
      {
        key: "test-key",
        singletonKey: "full",
      },
    );
  });

  it("validates person sync job data", () => {
    expect(() =>
      assertValidRockPersonSyncJobData({ personId: 8597 }),
    ).not.toThrow();
    expect(() => assertValidRockPersonSyncJobData({ personId: 0 })).toThrow(
      "positive integer personId",
    );
  });

  it("enqueues person sync jobs with singleton protection", async () => {
    const boss = {
      send: vi.fn(async () => "job_1"),
    };

    await expect(
      enqueueRockPersonSync(boss as never, { personId: 8597 }),
    ).resolves.toBe("job_1");
    expect(boss.send).toHaveBeenCalledWith(
      ROCK_PERSON_SYNC_QUEUE,
      { personId: 8597 },
      { singletonKey: "8597" },
    );
  });

  it("schedules person sync jobs with cron", async () => {
    const boss = {
      schedule: vi.fn(async () => undefined),
    };

    await scheduleRockPersonSync(
      boss as never,
      { personId: 8597 },
      "0 * * * *",
      "test-key",
    );

    expect(boss.schedule).toHaveBeenCalledWith(
      ROCK_PERSON_SYNC_QUEUE,
      "0 * * * *",
      { personId: 8597, requestedBy: "schedule" },
      {
        key: "test-key",
        singletonKey: "8597",
      },
    );
  });

  it("performs a sync job through the read-only Rock client abstraction", async () => {
    const slice = {
      groupTypes: [],
      groupRoles: [],
      definedValues: [],
      personAliases: [],
      people: [],
      familyGroups: [],
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
    const rockClient = {
      getPersonSlice: vi.fn(async () => slice),
    };
    const prisma = {
      givingFact: {
        findMany: vi.fn(async () => []),
      },
      givingPledgeRecommendationSnapshot: {
        deleteMany: vi.fn(async () => null),
      },
      syncRun: {
        create: vi.fn(async () => ({ id: "sync_1" })),
        update: vi.fn(async () => null),
      },
      $transaction: vi.fn(async (handler) =>
        handler({
          givingFact: { deleteMany: vi.fn(async () => null) },
          syncRun: { update: vi.fn(async () => null) },
        }),
      ),
    };

    await expect(
      performRockPersonSyncJob(
        { personId: 8597 },
        { prisma: prisma as never, rockClient },
      ),
    ).resolves.toMatchObject({
      syncRunId: "sync_1",
      status: "SUCCEEDED",
    });

    expect(rockClient.getPersonSlice).toHaveBeenCalledWith(8597);
  });

  it("performs a full sync job through the read-only Rock client abstraction", async () => {
    const slice = {
      groupTypes: [],
      groupRoles: [],
      definedValues: [],
      personAliases: [],
      people: [],
      familyGroups: [],
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
    const rockClient = {
      getFullSyncSlice: vi.fn(async () => slice),
    };
    const prisma = {
      givingFact: {
        findMany: vi.fn(async () => []),
      },
      givingPledgeRecommendationSnapshot: {
        deleteMany: vi.fn(async () => null),
      },
      syncRun: {
        create: vi.fn(async () => ({ id: "sync_1" })),
        update: vi.fn(async () => null),
      },
      $transaction: vi.fn(async (handler) =>
        handler({
          givingFact: { deleteMany: vi.fn(async () => null) },
          syncRun: { update: vi.fn(async () => null) },
        }),
      ),
    };

    await expect(
      performRockFullSyncJob({}, { prisma: prisma as never, rockClient }),
    ).resolves.toMatchObject({
      syncRunId: "sync_1",
      status: "SUCCEEDED",
    });

    expect(rockClient.getFullSyncSlice).toHaveBeenCalledOnce();
  });
});
