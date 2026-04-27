"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import type {
  JobsDashboardSummary,
  WorkerEventSummary,
} from "@/lib/settings/jobs";
import {
  GIVING_DERIVED_REFRESH_QUEUE,
  ROCK_FULL_SYNC_QUEUE,
  ROCK_PERSON_SYNC_QUEUE,
  type JobsDashboardQueueName,
} from "@/lib/sync/job-constants";

type JobsDashboardProps = {
  enqueueFundRefresh: () => Promise<void>;
  enqueueRockFullSync: () => Promise<void>;
  enqueueRockPersonSync: (formData: FormData) => Promise<void>;
  runJobActionById: (formData: FormData) => Promise<void>;
  scheduleRockFullSync: (formData: FormData) => Promise<void>;
  scheduleRockPersonSync: (formData: FormData) => Promise<void>;
  summary: JobsDashboardSummary;
  unscheduleRockFullSync: (formData: FormData) => Promise<void>;
  unscheduleRockPersonSync: (formData: FormData) => Promise<void>;
};

const QUEUE_OPTIONS: Array<{ label: string; value: JobsDashboardQueueName }> = [
  { label: "Rock full sync", value: ROCK_FULL_SYNC_QUEUE },
  { label: "Rock person sync", value: ROCK_PERSON_SYNC_QUEUE },
  { label: "Derived refresh", value: GIVING_DERIVED_REFRESH_QUEUE },
];

const JOB_ACTION_QUEUE_OPTIONS = [
  { label: "Rock full sync", value: ROCK_FULL_SYNC_QUEUE },
  { label: "Rock person sync", value: ROCK_PERSON_SYNC_QUEUE },
  { label: "Derived refresh", value: GIVING_DERIVED_REFRESH_QUEUE },
] as const;

