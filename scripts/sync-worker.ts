import "dotenv/config";

import type { Job } from "pg-boss";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { RockClient } from "@/lib/rock/client";
import type { SyncProgressEvent } from "@/lib/sync/run-sync";
import {
  createSyncBoss,
  ensureSyncQueues,
  GIVING_DERIVED_REFRESH_QUEUE,
  performFundScopedGivingRefreshJob,
  performRockFullSyncJob,
  performRockPersonSyncJob,
  type FundScopedGivingRefreshJobData,
  ROCK_FULL_SYNC_QUEUE,
  type RockFullSyncJobData,
  ROCK_PERSON_SYNC_QUEUE,
  type RockPersonSyncJobData,
} from "@/lib/sync/jobs";
import {
  recordJobWorkerEvent,
  WORKER_EVENT_TYPES,
} from "@/lib/sync/worker-events";

const once = process.argv.includes("--once");
const onceTimeoutMs = Number(process.env.SYNC_WORKER_ONCE_TIMEOUT_MS ?? 900000);
const chunkSize = Number(process.env.SYNC_CHUNK_SIZE ?? 250);
const baseUrl = process.env.ROCK_BASE_URL;
const restKey = process.env.ROCK_REST_KEY;

if (!baseUrl || !restKey) {
  console.error("ROCK_BASE_URL and ROCK_REST_KEY are required.");
  process.exit(1);
}

async function main() {
  const boss = createSyncBoss();
  boss.on("error", (error) => console.error(error.message));
  await boss.start();
  await ensureSyncQueues(boss);
  await emitWorkerEvent({
    eventType: WORKER_EVENT_TYPES.WORKER_STARTED,
    message: "Sync worker started.",
    metadata: {
      chunkSize,
      once,
    },
  });

  const rockClient = new RockClient({ baseUrl: baseUrl!, restKey: restKey! });
  let processed = 0;
  let resolveOnce: (() => void) | null = null;

  const oncePromise = once
    ? new Promise<void>((resolve) => {
        resolveOnce = resolve;
      })
    : null;

  await boss.work<RockFullSyncJobData>(
    ROCK_FULL_SYNC_QUEUE,
    {
      batchSize: 1,
      pollingIntervalSeconds: 1,
    },
    async (jobs: Job<RockFullSyncJobData>[]) => {
      for (const job of jobs) {
        await emitWorkerEvent({
          eventType: WORKER_EVENT_TYPES.JOB_STARTED,
          jobId: job.id,
          message: "Rock full sync job started.",
          metadata: {
            requestedBy: job.data.requestedBy ?? "manual",
          },
          queue: ROCK_FULL_SYNC_QUEUE,
        });
        try {
          const result = await performRockFullSyncJob(job.data, {
            prisma,
            rockClient,
            syncOptions: {
              chunkSize,
              onProgress: createProgressLogger(ROCK_FULL_SYNC_QUEUE, job.id),
            },
          });
          processed += 1;
          await logSyncResult(ROCK_FULL_SYNC_QUEUE, job.id, result);
        } catch (error) {
          await emitWorkerEvent({
            eventType: WORKER_EVENT_TYPES.JOB_FAILED,
            jobId: job.id,
            level: "ERROR",
            message: toErrorMessage(error),
            metadata: {
              requestedBy: job.data.requestedBy ?? "manual",
            },
            queue: ROCK_FULL_SYNC_QUEUE,
          });
          throw error;
        }
      }

      if (once && resolveOnce) {
        resolveOnce();
      }
    },
  );

  await boss.work<RockPersonSyncJobData>(
    ROCK_PERSON_SYNC_QUEUE,
    {
      batchSize: 1,
      pollingIntervalSeconds: 1,
    },
    async (jobs: Job<RockPersonSyncJobData>[]) => {
      for (const job of jobs) {
        await emitWorkerEvent({
          eventType: WORKER_EVENT_TYPES.JOB_STARTED,
          jobId: job.id,
          message: "Rock person sync job started.",
          metadata: {
            personId: job.data.personId,
            requestedBy: job.data.requestedBy ?? "manual",
          },
          queue: ROCK_PERSON_SYNC_QUEUE,
        });
        try {
          const result = await performRockPersonSyncJob(job.data, {
            prisma,
            rockClient,
            syncOptions: {
              chunkSize,
              onProgress: createProgressLogger(ROCK_PERSON_SYNC_QUEUE, job.id),
            },
          });
          processed += 1;
          await logSyncResult(ROCK_PERSON_SYNC_QUEUE, job.id, result);
        } catch (error) {
          await emitWorkerEvent({
            eventType: WORKER_EVENT_TYPES.JOB_FAILED,
            jobId: job.id,
            level: "ERROR",
            message: toErrorMessage(error),
            metadata: {
              personId: job.data.personId,
              requestedBy: job.data.requestedBy ?? "manual",
            },
            queue: ROCK_PERSON_SYNC_QUEUE,
          });
          throw error;
        }
      }

      if (once && resolveOnce) {
        resolveOnce();
      }
    },
  );

  await boss.work<FundScopedGivingRefreshJobData>(
    GIVING_DERIVED_REFRESH_QUEUE,
    {
      batchSize: 1,
      pollingIntervalSeconds: 1,
    },
    async (jobs: Job<FundScopedGivingRefreshJobData>[]) => {
      for (const job of jobs) {
        await emitWorkerEvent({
          eventType: WORKER_EVENT_TYPES.JOB_STARTED,
          jobId: job.id,
          message: "Fund-scoped giving refresh job started.",
          metadata: {
            refreshId: job.data.refreshId,
          },
          queue: GIVING_DERIVED_REFRESH_QUEUE,
        });
        try {
          const result = await performFundScopedGivingRefreshJob(job.data, {
            prisma,
          });
          processed += 1;
          await emitWorkerEvent({
            eventType: WORKER_EVENT_TYPES.JOB_SUCCEEDED,
            jobId: job.id,
            message: "Fund-scoped giving refresh job completed successfully.",
            metadata: {
              householdSnapshots: result.householdSnapshots,
              personSnapshots: result.personSnapshots,
              refreshId: job.data.refreshId,
              totalSnapshots: result.totalSnapshots,
            },
            queue: GIVING_DERIVED_REFRESH_QUEUE,
          });
        } catch (error) {
          await emitWorkerEvent({
            eventType: WORKER_EVENT_TYPES.JOB_FAILED,
            jobId: job.id,
            level: "ERROR",
            message: toErrorMessage(error),
            metadata: {
              refreshId: job.data.refreshId,
            },
            queue: GIVING_DERIVED_REFRESH_QUEUE,
          });
          throw error;
        }
      }

      if (once && resolveOnce) {
        resolveOnce();
      }
    },
  );

  if (oncePromise) {
    await Promise.race([
      oncePromise,
      new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error("Timed out waiting for one sync job.")),
          onceTimeoutMs,
        );
      }),
    ]);
    await emitWorkerEvent({
      eventType: WORKER_EVENT_TYPES.WORKER_STOPPED,
      message: "Sync worker stopped after one job.",
      metadata: {
        processed,
      },
    });
    await boss.stop({ graceful: false, timeout: 5000 });
    await prisma.$disconnect();
    console.log(`processed=${processed}`);
    return;
  }

  console.log("sync worker started");
}

