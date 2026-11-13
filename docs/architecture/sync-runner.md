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

## Known archived Connect Group memberships

Rock's current v1 GroupMembers collection omits archived rows that remain readable by ID. Normal full-sync job and CLI preparation therefore refresh up to 200 existing, not-yet-archived type-25/type-46 memberships omitted from that collection, restricted to source-confirmed supported parent groups. ID reads use the existing GET allowlist and typed validation; matching identity is required before the normalizer applies the actual archive/status values. Already-archived rows need no repeat lookup, and collection reads handle later unarchives.

Unverified reads, missing records, changed identities and cap violations create ERROR SyncIssues and a PARTIAL run; unresolved local rows are preserved. This preparation does not delete records, infer archive state from absence, reconcile missing parent groups or run globally from person-slice sync. Raw mirror row counts can exceed collection counts because verified archived history is retained. See `docs/plans/2026-10-31-001-refresh-archived-connect-memberships.md` and `docs/research/2026-10-31-archived-membership-diagnosis.md` for source evidence and release verification.

## Persisted run scope for household freshness

Full Rock syncs (job and CLI via `syncRockSlice`) persist `source = rock:v1:full`. Person slices (via `syncRockPersonSlice`) persist `source = rock:v1:person`. `rock:v1` remains the common SyncIssue provenance; existing ambiguous run rows are preserved without backfill. Consumers that need a complete-population baseline must select the explicit full source, not infer scope from a successful run or record count. The household report withholds rates until the first successful explicitly scoped full sync after rollout. Person runs still update latest-sync/snapshot metadata but cannot advance that full-population baseline.

Rollback requires reverting both writer and reader contracts together; report rates must remain unavailable if no reliable full baseline is recognised. No manual production data relabelling is part of release.

The latest explicitly scoped full attempt must itself be SUCCEEDED. A subsequent successful person slice cannot hide a FAILED/PARTIAL full attempt or restore rates; a new successful full run is required. Snapshot fingerprints include the full attempt’s status. Incomplete full attempts do not become a baseline for stale-membership flags.

Household-report completeness also checks for incomplete Rock runs newer than the baseline (including runs completed after the full baseline began). A successful person retry or unrelated person run cannot prove global reconciliation; a new successful full run is required to reset earlier failures.

## Deceased-inclusive full-source collections

The full Rock reader requests `/api/People?includeDeceased=true&$orderby=Id asc` and `/api/GroupMembers?IncludeDeceased=true&$select=Id,Guid,GroupId,PersonId,GroupTypeId,GroupRoleId,GroupMemberStatus,IsArchived,ModifiedDateTime&$orderby=Id asc`. These query options were verified against this church's actual v1 instance: a known person/membership omitted by default is returned with the same identity when enabled. Default collection omission otherwise leaves previously active local people stale after Rock marks them deceased. Persist actual inactive/deceased fields through the normal typed normalization and upsert path, preserving historical giving and membership archive state.

This is not deletion reconciliation. A 404 or absent person/member remains unresolved without verified identity/disposition; household freshness guards continue withholding affected rates. Existing type-25/46 archive refresh is still required. Deceased-inclusive reads may expose more historical records and missing-reference warnings, so monitor counts, paging and complete job outcomes after a GitHub-managed rollout. Rollback of the query options must not rewrite source-confirmed inactive/deceased rows as active. Diagnostic evidence and rollout checks: `docs/plans/2026-11-02-001-deceased-person-sync-contract.md` and `docs/research/2026-11-02-household-membership-review-investigation.md`.

The full membership request projects only the verified identity/type/role/state/freshness fields consumed by normalization. During the PR #67 verification fetch, one unprojected deceased-inclusive page returned reproducible HTTP 500; the same page with all nine selected fields succeeded. A bounded GET-only walk read all 37,945 visible membership rows across 38 pages using that projection, including membership 20270. The unused field responsible for the full response failure was not isolated, so this is a verified query-contract mitigation rather than a claim about a specific Rock field defect. Keep GroupTypeId in the projection to preserve mismatch detection. Never bypass a failed page or classify its missing rows as deleted.

## Source-confirmed family membership cessation

Normal full job and CLI preparation scan bounded current family-membership metadata and check at most 200 missing eligible-adult associations or marked IDs that reappear. Initial removal discovery is limited to active/non-deceased/unmerged local adults in active, unarchived type-10 families; supported parents must also be present and active in the fetched source slice. This avoids silently broadening the initial membership-79767 correction into cleanup of historical children or inactive identities.

A typed direct GET must return 404, and complete metadata-only History reads must show matching exact Person/GroupMember removal events for the original family, with conservative chronology and later-activity checks. A new member ID for the same pair is independently verified and preserved. Read failures, missing/capped/contradictory evidence and concurrent identity/revision changes leave the state unchanged with ERROR/PARTIAL, rather than certifying removal from absence.

The retained row gets local `sourceRemovalVerifiedAt` and a minimal `sourceRemovalEvidence` JSON object, atomically with an append-only SyncIssue proof. Rock archive, membership status, person identity, primary-family and giving fields are not fabricated. The same presence predicate excludes confirmed ended associations from current reporting, member counts/contacts, household email/Connect Group criteria, people adult/child criteria and profile membership lists; historical source rows and financial attribution remain.

Marked IDs restore only after a fresh direct same-identity read through full preparation and an atomic revision-bound current write. A person slice cannot clear the marker without this proof. Reappearance is audited; a subsequent disappearance cannot replay the prior removal event. Migration SQL owns a partial unique current person/family index while allowing historical removed IDs to coexist with a new current ID. Rollback must retain that presence-aware reader/index contract once historical duplicates exist; do not delete history to recreate unconditional uniqueness. See `docs/plans/2026-11-02-002-confirmed-family-membership-removals.md` for release verification and authority boundaries.
