import "dotenv/config";

import type { Job } from "pg-boss";

import { prisma } from "@/lib/db/prisma";
import { RockClient } from "@/lib/rock/client";
import type { SyncProgressEvent } from "@/lib/sync/run-sync";
import {
  createSyncBoss,
  ensureSyncQueues,
  performRockFullSyncJob,
  performRockPersonSyncJob,
  ROCK_FULL_SYNC_QUEUE,
  type RockFullSyncJobData,
  ROCK_PERSON_SYNC_QUEUE,
  type RockPersonSyncJobData,
} from "@/lib/sync/jobs";

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
        console.log(`queue=${ROCK_FULL_SYNC_QUEUE} jobId=${job.id} started`);
        const result = await performRockFullSyncJob(job.data, {
          prisma,
          rockClient,
          syncOptions: {
            chunkSize,
            onProgress: createProgressLogger(ROCK_FULL_SYNC_QUEUE, job.id),
          },
        });
        processed += 1;
        logSyncResult(ROCK_FULL_SYNC_QUEUE, job.id, result);
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
        console.log(`queue=${ROCK_PERSON_SYNC_QUEUE} jobId=${job.id} started`);
        const result = await performRockPersonSyncJob(job.data, {
          prisma,
          rockClient,
          syncOptions: {
            chunkSize,
            onProgress: createProgressLogger(ROCK_PERSON_SYNC_QUEUE, job.id),
          },
        });
        processed += 1;
        logSyncResult(ROCK_PERSON_SYNC_QUEUE, job.id, result);
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
    console.log(
      [
        `queue=${queue}`,
        `jobId=${jobId}`,
        `syncRunId=${event.syncRunId}`,
        `stage=${event.stage}`,
        `completed=${event.completed}`,
        `total=${event.total}`,
      ].join(" "),
    );
  };
}

function logSyncResult(
  queue: string,
  jobId: string,
  result: Awaited<ReturnType<typeof performRockFullSyncJob>>,
) {
  console.log(
    [
      `queue=${queue}`,
      `jobId=${jobId}`,
      `syncRunId=${result.syncRunId}`,
      `status=${result.status}`,
      `recordsRead=${result.recordsRead}`,
      `recordsWritten=${result.recordsWritten}`,
      `recordsSkipped=${result.recordsSkipped}`,
      `issueCount=${result.issueCount}`,
    ].join(" "),
  );
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
});
