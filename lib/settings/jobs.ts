import type {
  DerivedCalculationRefresh,
  JobWorkerEvent,
  PrismaClient,
  SyncRun,
} from "@prisma/client";
import type { QueueResult, Schedule } from "pg-boss";

import { requireAppPermission } from "@/lib/auth/permissions";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { createSyncBoss, ensureSyncQueues } from "@/lib/sync/jobs";
import {
  JOB_DASHBOARD_QUEUES,
  type JobsDashboardQueueName,
} from "@/lib/sync/job-constants";
import { WORKER_EVENT_TYPES } from "@/lib/sync/worker-events";

export type JobsQueueSummary = {
  activeCount: number;
  deferredCount: number;
  hasSchedule: boolean;
  name: string;
  policy: string;
  queuedCount: number;
  totalCount: number;
};

export type JobsScheduleSummary = {
  cron: string;
  key: string;
  name: string;
  timezone: string;
};

export type RunningJobSummary = {
  jobId: string;
  lastMessage: string;
  lastUpdatedAt: Date;
  queue: string | null;
};

export type WorkerEventSummary = {
  createdAt: Date;
  eventType: string;
  id: string;
  jobId: string | null;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  metadata: Record<string, unknown> | null;
  queue: string | null;
};

export type JobsDashboardSummary = {
  degraded: {
    message: string;
    reason: string;
  } | null;
  derivedRefreshes: Pick<
    DerivedCalculationRefresh,
    | "completedAt"
    | "errorMessage"
    | "id"
    | "kind"
    | "requestedAt"
    | "startedAt"
    | "status"
  >[];
  fetchedAt: Date;
  queues: JobsQueueSummary[];
  recentEvents: WorkerEventSummary[];
  runningJobs: RunningJobSummary[];
  schedules: JobsScheduleSummary[];
  syncRuns: Pick<
    SyncRun,
    | "completedAt"
    | "id"
    | "recordsRead"
    | "recordsSkipped"
    | "recordsWritten"
    | "source"
    | "startedAt"
    | "status"
  >[];
};

type JobsClient = Pick<
  PrismaClient,
  "derivedCalculationRefresh" | "jobWorkerEvent" | "syncRun"
>;

type QueueTelemetry = {
  queues: QueueResult[];
  schedules: Schedule[];
};

type QueueTelemetryLoader = () => Promise<QueueTelemetry>;

