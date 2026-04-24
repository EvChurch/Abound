import { PgBoss } from "pg-boss";

import { RockClient } from "@/lib/rock/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  performFundScopedGivingRefresh,
  type FundScopedGivingRefreshJobData,
} from "@/lib/giving/derived-refresh";

export type { FundScopedGivingRefreshJobData } from "@/lib/giving/derived-refresh";
import {
  syncRockPersonSlice,
  syncRockSlice,
  type SyncRunOptions,
  type SyncSummary,
} from "@/lib/sync/run-sync";

import {
  GIVING_DERIVED_REFRESH_QUEUE,
  ROCK_FULL_SYNC_QUEUE,
  ROCK_FULL_SYNC_SCHEDULE_KEY,
  ROCK_PERSON_SYNC_QUEUE,
  ROCK_PERSON_SYNC_SCHEDULE_KEY,
} from "@/lib/sync/job-constants";

export {
  GIVING_DERIVED_REFRESH_QUEUE,
  ROCK_FULL_SYNC_QUEUE,
  ROCK_FULL_SYNC_SCHEDULE_KEY,
  ROCK_PERSON_SYNC_QUEUE,
  ROCK_PERSON_SYNC_SCHEDULE_KEY,
};

export type RockFullSyncJobData = {
  requestedBy?: "manual" | "schedule";
};

export type RockPersonSyncJobData = {
  personId: number;
  requestedBy?: "manual" | "schedule";
};

export type RockSyncJobResult = SyncSummary;
export type FundScopedGivingRefreshJobResult = Awaited<
  ReturnType<typeof performFundScopedGivingRefresh>
>;

export type RockFullSyncDependencies = {
  prisma?: PrismaClient;
  rockClient: Pick<RockClient, "getFullSyncSlice">;
  syncOptions?: SyncRunOptions;
};

export type RockPersonSyncDependencies = {
  prisma?: PrismaClient;
  rockClient: Pick<RockClient, "getPersonSlice">;
  syncOptions?: SyncRunOptions;
};

export function createSyncBoss(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize pg-boss.");
  }

  return new PgBoss({
    connectionString,
    application_name: "church-giving-management-sync",
  });
}

export async function ensureSyncQueues(boss: PgBoss) {
  await boss.createQueue(ROCK_FULL_SYNC_QUEUE, {
    policy: "singleton",
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 60 * 60 * 2,
    retentionSeconds: 60 * 60 * 24 * 14,
    deleteAfterSeconds: 60 * 60 * 24 * 7,
  });

  await boss.createQueue(ROCK_PERSON_SYNC_QUEUE, {
    policy: "singleton",
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 60 * 30,
    retentionSeconds: 60 * 60 * 24 * 14,
    deleteAfterSeconds: 60 * 60 * 24 * 7,
  });

  await boss.createQueue(GIVING_DERIVED_REFRESH_QUEUE, {
    policy: "singleton",
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 60 * 30,
    retentionSeconds: 60 * 60 * 24 * 14,
    deleteAfterSeconds: 60 * 60 * 24 * 7,
  });
}

export async function enqueueRockFullSync(
  boss: PgBoss,
  data: RockFullSyncJobData = {},
) {
  return boss.send(ROCK_FULL_SYNC_QUEUE, data, {
    singletonKey: "full",
  });
}

export async function enqueueRockPersonSync(
  boss: PgBoss,
  data: RockPersonSyncJobData,
) {
  assertValidRockPersonSyncJobData(data);

  return boss.send(ROCK_PERSON_SYNC_QUEUE, data, {
    singletonKey: String(data.personId),
  });
}

export async function enqueueFundScopedGivingRefresh(
  boss: PgBoss,
  data: FundScopedGivingRefreshJobData,
) {
  assertValidFundScopedGivingRefreshJobData(data);

  return boss.send(GIVING_DERIVED_REFRESH_QUEUE, data, {
    singletonKey: "fund-scoped-giving",
  });
}

export async function scheduleRockFullSync(
  boss: PgBoss,
  data: RockFullSyncJobData,
  cron: string,
  key = ROCK_FULL_SYNC_SCHEDULE_KEY,
) {
  await boss.schedule(
    ROCK_FULL_SYNC_QUEUE,
    cron,
    { ...data, requestedBy: "schedule" },
    {
      key,
      singletonKey: "full",
    },
  );
}

export async function scheduleRockPersonSync(
  boss: PgBoss,
  data: RockPersonSyncJobData,
  cron: string,
  key = ROCK_PERSON_SYNC_SCHEDULE_KEY,
) {
  assertValidRockPersonSyncJobData(data);

  await boss.schedule(
    ROCK_PERSON_SYNC_QUEUE,
    cron,
    { ...data, requestedBy: "schedule" },
    {
      key,
      singletonKey: String(data.personId),
    },
  );
}

export async function unscheduleRockPersonSync(
  boss: PgBoss,
  key = ROCK_PERSON_SYNC_SCHEDULE_KEY,
) {
  await boss.unschedule(ROCK_PERSON_SYNC_QUEUE, key);
}

export async function performRockPersonSyncJob(
  data: RockPersonSyncJobData,
  dependencies: RockPersonSyncDependencies,
): Promise<RockSyncJobResult> {
  assertValidRockPersonSyncJobData(data);

  const slice = await dependencies.rockClient.getPersonSlice(data.personId);
  return syncRockPersonSlice(
    dependencies.prisma ?? prisma,
    slice,
    dependencies.syncOptions,
  );
}

export async function performRockFullSyncJob(
  _data: RockFullSyncJobData,
  dependencies: RockFullSyncDependencies,
): Promise<RockSyncJobResult> {
  const slice = await dependencies.rockClient.getFullSyncSlice();
  return syncRockSlice(
    dependencies.prisma ?? prisma,
    slice,
    dependencies.syncOptions,
  );
}

export async function performFundScopedGivingRefreshJob(
  data: FundScopedGivingRefreshJobData,
  dependencies: { prisma?: PrismaClient } = {},
): Promise<FundScopedGivingRefreshJobResult> {
  assertValidFundScopedGivingRefreshJobData(data);

  return performFundScopedGivingRefresh(data, dependencies.prisma ?? prisma);
}

export function assertValidRockPersonSyncJobData(data: RockPersonSyncJobData) {
  if (!Number.isInteger(data.personId) || data.personId <= 0) {
    throw new Error(
      "Rock person sync jobs require a positive integer personId.",
    );
  }
}

export function assertValidFundScopedGivingRefreshJobData(
  data: FundScopedGivingRefreshJobData,
) {
  if (!data.refreshId || typeof data.refreshId !== "string") {
    throw new Error("Fund-scoped giving refresh jobs require a refreshId.");
  }
}
