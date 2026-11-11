import type { QueueResult, Schedule } from "pg-boss";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listJobsDashboardSummary } from "@/lib/settings/jobs";
import { JOB_DASHBOARD_QUEUES } from "@/lib/sync/job-constants";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  getQueues: vi.fn<() => Promise<QueueResult[]>>(),
  getSchedules: vi.fn<() => Promise<Schedule[]>>(),
  // The old loader must fail even when the new history API returns no samples.
  getQueueStats: vi.fn(async () => []),
  ensureSyncQueues: vi.fn(),
}));

vi.mock("@/lib/sync/jobs", () => ({
  createSyncBoss: () => mocks,
  ensureSyncQueues: mocks.ensureSyncQueues,
}));

const actor = {
  active: true,
  auth0Subject: "auth0|synthetic",
  email: null,
  id: "synthetic",
  name: null,
  rockPersonId: null,
};

const client = {
  derivedCalculationRefresh: { findMany: vi.fn(async () => []) },
  jobWorkerEvent: { findMany: vi.fn(async () => []) },
  syncRun: { findMany: vi.fn(async () => []) },
};

const queues = JOB_DASHBOARD_QUEUES.map(
  (name) =>
    ({
      name,
      policy: "singleton",
      activeCount: 1,
      blockedCount: 0,
      completedDelta: 0,
      createdDelta: 0,
      createdOn: new Date("2026-11-12T00:00:00Z"),
      deferredCount: 2,
      deltaOn: null,
      deltaSeconds: null,
      failedCount: 0,
      failedDelta: 0,
      queuedCount: 5,
      readyCount: 3,
      readyOldestSeconds: null,
      runBins: null,
      singletonsActive: null,
      table: "job_common",
      totalCount: 6,
      updatedOn: new Date("2026-11-12T00:00:00Z"),
      waitBins: null,
    }) satisfies QueueResult,
);

const schedule = {
  createdOn: new Date("2026-11-12T00:00:00Z"),
  cron: "0 * * * *",
  key: "default-rock-full-sync",
  kind: "cron",
  lastJobId: null,
  name: JOB_DASHBOARD_QUEUES[0],
  timezone: "UTC",
  updatedOn: new Date("2026-11-12T00:00:00Z"),
} satisfies Schedule;

describe("jobs dashboard with the production telemetry loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getQueues.mockResolvedValue(queues);
    mocks.getSchedules.mockResolvedValue([
      schedule,
      { ...schedule, name: "unrelated-queue" },
    ]);
  });

  it("reports nonzero queued, active and deferred work and maps only app schedules", async () => {
    const summary = await listJobsDashboardSummary(actor, client as never);

    expect(summary.degraded).toBeNull();
    expect(summary.queues[0]).toEqual({
      name: JOB_DASHBOARD_QUEUES[0],
      policy: "singleton",
      activeCount: 1,
      deferredCount: 2,
      queuedCount: 5,
      totalCount: 6,
      hasSchedule: true,
    });
    expect(summary.queues[1].hasSchedule).toBe(false);
    expect(summary.schedules).toEqual([
      {
        cron: schedule.cron,
        key: schedule.key,
        name: schedule.name,
        timezone: "UTC",
      },
    ]);
    expect(mocks.stop).toHaveBeenCalledWith({ graceful: false, timeout: 5000 });
  });

  it.each(["getQueues", "getSchedules"] as const)(
    "degrades on a failed %s read and still stops the connection",
    async (method) => {
      mocks[method].mockRejectedValueOnce(
        new Error("synthetic read unavailable"),
      );
      const summary = await listJobsDashboardSummary(actor, client as never);
      expect(summary.degraded?.reason).toBe("synthetic read unavailable");
      expect(summary.schedules).toEqual([]);
      expect(summary.queues).toHaveLength(JOB_DASHBOARD_QUEUES.length);
      expect(mocks.stop).toHaveBeenCalledOnce();
    },
  );

  it("degrades if an expected queue is missing instead of reporting healthy zero counts", async () => {
    mocks.getQueues.mockResolvedValueOnce(queues.slice(1));
    const summary = await listJobsDashboardSummary(actor, client as never);
    expect(summary.degraded?.reason).toContain(JOB_DASHBOARD_QUEUES[0]);
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
});