export async function listJobsDashboardSummary(
  actor: LocalAppUser,
  client: JobsClient = prisma,
  loadQueueTelemetry: QueueTelemetryLoader = loadQueueTelemetryFromPgBoss,
): Promise<JobsDashboardSummary> {
  requireAppPermission(actor, "settings:manage");

  const [syncRuns, derivedRefreshes, recentEvents] = await Promise.all([
    client.syncRun.findMany({
      orderBy: [{ startedAt: "desc" }],
      select: {
        completedAt: true,
        id: true,
        recordsRead: true,
        recordsSkipped: true,
        recordsWritten: true,
        source: true,
        startedAt: true,
        status: true,
      },
      take: 25,
    }),
    client.derivedCalculationRefresh.findMany({
      orderBy: [{ requestedAt: "desc" }],
      select: {
        completedAt: true,
        errorMessage: true,
        id: true,
        kind: true,
        requestedAt: true,
        startedAt: true,
        status: true,
      },
      take: 25,
      where: {
        kind: "FUND_SCOPED_GIVING",
      },
    }),
    client.jobWorkerEvent.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
    }),
  ]);

  let telemetry: QueueTelemetry | null = null;
  let degraded: JobsDashboardSummary["degraded"] = null;

  try {
    telemetry = await loadQueueTelemetry();
  } catch (error) {
    degraded = {
      message:
        "Queue telemetry is temporarily unavailable. Worker history below is still live from app storage.",
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const queueSummaries = summarizeQueues(telemetry);
  const scheduleSummaries = summarizeSchedules(telemetry);

  return {
    degraded,
    derivedRefreshes,
    fetchedAt: new Date(),
    queues: queueSummaries.map((queue) => ({
      ...queue,
      hasSchedule: scheduleSummaries.some(
        (schedule) => schedule.name === queue.name,
      ),
    })),
    recentEvents: recentEvents.map(toWorkerEventSummary),
    runningJobs: inferRunningJobs(recentEvents),
    schedules: scheduleSummaries,
    syncRuns,
  };
}

export async function loadQueueTelemetryFromPgBoss(): Promise<QueueTelemetry> {
  const boss = createSyncBoss();

  try {
    await boss.start();
    await ensureSyncQueues(boss);

    const [queues, schedules] = await Promise.all([
      boss.getQueues([...JOB_DASHBOARD_QUEUES]),
      boss.getSchedules(),
    ]);

    const stats = await Promise.all(
      JOB_DASHBOARD_QUEUES.map(async (queueName) => {
        try {
          return await boss.getQueueStats(queueName);
        } catch {
          return queues.find((queue) => queue.name === queueName) ?? null;
        }
      }),
    );

    return {
      queues: stats.filter((queue): queue is QueueResult => Boolean(queue)),
      schedules: schedules.filter((schedule) =>
        JOB_DASHBOARD_QUEUES.includes(schedule.name as JobsDashboardQueueName),
      ),
    };
  } finally {
    await boss.stop({ graceful: false, timeout: 5000 });
  }
}

function summarizeQueues(telemetry: QueueTelemetry | null): JobsQueueSummary[] {
  if (!telemetry) {
    return JOB_DASHBOARD_QUEUES.map((name) => ({
      activeCount: 0,
      deferredCount: 0,
      hasSchedule: false,
      name,
      policy: "singleton",
      queuedCount: 0,
      totalCount: 0,
    }));
  }

  return JOB_DASHBOARD_QUEUES.map((name) => {
    const queue = telemetry.queues.find((item) => item.name === name);

    return {
      activeCount: queue?.activeCount ?? 0,
      deferredCount: queue?.deferredCount ?? 0,
      hasSchedule: false,
      name,
      policy: queue?.policy ?? "singleton",
      queuedCount: queue?.queuedCount ?? 0,
      totalCount: queue?.totalCount ?? 0,
    };
  });
}

function summarizeSchedules(
  telemetry: QueueTelemetry | null,
): JobsScheduleSummary[] {
  if (!telemetry) {
    return [];
  }

  return telemetry.schedules
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((schedule) => ({
      cron: schedule.cron,
      key: schedule.key,
      name: schedule.name,
      timezone: schedule.timezone,
    }));
}

function toWorkerEventSummary(event: JobWorkerEvent): WorkerEventSummary {
  return {
    createdAt: event.createdAt,
    eventType: event.eventType,
    id: event.id,
    jobId: event.jobId,
    level: event.level,
    message: event.message,
    metadata:
      event.metadata && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : null,
    queue: event.queue,
  };
}

function inferRunningJobs(events: JobWorkerEvent[]): RunningJobSummary[] {
  const latestByJob = new Map<string, JobWorkerEvent>();

  for (const event of events) {
    if (!event.jobId || latestByJob.has(event.jobId)) {
      continue;
    }

    latestByJob.set(event.jobId, event);
  }

  return Array.from(latestByJob.values())
    .filter(
      (event) =>
        event.eventType === WORKER_EVENT_TYPES.JOB_STARTED ||
        event.eventType === WORKER_EVENT_TYPES.JOB_PROGRESS,
    )
    .map((event) => ({
      jobId: event.jobId!,
      lastMessage: event.message,
      lastUpdatedAt: event.createdAt,
      queue: event.queue,
    }))
    .sort(
      (left, right) =>
        right.lastUpdatedAt.getTime() - left.lastUpdatedAt.getTime(),
    );
}
