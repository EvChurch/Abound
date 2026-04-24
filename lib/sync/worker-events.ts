import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const WORKER_EVENT_TYPES = {
  JOB_FAILED: "JOB_FAILED",
  JOB_PROGRESS: "JOB_PROGRESS",
  JOB_STARTED: "JOB_STARTED",
  JOB_SUCCEEDED: "JOB_SUCCEEDED",
  WORKER_STARTED: "WORKER_STARTED",
  WORKER_STOPPED: "WORKER_STOPPED",
} as const;

export type WorkerEventType =
  (typeof WORKER_EVENT_TYPES)[keyof typeof WORKER_EVENT_TYPES];

export type RecordJobWorkerEventInput = {
  eventType: WorkerEventType;
  jobId?: string | null;
  level?: "INFO" | "WARNING" | "ERROR";
  message: string;
  metadata?: Prisma.InputJsonValue | null;
  queue?: string | null;
};

export type ListJobWorkerEventsInput = {
  limit?: number;
  since?: Date | null;
};

export async function recordJobWorkerEvent(
  input: RecordJobWorkerEventInput,
  client: Pick<PrismaClient, "jobWorkerEvent"> = prisma,
) {
  await client.jobWorkerEvent.create({
    data: {
      eventType: input.eventType,
      jobId: input.jobId ?? null,
      level: input.level ?? "INFO",
      message: input.message,
      metadata: input.metadata ?? undefined,
      queue: input.queue ?? null,
    },
  });
}

export async function listJobWorkerEvents(
  input: ListJobWorkerEventsInput = {},
  client: Pick<PrismaClient, "jobWorkerEvent"> = prisma,
) {
  const limit = clampLimit(input.limit);

  return client.jobWorkerEvent.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    where: input.since
      ? {
          createdAt: {
            gt: input.since,
          },
        }
      : undefined,
  });
}

function clampLimit(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(500, Math.max(1, Math.trunc(value)));
}
