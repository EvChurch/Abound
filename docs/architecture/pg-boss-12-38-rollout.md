---
title: pg-boss 12.38.2 rollout and rollback
date: 2026-11-12
source_plan: docs/plans/2026-11-12-001-pg-boss-85-repair.md
---

# Operational change

PR #87 supersedes #85 and moves pg-boss 12.15.0 to 12.38.2, including its own queue schema **30 to 46**. This is separate from Prisma migrations. Default `PgBoss.start()` runs DDL automatically. Both workers and the settings jobs telemetry loader call `start()`: the first web dashboard read can therefore initiate migration. This repair retains that existing startup behavior.

Upstream contracts: [queue APIs](https://github.com/timgit/pg-boss/blob/12.38.2/docs/api/queues.md), [versioned migrations](https://github.com/timgit/pg-boss/blob/12.38.2/src/migrationStore.ts), [release](https://github.com/timgit/pg-boss/releases/tag/12.38.2).

`getQueueStats()` now returns time-series samples. The dashboard uses `getQueues()` metadata and counts instead. These counters reflect the latest supervision pass; a newly sent/fetched job may not appear until the next pass. Queued includes ready and deferred work (and blocked flow work if later used); active is separate. A failed queue/schedule read or missing expected queue enters the existing degraded state, retains app-storage worker history, and shows placeholder zero counters with the unavailable banner. Do not interpret degraded placeholders as an idle worker.

# Rolling deployment evidence and scope

Use GitHub review/merge, passing CI on `main`, and the normal GitHub-connected Railway rolling deployment. The evidence supports overlap of 12.15.0 and 12.38.2 for this application's existing singleton queues, send/fetch/fail/retry/complete APIs, batch-size-one callback workers and keyed cron schedules. Routine rollout does not require draining queues, stopping old web/worker/CLI starters or a manual infrastructure cutover.

The current-day populated synthetic PostgreSQL overlap probe observed schema30→46 with an old instance still running: active-job completion, old send/fetch/fail/retry, old restart, old queue/stat reads, schedule read/write, new send/fetch and an actual old callback worker completing a new job all succeeded (15 recorded operations; no background errors). Some operations check successful API execution only; the probe does not establish every concurrency outcome. Earlier harness failures (an incorrect old `complete` signature and a filename error) were corrected and retained separately from the successful run. Evidence: run `20261111T221625Z-2799271`, batch `004`, `coordinator/mixed3-probe.log`, `mixed-probe-corrected.mjs` and `mixed3-commands.jsonl`.

Publisher `migrationStore` install steps31–46 retain the legacy fields and add columns with constant defaults or nulls, supporting old inserts and reads. Function/index definitions also change; additive columns alone do not prove compatibility. Index reshaping/builds use background asynchronous migrations (BAM) with concurrent PostgreSQL indexes, including the v33 rolling-deploy deadlock mitigation. Both schedulers use the shared `cron_on` claim. The 12.38.2 `timekeeper` source explicitly preserves the old occurrence singleton key for queue names without underscores; all application queue constants are hyphenated. Together with the overlap probe and application API review, this supports the bounded rollout conclusion above. It is not general mixed-version compatibility or permission to introduce flows, RRULE schedules, new queue policies or other new semantics during overlap. Concurrent cron firing across clock changes and production load was not proven by the probe.

Source references: [migrationStore](https://github.com/timgit/pg-boss/blob/12.38.2/src/migrationStore.ts), [new timekeeper](https://github.com/timgit/pg-boss/blob/12.38.2/src/timekeeper.ts), [old timekeeper](https://github.com/timgit/pg-boss/blob/12.15.0/src/timekeeper.ts), and application `lib/sync/job-constants.ts`, `lib/sync/jobs.ts`, `scripts/sync-worker.ts`, `scripts/communication-automation-worker.ts`.

# Rollout checks

These are observations and safeguards for the normal GitHub-connected rollout, not instructions to issue production SQL or change infrastructure.

1. Record installed pg-boss/schema versions, per-queue ready/queued/deferred/active/total counts and schedule names, keys, cron and timezone. Keep job payloads, donor identifiers and connection secrets out of logs. Confirm the existing backup/restore procedure and recovery point covers the pg-boss schema and application tables; this assessment has not verified production backups or restorability. A missing or unsuitable recovery point is a concrete operational risk to resolve, not evidence that backups exist.
2. Monitor normal new-instance startup for migration errors, locks, statement/lock timeouts and database capacity. Default `start()` requires schema ownership/DDL privileges. Additive DDL can still wait on locks; synthetic timings do not establish production timings. Old instances may overlap for the tested legacy subset as the platform replaces them normally.
3. Schema version46 does **not** prove migration completion: BAM rows build indexes concurrently after startup. Observe BAM status/errors and PostgreSQL index validity, including existing queue partitions, through approved operational access. Pending/running builds must finish; investigate failed/invalid builds or sustained queue lag. Keep a long-lived new worker running through the normal deployment so BAM can progress; a short-lived dashboard reader is insufficient. Index changes and the interval between drop/rebuild can affect query cost at production scale.
4. Recheck queue policy, counts, delayed jobs and all schedule names/keys/cron/timezones after supervision. Account for elapsed schedules and legitimate completed/deleted work rather than requiring unchanged totals blindly. Verify the dashboard is not degraded and agrees with pg-boss metadata. Do not add a second scheduling source to compensate for a missing schedule.
5. Verify the first expected Rock sync and derived refresh complete with normal app history, retry/error behavior and fresh progress. For communications verify existing staff review/send gates, scheduling and accepted/completed state through the normal authorized workflow; do not create unsolicited donor messages as a deployment probe. Monitor singleton behavior, duplicate runs, queue lag, failures, schedule firing and BAM completion as old instances retire normally.

# Recovery boundary

Migration failure, stuck/invalid BAM indexes, persistent lock contention, duplicate processing or missing schedules require diagnosis of the actual state. Any production data repair, manual stop/cutover, restore or schema rollback requires explicit stakeholder operational approval and a written command/query record under repository policy. This document authorizes none of those interventions and does not make them the default routine merge path. Prefer a reviewed forward fix when practical.

# Rollback and data limits

A code revert alone does not undo or downgrade pg-boss DDL. The overlap probe shows the tested old API subset can run against schema46; it does not establish a complete application rollback or recovery guarantee. If an approved recovery requires database rollback, the reviewed procedure must coordinate all queue starters and background index work. A tested pre-upgrade backup is one recovery option only if its explicit recovery point and reconciliation of work since backup are acceptable; restoring can lose new jobs, state changes and app history. No production backup presence is established here. Never blindly replay completed financial/communication work.

The daily isolated populated synthetic test used the exported `getRollbackPlans(schema, version)` from 12.38.2, executing each version from 46 down through 31 to reach 30, then restarted 12.15.0. It preserved the tested legacy hourly schedule, key and delayed payload. This is evidence for that small legacy fixture only, not a general production rollback guarantee or an instruction to execute SQL without operational review.

Down migrations drop newer flow/dependency, tracing, instance/statistics, scheduling metadata and other feature structures/columns and indexes. New feature data cannot be represented by schema30. RRULE schedules/flow state and jobs created or processed under new semantics may not survive meaningfully; archive/reconcile them before choosing a rollback path. Active concurrent builds can block/fail rollback; unfinished BAM work must not later rebuild removed indexes. Review exact exported plans and current state, keep a backup, and verify old startup, preserved counts/schedules and first work after any rollback. Do not drop/recreate the queue schema to make startup pass.

# Verification limits

Local verification uses disposable synthetic PostgreSQL only. It cannot establish production lock duration, migration privileges, backup restorability, scale, real provider TLS/SCRAM or general mixed-version/new-feature compatibility. The specific legacy overlap evidence above does not remove these production limits. The OpenTelemetry API peer installs no exporter/provider; none is configured here. Continue redacting serialized worker errors because stored errors can contain stack/custom properties. Existing unrelated dependency advisories remain separately tracked and are not resolved by this repair.
