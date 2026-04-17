---
title: Sync Runner Direction
date: 2026-04-17
source_plan: docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
---

# Sync Runner Direction

## Decision

Use pg-boss to manage scheduled sync jobs.

The sync foundation still records explicit `SyncRun` and `SyncIssue` rows. pg-boss manages when a sync job should run; the application database records what happened and what needs review.

## Recommendation

pg-boss is the selected first runner for scheduled sync.

Why:

- The app already depends on Postgres and Prisma.
- Rock sync is database-centered and audit-heavy.
- pg-boss avoids adding Redis infrastructure.
- Sync jobs need idempotent paging, retries, and status visibility more than multi-day human-in-the-loop orchestration.

## Alternatives

- Workflow.dev: promising for durable TypeScript workflows, especially long-running/stateful flows, but this sync does not need durable workflow semantics yet.
- BullMQ: mature and strong for high-throughput job queues, but it adds Redis operational overhead.
- pg-boss: selected because it keeps job state near the sync state in Postgres.

## Commands

```bash
pnpm sync:enqueue
pnpm sync:schedule "0 * * * *"
pnpm sync:worker
pnpm sync:worker -- --once
```

The scheduled job is `rock-full-sync`. It pages the verified Rock API v1 read surface and persists the local reporting copy. The one-person commands remain available only as debug probes.

## Local Verification

Verified on 2026-04-17 against the church Rock instance with API v1 `GET` requests only:

- Ran direct full sync with `pnpm rock:sync`.
- Direct result: succeeded with 164,986 source records read, 229,872 local writes, 1 skipped record, and 1 issue.
- Enqueued `rock-full-sync` with `pnpm sync:enqueue`.
- Processed one job with `pnpm sync:worker -- --once`.
- Worker result: succeeded with 164,986 source records read, 229,872 local writes, 1 skipped record, and 1 issue.
- Scheduled the recurring local job with `pnpm sync:schedule "0 * * * *"`.
- Confirmed the local pg-boss schedule table contains `rock-full-sync` only for the recurring sync.
- After squashing migrations and resetting the local database, reran `SYNC_CHUNK_SIZE=1000 pnpm rock:sync`; the clean database full sync also succeeded with the same record counts.
- After adding Rock reference tables for group types, group roles, defined values, and person aliases, reset the local database again and reran `SYNC_CHUNK_SIZE=1000 pnpm rock:sync`.
- Expanded direct result: succeeded with 180,509 source records read, 245,395 local writes, 1 skipped record, and 1 warning issue.
- Verified the live Rock v1 endpoint names for the expanded reference surface: `/api/GroupTypeRoles` and `/api/PersonAlias`.
- Verified anti-join checks for household/group group types, member roles, person primary aliases, person record statuses, transaction source/type values, scheduled frequencies, and authorized person aliases all returned zero missing references.

## Guardrails

- Rock calls remain read-only `GET` requests.
- Sync steps must be idempotent by Rock ID.
- Every job creates or updates a `SyncRun`.
- Failures record redacted `SyncIssue` rows.
- No raw Rock payloads or REST keys are stored in job data.

## Persistence Behavior

- Full-sync persistence is chunked by stage so the sync does not rely on one long Prisma transaction.
- `SYNC_CHUNK_SIZE` controls write chunk size. The default is `250`; local verification used `1000`.
- Direct sync and pg-boss worker runs emit progress counts by stage without printing raw Rock payload data.

## Test Database Boundary

- Sanitized fixture sync tests use `TEST_DATABASE_URL`, not `DATABASE_URL`.
- If `TEST_DATABASE_URL` is unset, database-backed fixture sync tests are skipped.
- `TEST_DATABASE_URL` must not match `DATABASE_URL`.
- `pnpm test:db:reset` resets only the test database and refuses to run unless the target database name includes `test`.
- Keep fixture/demo records out of the local development database used for live read-only Rock sync.