export function JobsDashboard({
  enqueueFundRefresh,
  enqueueRockFullSync,
  enqueueRockPersonSync,
  runJobActionById,
  scheduleRockFullSync,
  scheduleRockPersonSync,
  summary,
  unscheduleRockFullSync,
  unscheduleRockPersonSync,
}: JobsDashboardProps) {
  const [liveEvents, setLiveEvents] = useState(
    summary.recentEvents.slice(0, 60),
  );

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const stream = new EventSource(
      `/api/settings/jobs/logs?since=${encodeURIComponent(since)}`,
    );

    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WorkerEventSummary[];

        if (!Array.isArray(payload) || payload.length === 0) {
          return;
        }

        setLiveEvents((current) => {
          const seen = new Set(current.map((item) => item.id));
          const parsed = payload
            .filter((item) => !seen.has(item.id))
            .map((item) => ({
              ...item,
              createdAt: new Date(item.createdAt),
            }));

          return [...parsed, ...current].slice(0, 120);
        });
      } catch {
        // Keep the dashboard resilient if the stream payload is malformed.
      }
    };

    return () => stream.close();
  }, []);

  const statusTone = summary.degraded ? "degraded" : "healthy";

  const sortedEvents = useMemo(
    () =>
      liveEvents
        .slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        ),
    [liveEvents],
  );

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase text-app-accent-strong">
          Settings
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-2">
            <h1 className="text-[32px] font-semibold leading-[1.12] tracking-normal text-app-foreground sm:text-[42px]">
              Jobs
            </h1>
            <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
              Operational dashboard for pg-boss queue health, worker controls,
              and live worker logs.
            </p>
          </div>
          <span className={statusChipClassName(statusTone)}>
            {statusTone === "healthy" ? "Healthy" : "Degraded"}
          </span>
        </div>
        <p className="text-[12px] text-app-muted">
          Last fetched {formatDateTime(summary.fetchedAt)}
        </p>
      </header>

      {summary.degraded ? (
        <Callout>
          {summary.degraded.message}
          <br />
          <span className="font-mono text-[11px]">
            {summary.degraded.reason}
          </span>
        </Callout>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.queues.map((queue) => (
          <article
            className="rounded-[8px] border border-app-border bg-app-surface p-4"
            key={queue.name}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-app-foreground">
                {queueLabel(queue.name as JobsDashboardQueueName)}
              </h2>
              <span className="rounded border border-app-border px-2 py-0.5 text-[10px] font-semibold uppercase text-app-muted">
                {queue.policy}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <Stat label="Queued" value={queue.queuedCount} />
              <Stat label="Active" value={queue.activeCount} />
              <Stat label="Deferred" value={queue.deferredCount} />
              <Stat label="Total" value={queue.totalCount} />
            </dl>
            <p className="mt-3 text-[11px] text-app-muted">
              {queue.hasSchedule ? "Scheduled" : "Not scheduled"}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Panel title="Running now">
          {summary.runningJobs.length > 0 ? (
            <div className="grid gap-2">
              {summary.runningJobs.map((job) => (
                <div
                  className="rounded-[6px] border border-app-border px-3 py-2 text-[12px]"
                  key={`${job.jobId}-${new Date(job.lastUpdatedAt).toISOString()}`}
                >
                  <p className="font-semibold text-app-foreground">
                    {job.jobId}
                  </p>
                  <p className="text-app-muted">
                    {queueLabelFromString(job.queue)}
                  </p>
                  <p className="mt-1 text-app-muted">{job.lastMessage}</p>
                  <p className="mt-1 font-mono text-[11px] text-app-muted">
                    {formatDateTime(new Date(job.lastUpdatedAt))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No active jobs detected from recent worker events." />
          )}
        </Panel>

        <Panel title="Schedules">
          {summary.schedules.length > 0 ? (
            <div className="grid gap-2">
              {summary.schedules.map((schedule) => (
                <div
                  className="rounded-[6px] border border-app-border px-3 py-2 text-[12px]"
                  key={`${schedule.name}-${schedule.key}`}
                >
                  <p className="font-semibold text-app-foreground">
                    {queueLabel(schedule.name as JobsDashboardQueueName)}
                  </p>
                  <p className="font-mono text-[11px] text-app-muted">
                    {schedule.key}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-app-muted">
                    {schedule.cron} ({schedule.timezone})
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No schedules configured." />
          )}
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Panel title="Worker control plane">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <h3 className="text-[12px] font-semibold uppercase text-app-muted">
                Enqueue jobs
              </h3>
              <div className="flex flex-wrap gap-2">
                <form action={enqueueRockFullSync}>
                  <button className={buttonClassName("primary")}>
                    Run full sync
                  </button>
                </form>
                <form action={enqueueFundRefresh}>
                  <button className={buttonClassName("secondary")}>
                    Run fund refresh
                  </button>
                </form>
              </div>
              <form
                action={enqueueRockPersonSync}
                className="flex flex-wrap gap-2"
              >
                <input
                  className={inputClassName}
                  min={1}
                  name="personId"
                  placeholder="Person Rock ID"
                  required
                  type="number"
                />
                <button className={buttonClassName("secondary")}>
                  Run person sync
                </button>
              </form>
            </div>

            <div className="grid gap-2">
              <h3 className="text-[12px] font-semibold uppercase text-app-muted">
                Schedule management
              </h3>
              <form
                action={scheduleRockFullSync}
                className="grid gap-2 rounded-[6px] border border-app-border p-3"
              >
                <p className="text-[12px] font-semibold text-app-foreground">
                  Full sync schedule
                </p>
                <input
                  className={inputClassName}
                  defaultValue="0 * * * *"
                  name="cron"
                  placeholder="Cron expression"
                  required
                  type="text"
                />
                <input
                  className={inputClassName}
                  name="scheduleKey"
                  placeholder="Schedule key (optional)"
                  type="text"
                />
                <div className="flex gap-2">
                  <button className={buttonClassName("secondary")}>
                    Save schedule
                  </button>
                </div>
              </form>

              <form
                action={unscheduleRockFullSync}
                className="flex flex-wrap gap-2 rounded-[6px] border border-app-border p-3"
              >
                <input
                  className={inputClassName}
                  name="scheduleKey"
                  placeholder="Full sync key (optional)"
                  type="text"
                />
                <button className={buttonClassName("danger")}>
                  Unschedule full sync
                </button>
              </form>

              <form
                action={scheduleRockPersonSync}
                className="grid gap-2 rounded-[6px] border border-app-border p-3"
              >
                <p className="text-[12px] font-semibold text-app-foreground">
                  Person sync schedule
                </p>
                <input
                  className={inputClassName}
                  min={1}
                  name="personId"
                  placeholder="Person Rock ID"
                  required
                  type="number"
                />
                <input
                  className={inputClassName}
                  defaultValue="0 */6 * * *"
                  name="cron"
                  placeholder="Cron expression"
                  required
                  type="text"
                />
                <input
                  className={inputClassName}
                  name="scheduleKey"
                  placeholder="Schedule key (optional)"
                  type="text"
                />
                <button className={buttonClassName("secondary")}>
                  Save person schedule
                </button>
              </form>

              <form
                action={unscheduleRockPersonSync}
                className="flex flex-wrap gap-2 rounded-[6px] border border-app-border p-3"
              >
                <input
                  className={inputClassName}
                  name="scheduleKey"
                  placeholder="Person schedule key (optional)"
                  type="text"
                />
                <button className={buttonClassName("danger")}>
                  Unschedule person sync
                </button>
              </form>
            </div>

            <div className="grid gap-2">
              <h3 className="text-[12px] font-semibold uppercase text-app-muted">
                Job actions by ID
              </h3>
              <form
                action={runJobActionById}
                className="grid gap-2 rounded-[6px] border border-app-border p-3"
              >
                <select
                  className={inputClassName}
                  defaultValue={ROCK_FULL_SYNC_QUEUE}
                  name="queue"
                  required
                >
                  {JOB_ACTION_QUEUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClassName}
                  name="jobId"
                  placeholder="Job ID"
                  required
                  type="text"
                />
                <select
                  className={inputClassName}
                  defaultValue="retry"
                  name="action"
                  required
                >
                  <option value="retry">Retry</option>
                  <option value="cancel">Cancel</option>
                  <option value="delete">Delete</option>
                </select>
                <button className={buttonClassName("secondary")}>
                  Execute action
                </button>
              </form>
            </div>
          </div>
        </Panel>

        <Panel title="Live worker logs">
          {sortedEvents.length > 0 ? (
            <div className="max-h-[540px] overflow-auto rounded-[6px] border border-app-border bg-app-background/80">
              <ul className="divide-y divide-app-border-faint">
                {sortedEvents.map((event) => (
                  <li className="px-3 py-2" key={event.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={eventLevelClassName(event.level)}>
                        {event.level}
                      </span>
                      <span className="font-mono text-[11px] text-app-muted">
                        {formatDateTime(new Date(event.createdAt))}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] font-semibold text-app-foreground">
                      {event.message}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-app-muted">
                      {queueLabelFromString(event.queue)}
                      {event.jobId ? ` · ${event.jobId}` : ""}
                      {event.eventType ? ` · ${event.eventType}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState message="No worker logs yet. Start a job to stream events." />
          )}
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Panel title="Recent sync outcomes">
          {summary.syncRuns.length > 0 ? (
            <div className="grid gap-2">
              {summary.syncRuns.map((run) => (
                <div
                  className="rounded-[6px] border border-app-border px-3 py-2 text-[12px]"
                  key={run.id}
                >
                  <p className="font-semibold text-app-foreground">
                    {run.status} · {run.source}
                  </p>
                  <p className="mt-1 text-app-muted">
                    Read {formatNumber(run.recordsRead)} · Written{" "}
                    {formatNumber(run.recordsWritten)} · Skipped{" "}
                    {formatNumber(run.recordsSkipped)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-app-muted">
                    {formatDateTime(run.startedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No sync runs yet." />
          )}
        </Panel>

        <Panel title="Recent derived refreshes">
          {summary.derivedRefreshes.length > 0 ? (
            <div className="grid gap-2">
              {summary.derivedRefreshes.map((refresh) => (
                <div
                  className="rounded-[6px] border border-app-border px-3 py-2 text-[12px]"
                  key={refresh.id}
                >
                  <p className="font-semibold text-app-foreground">
                    {refresh.status} · {refresh.kind}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-app-muted">
                    requested {formatDateTime(refresh.requestedAt)}
                  </p>
                  {refresh.errorMessage ? (
                    <p className="mt-1 text-rose-800">{refresh.errorMessage}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No derived refresh jobs yet." />
          )}
        </Panel>
      </section>
    </section>
  );
}

export const ACTION_RESULT_LABEL: Record<string, string> = {
  "full-sync-enqueued": "Full sync queued.",
  "full-sync-scheduled": "Full sync schedule saved.",
  "full-sync-unscheduled": "Full sync unscheduled.",
  "fund-refresh-enqueued": "Fund refresh queued.",
  "job-cancel": "Job cancelled.",
  "job-delete": "Job deleted.",
  "job-retry": "Job retried.",
  "person-sync-enqueued": "Person sync queued.",
  "person-sync-scheduled": "Person sync schedule saved.",
  "person-sync-unscheduled": "Person sync unscheduled.",
};

function queueLabel(queue: JobsDashboardQueueName) {
  return QUEUE_OPTIONS.find((option) => option.value === queue)?.label ?? queue;
}

function queueLabelFromString(queue: string | null) {
  if (!queue) {
    return "Unknown queue";
  }

  const match = QUEUE_OPTIONS.find((option) => option.value === queue);
  return match?.label ?? queue;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function statusChipClassName(tone: "healthy" | "degraded") {
  if (tone === "healthy") {
    return "inline-flex min-h-8 items-center rounded-[6px] border border-emerald-300 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-900";
  }

  return "inline-flex min-h-8 items-center rounded-[6px] border border-amber-300 bg-amber-50 px-3 text-[12px] font-semibold text-amber-900";
}

function eventLevelClassName(level: "INFO" | "WARNING" | "ERROR") {
  if (level === "ERROR") {
    return "inline-flex min-h-6 items-center rounded border border-rose-300 bg-rose-50 px-2 text-[10px] font-semibold text-rose-900";
  }

  if (level === "WARNING") {
    return "inline-flex min-h-6 items-center rounded border border-amber-300 bg-amber-50 px-2 text-[10px] font-semibold text-amber-900";
  }

  return "inline-flex min-h-6 items-center rounded border border-app-border px-2 text-[10px] font-semibold text-app-muted";
}

function buttonClassName(tone: "primary" | "secondary" | "danger") {
  if (tone === "primary") {
    return "inline-flex min-h-9 items-center justify-center rounded-[6px] bg-app-accent px-3 text-[12.5px] font-semibold text-white hover:opacity-95";
  }

  if (tone === "danger") {
    return "inline-flex min-h-9 items-center justify-center rounded-[6px] border border-rose-300 bg-rose-50 px-3 text-[12.5px] font-semibold text-rose-900 hover:bg-rose-100";
  }

  return "inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12.5px] font-semibold text-app-foreground hover:bg-app-soft";
}

const inputClassName =
  "min-h-9 rounded-[6px] border border-app-border bg-app-surface px-2.5 text-[12.5px] text-app-foreground outline-none focus:border-app-accent";

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900">
      {children}
    </div>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[8px] border border-app-border bg-app-surface p-4">
      <h2 className="text-[14px] font-semibold text-app-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[6px] border border-dashed border-app-border px-3 py-4 text-[12px] text-app-muted">
      {message}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[6px] border border-app-border-faint px-2 py-1.5">
      <dt className="text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </dt>
      <dd className="text-[14px] font-semibold text-app-foreground">
        {formatNumber(value)}
      </dd>
    </div>
  );
}
