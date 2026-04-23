import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { refreshGivingLifecycleSnapshots } from "@/lib/giving/lifecycle-snapshots";

export type FundScopedGivingRefreshJobData = {
  refreshId: string;
};

type DerivedRefreshClient = Pick<
  PrismaClient,
  | "derivedCalculationRefresh"
  | "givingFact"
  | "givingLifecycleSnapshot"
  | "platformFundSetting"
  | "syncRun"
> & {
  $transaction: PrismaClient["$transaction"];
};

export async function requestFundScopedGivingRefresh(
  input: { requestedByUserId?: string | null },
  client: Pick<PrismaClient, "derivedCalculationRefresh"> = prisma,
  enqueueRefresh: (
    data: FundScopedGivingRefreshJobData,
  ) => Promise<unknown> = defaultRefreshEnqueue,
) {
  const refresh = await client.derivedCalculationRefresh.create({
    data: {
      kind: "FUND_SCOPED_GIVING",
      requestedByUserId: input.requestedByUserId ?? null,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  try {
    await enqueueRefresh({ refreshId: refresh.id });
  } catch (error) {
    await client.derivedCalculationRefresh.update({
      data: {
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        status: "FAILED",
      },
      where: { id: refresh.id },
    });
  }

  return refresh;
}

export async function performFundScopedGivingRefresh(
  input: FundScopedGivingRefreshJobData,
  client: DerivedRefreshClient = prisma,
) {
  const startedAt = new Date();

  await client.derivedCalculationRefresh.update({
    data: {
      errorMessage: null,
      startedAt,
      status: "RUNNING",
    },
    where: { id: input.refreshId },
  });

  try {
    const latestSyncRun = await client.syncRun.findFirst({
      orderBy: [{ startedAt: "desc" }],
      select: { id: true },
    });
    const result = latestSyncRun
      ? await refreshGivingLifecycleSnapshots(
          { syncRunId: latestSyncRun.id },
          client,
        )
      : await clearGivingLifecycleSnapshots(client);

    await client.derivedCalculationRefresh.update({
      data: {
        completedAt: new Date(),
        metadata: result,
        status: "SUCCEEDED",
      },
      where: { id: input.refreshId },
    });

    return result;
  } catch (error) {
    await client.derivedCalculationRefresh.update({
      data: {
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        status: "FAILED",
      },
      where: { id: input.refreshId },
    });

    throw error;
  }
}

async function clearGivingLifecycleSnapshots(
  client: Pick<PrismaClient, "givingLifecycleSnapshot">,
) {
  await client.givingLifecycleSnapshot.deleteMany({});

  return {
    householdSnapshots: 0,
    personSnapshots: 0,
    totalSnapshots: 0,
  };
}

async function defaultRefreshEnqueue(data: FundScopedGivingRefreshJobData) {
  const { createSyncBoss, enqueueFundScopedGivingRefresh, ensureSyncQueues } =
    await import("@/lib/sync/jobs");

  const boss = createSyncBoss();
  await boss.start();
  await ensureSyncQueues(boss);
  const jobId = await enqueueFundScopedGivingRefresh(boss, data);
  await boss.stop();

  return jobId;
}
