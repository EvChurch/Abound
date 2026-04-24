import { describe, expect, it, vi } from "vitest";

import { listJobsDashboardSummary } from "@/lib/settings/jobs";
import { JOB_DASHBOARD_QUEUES } from "@/lib/sync/job-constants";
import { WORKER_EVENT_TYPES } from "@/lib/sync/worker-events";

describe("listJobsDashboardSummary", () => {
  const actor = {
    active: true,
    auth0Subject: "auth0|admin",
    email: "admin@example.com",
    id: "user_admin",
    name: "Admin",
    rockPersonId: null,
    role: "ADMIN",
  } as const;

  it("returns queue telemetry plus running jobs inferred from worker events", async () => {
    const client = {
      derivedCalculationRefresh: {
        findMany: vi.fn(async () => [
          {
            completedAt: null,
            errorMessage: null,
            id: "refresh_1",
            kind: "FUND_SCOPED_GIVING",
            requestedAt: new Date("2026-04-23T12:00:00.000Z"),
            startedAt: new Date("2026-04-23T12:01:00.000Z"),
            status: "RUNNING",
          },
        ]),
      },
      jobWorkerEvent: {
        findMany: vi.fn(async () => [
          {
            createdAt: new Date("2026-04-23T12:03:00.000Z"),
            eventType: WORKER_EVENT_TYPES.JOB_PROGRESS,
            id: "event_progress",
            jobId: "job_1",
            level: "INFO",
            message: "Sync progress transactions: 5000/20000.",
            metadata: { stage: "transactions" },
            queue: JOB_DASHBOARD_QUEUES[0],
          },
          {
            createdAt: new Date("2026-04-23T12:02:00.000Z"),
            eventType: WORKER_EVENT_TYPES.JOB_STARTED,
            id: "event_started",
            jobId: "job_2",
            level: "INFO",
            message: "Rock person sync job started.",
            metadata: { personId: 8597 },
            queue: JOB_DASHBOARD_QUEUES[1],
          },
          {
            createdAt: new Date("2026-04-23T12:01:00.000Z"),
            eventType: WORKER_EVENT_TYPES.JOB_SUCCEEDED,
            id: "event_done",
            jobId: "job_3",
            level: "INFO",
            message: "Sync job completed successfully.",
            metadata: null,
            queue: JOB_DASHBOARD_QUEUES[0],
          },
        ]),
      },
      syncRun: {
        findMany: vi.fn(async () => [
          {
            completedAt: new Date("2026-04-23T12:02:00.000Z"),
            id: "sync_1",
            recordsRead: 100,
            recordsSkipped: 1,
            recordsWritten: 200,
            source: "rock:v1",
            startedAt: new Date("2026-04-23T12:00:00.000Z"),
            status: "SUCCEEDED",
          },
        ]),
      },
    };

    const telemetryLoader = vi.fn(async () => ({
      queues: [
        {
          activeCount: 1,
          createdOn: new Date("2026-04-23T00:00:00.000Z"),
          deferredCount: 0,
          heartbeatSeconds: undefined,
          name: JOB_DASHBOARD_QUEUES[0],
          policy: "singleton",
          queuedCount: 2,
          singletonsActive: null,
          table: "job",
          totalCount: 3,
          updatedOn: new Date("2026-04-23T00:00:00.000Z"),
        } as unknown as import("pg-boss").QueueResult,
      ],
      schedules: [
        {
          cron: "0 * * * *",
          data: {},
          key: "default-rock-full-sync",
          name: JOB_DASHBOARD_QUEUES[0],
          options: {},
          timezone: "UTC",
        },
      ],
    }));

    const summary = await listJobsDashboardSummary(
      actor,
      client as never,
      telemetryLoader,
    );

    expect(summary.degraded).toBeNull();
    expect(summary.queues).toHaveLength(3);
    expect(summary.queues[0]).toMatchObject({
      activeCount: 1,
      hasSchedule: true,
      name: JOB_DASHBOARD_QUEUES[0],
      queuedCount: 2,
    });
    expect(summary.runningJobs.map((job) => job.jobId)).toEqual([
      "job_1",
      "job_2",
    ]);
    expect(summary.recentEvents[0]).toMatchObject({
      id: "event_progress",
      queue: JOB_DASHBOARD_QUEUES[0],
    });
  });

  it("returns degraded mode when queue telemetry fails", async () => {
    const client = {
      derivedCalculationRefresh: {
        findMany: vi.fn(async () => []),
      },
      jobWorkerEvent: {
        findMany: vi.fn(async () => []),
      },
      syncRun: {
        findMany: vi.fn(async () => []),
      },
    };

    const summary = await listJobsDashboardSummary(
      actor,
      client as never,
      vi.fn(async () => {
        throw new Error("pg-boss unavailable");
      }),
    );

    expect(summary.degraded?.reason).toBe("pg-boss unavailable");
    expect(summary.queues).toHaveLength(3);
    expect(summary.schedules).toEqual([]);
  });
});