function createProgressLogger(queue: string, jobId: string) {
  const lastLoggedByStage = new Map<string, number>();

  return (event: SyncProgressEvent) => {
    const lastLogged = lastLoggedByStage.get(event.stage) ?? -1;
    const shouldLog =
      event.completed === 0 ||
      event.completed === event.total ||
      event.completed - lastLogged >= 5000;

    if (!shouldLog) {
      return;
    }

    lastLoggedByStage.set(event.stage, event.completed);
    void emitWorkerEvent({
      eventType: WORKER_EVENT_TYPES.JOB_PROGRESS,
      jobId,
      message: `Sync progress ${event.stage}: ${event.completed}/${event.total}.`,
      metadata: {
        completed: event.completed,
        stage: event.stage,
        syncRunId: event.syncRunId,
        total: event.total,
      },
      queue,
    });
  };
}

async function logSyncResult(
  queue: string,
  jobId: string,
  result: Awaited<ReturnType<typeof performRockFullSyncJob>>,
) {
  await emitWorkerEvent({
    eventType:
      result.status === "FAILED"
        ? WORKER_EVENT_TYPES.JOB_FAILED
        : WORKER_EVENT_TYPES.JOB_SUCCEEDED,
    jobId,
    level: result.status === "FAILED" ? "ERROR" : "INFO",
    message:
      result.status === "FAILED"
        ? "Sync job failed."
        : "Sync job completed successfully.",
    metadata: {
      issueCount: result.issueCount,
      recordsRead: result.recordsRead,
      recordsSkipped: result.recordsSkipped,
      recordsWritten: result.recordsWritten,
      status: result.status,
      syncRunId: result.syncRunId,
    },
    queue,
  });
}

main().catch(async (error: unknown) => {
  await emitWorkerEvent({
    eventType: WORKER_EVENT_TYPES.WORKER_STOPPED,
    level: "ERROR",
    message: "Sync worker exited with an error.",
    metadata: {
      error: toErrorMessage(error),
    },
  });
  console.error(error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
});

async function emitWorkerEvent(input: {
  eventType: (typeof WORKER_EVENT_TYPES)[keyof typeof WORKER_EVENT_TYPES];
  jobId?: string;
  level?: "INFO" | "WARNING" | "ERROR";
  message: string;
  metadata?: Prisma.InputJsonValue;
  queue?: string;
}) {
  const line = [
    input.queue && `queue=${input.queue}`,
    input.jobId && `jobId=${input.jobId}`,
    `eventType=${input.eventType}`,
    input.message,
  ]
    .filter(Boolean)
    .join(" ");
  console.log(line);

  try {
    await recordJobWorkerEvent({
      eventType: input.eventType,
      jobId: input.jobId ?? null,
      level: input.level ?? "INFO",
      message: input.message,
      metadata: input.metadata ?? null,
      queue: input.queue ?? null,
    });
  } catch (error) {
    console.error(
      `Failed to persist worker event: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
