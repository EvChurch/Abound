---
title: pg-boss 12.38.2 rollout and rollback
date: 2026-11-12
source_plan: docs/plans/2026-11-12-001-pg-boss-85-repair.md
---

# Operational change

PR #85 moves pg-boss 12.15.0 to 12.38.2, including its own queue schema **30 to 46**. This is separate from Prisma migrations. Default `PgBoss.start()` runs DDL automatically. Both workers and the settings jobs telemetry loader call `start()`: the first web dashboard read can therefore initiate migration. This repair retains that existing startup behavior.

Upstream contracts: [queue APIs](https://github.com/timgit/pg-boss/blob/12.38.2/docs/api/queues.md), [versioned migrations](https://github.com/timgit/pg-boss/blob/12.38.2/src/migrationStore.ts), [release](https://github.com/timgit/pg-boss/releases/tag/12.38.2).

`getQueueStats()` now returns time-series samples. The dashboard uses `getQueues()` metadata and counts instead. These counters reflect the latest supervision pass; a newly sent/fetched job may not appear until the next pass. Queued includes ready and deferred work (and blocked flow work if later used); active is separate. A failed queue/schedule read or missing expected queue enters the existing degraded state, retains app-storage worker history, and shows placeholder zero counters with the unavailable banner. Do not interpret degraded placeholders as an idle worker.

# Rollout checks

Use the GitHub-reviewed merged source and normal GitHub-connected deployment. Do not deploy a local archive or run production repair SQL as part of this dependency change.

1. Before first new start, record installed pg-boss/schema versions, per-queue ready/queued/deferred/active/total counts and schedule names, keys, cron and timezone. Keep job payloads, donor identifiers and connection secrets out of logs. Take a restorable database backup including the pg-boss schema and application tables; confirm restore procedure and recovery point.
2. Drain or stop old workers, enqueue/schedule CLI processes and web instances that can initialize pg-boss before changing the schema. Avoid overlapping old/new instances against the migrating database. Synthetic testing did not certify mixed-version processing, job fencing, scheduler behavior or recovery. Prevent old instances from restarting during the cutover.
3. Start one new instance with verified schema ownership/DDL privileges. Monitor migration errors, locks, statement/lock timeouts and database capacity. Schema version advancement to 46 does **not** prove migration completion: background asynchronous migration (BAM) rows build indexes concurrently after startup. Inspect BAM status/errors and PostgreSQL index validity, including existing queue partitions; wait for pending/running builds to complete. Investigate failed or invalid index builds before increasing workers. A short-lived dashboard reader is not sufficient to keep background work running.
4. Recheck queue policy, counts, delayed jobs and all schedule names/keys/cron/timezones after a supervision pass. Account for elapsed schedules and legitimate completed/deleted work rather than requiring unchanged totals blindly. Verify the dashboard is not degraded and agrees with pg-boss metadata. Do not enable a second scheduling source to compensate for a missing schedule.
5. Verify the first expected Rock sync and derived refresh complete with normal app history, retry/error behavior and fresh progress. For communications verify existing staff review/send gates, scheduling and accepted/completed state through the normal authorized workflow; do not create unsolicited donor messages for a deployment probe. Check singleton behavior and absence of duplicate runs. Resume remaining instances on the same version and monitor queue lag, failures, schedule firing and BAM completion.

# Rollback and data limits

A code revert alone does not undo pg-boss DDL. Stop all new/old queue starters and background index work before database rollback. Prefer restoring a tested pre-upgrade backup with an explicit recovery point and reconciliation of work processed since backup; restoring can lose new jobs, state changes and app history. Never blindly replay completed financial/communication work.

The daily isolated populated synthetic test used the exported `getRollbackPlans(schema, version)` from 12.38.2, executing each version from 46 down through 31 to reach 30, then restarted 12.15.0. It preserved the tested legacy hourly schedule, key and delayed payload. This is evidence for that small legacy fixture only, not a general production rollback guarantee or an instruction to execute SQL without operational review.

Down migrations drop newer flow/dependency, tracing, instance/statistics, scheduling metadata and other feature structures/columns and indexes. New feature data cannot be represented by schema30. RRULE schedules/flow state and jobs created or processed under new semantics may not survive meaningfully; archive/reconcile them before choosing a rollback path. Active concurrent builds can block/fail rollback; unfinished BAM work must not later rebuild removed indexes. Review exact exported plans and current state, keep a backup, and verify old startup, preserved counts/schedules and first work after any rollback. Do not drop/recreate the queue schema to make startup pass.

# Verification limits

Local verification uses disposable synthetic PostgreSQL only. It cannot establish production lock duration, migration privileges, backup restorability, scale, real provider TLS/SCRAM or mixed-version compatibility. The OpenTelemetry API peer installs no exporter/provider; none is configured here. Continue redacting serialized worker errors because stored errors can contain stack/custom properties. Existing unrelated dependency advisories remain separately tracked and are not resolved by this repair.
