# Giving Management Next Session Handoff

Created: 2026-04-17

## Current Stopping Point

The first application foundation pass is on branch `feat/app-auth-foundation`. The initial scaffold landed in commit `f7ca9f0`, with review hardening continuing on the same branch.

Completed:

- Next.js, TypeScript, pnpm, Tailwind, ESLint, Prettier, Vitest, Husky, Prisma, and CI scaffold.
- Initial Auth0 integration shell with local app authorization boundaries.
- Initial `AppUser` and `AccessRequest` Prisma models.
- Role vocabulary fixed to Admin, Finance, and Pastoral Care.
- Unknown Auth0 users are not authorized automatically; they see an access-needed path and can submit an access request.

The active implementation plan remains `docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md`.

In this continuation session, Unit 2 was started but not fully closed because the church-specific Rock path still requires verification.

Added:

- `docs/research/rock-integration.md`
- `docs/research/payment-and-giving-boundaries.md`
- `lib/rock/types.ts`
- `lib/rock/discovery.ts`
- `lib/rock/fixtures/sanitized-rock-sample.json`
- `scripts/rock-discovery.ts`
- `tests/unit/rock-fixtures.test.ts`
- `tests/unit/rock-discovery.test.ts`

Verification completed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

Live discovery later confirmed Rock 17, church-hosted on Azure, API v2 docs availability, and API v1 REST readability for people, groups, group members, campuses, financial accounts, financial transactions, financial transaction details, and financial scheduled transactions. API v2 model search endpoints returned `401` with the REST key even after temporary admin access, so the first viable read path is API v1 unless a later v2 auth investigation changes that.

Stakeholder-owned shape discovery also confirmed `Connect Group` (`GroupTypeId = 25`) as the member-facing small-group boundary; `Small Group Section` appears to be hierarchy/organization context.

Rock's `GroupMemberStatus` enum mapping is `0 = Inactive`, `1 = Active`, and `2 = Pending`. Active Connect Group participation should require `GroupTypeId = 25`, active/non-archived group state, non-archived membership state, and `GroupMemberStatus = 1`.

Unit 2 is complete enough to support Unit 3 data modeling. Keep the no-write Rock boundary and high-risk REST key handling in force during implementation.

Unit 3 was completed in the same continuation thread.

Added:

- `docs/architecture/data-model.md`
- `lib/sync/models.ts`
- `lib/giving/models.ts`
- `lib/tasks/models.ts`
- `prisma/migrations/20260417000000_initial_baseline/migration.sql`
- `tests/unit/data-model.test.ts`
- `tests/integration/prisma-migrations.test.ts`

Updated:

- `prisma/schema.prisma`

Because the application is not deployed yet, early migration history was squashed into a single initial baseline. The local database was reset from that baseline, Prisma Client was regenerated, and the full Rock sync was rerun successfully.

The next implementation unit is Unit 4: build the read-only Rock sync and reconciliation foundation from sanitized fixtures first, then from the verified API v1 read path.

Unit 4 was started.

Added:

- `lib/rock/client.ts`
- `lib/sync/reconcile.ts`
- `lib/sync/redaction.ts`
- `lib/sync/run-sync.ts`
- `scripts/rock-sync.ts`
- `scripts/rock-sync-person.ts`
- `scripts/sync-enqueue.ts`
- `scripts/sync-enqueue-person.ts`
- `scripts/sync-schedule.ts`
- `scripts/sync-schedule-person.ts`
- `scripts/sync-worker.ts`
- `tests/unit/rock-client.test.ts`
- `tests/unit/sync-reconciliation.test.ts`
- `tests/unit/sync-jobs.test.ts`
- `tests/integration/rock-sync.test.ts`

Updated:

- `package.json` with `rock:sync`, `rock:sync-person`, `sync:enqueue`, `sync:schedule`, debug person queue commands, and `sync:worker`

Live local verification:

- Probe command: `pnpm rock:sync-person 8597`
- Rock access method: API v1 `GET` requests only
- Result: succeeded with 55 source records read, 75 local rows written, 0 skipped records, and 0 issues.

Important implementation note: the first live pass initially skipped family members outside the narrow person slice. `RockClient.getPersonSlice` now follows family `GroupMembers` and fetches each family member person by ID, so local family/household data includes the grouped people.

The product sync path is now full Rock sync, not the person probe.

Full local verification:

- `pnpm rock:sync`
- Direct result: succeeded with 164,986 source records read, 229,872 local writes, 1 skipped record, and 1 issue.
- `pnpm sync:enqueue`
- `pnpm sync:worker -- --once`
- Worker result: succeeded with 164,986 source records read, 229,872 local writes, 1 skipped record, and 1 issue.
- `pnpm sync:schedule "0 * * * *"`

pg-boss was selected for scheduled sync because this app already depends on Postgres and sync status remains in `SyncRun`/`SyncIssue`. The default recurring queue is `rock-full-sync`; it uses singleton protection and is scheduled hourly in the local pg-boss schedule table. The legacy one-person schedule was removed locally.

The worker uses the same read-only Rock client path as the direct sync script. Keep `rock:sync-person` and person queue commands as explicit debug probes only.

Hardening completed:

- Full-sync persistence is chunked by stage instead of relying on one long Prisma transaction.
- Direct sync and pg-boss worker runs emit safe progress counts by stage.
- Rock mirror tables now use `rockId` as the primary key; local app-owned and derived tables keep local generated IDs.
- Rock reference IDs are now backed by synced reference tables: `RockGroupType`, `RockGroupRole`, `RockDefinedValue`, and `RockPersonAlias`.
- Live endpoint verification found Rock v1 exposes group roles at `/api/GroupTypeRoles` and aliases at `/api/PersonAlias`.
- After another clean database reset, `SYNC_CHUNK_SIZE=1000 pnpm rock:sync` succeeded with 180,509 source records read, 245,395 local writes, 1 skipped warning, and 1 issue.
- Anti-join verification returned zero missing references for household/group group types, household/group member roles, person primary aliases, person record statuses, transaction source/type values, scheduled transaction frequencies, and authorized person aliases.
- The recurring local pg-boss schedule was recreated with `pnpm sync:schedule "0 * * * *"`.
- Fixture-backed database tests now use `TEST_DATABASE_URL`, not `DATABASE_URL`, so fake demo records stay out of the local development database used for live Rock sync.

## Recommended Next Brainstorm

Topic: Rock RMS and payment/giving integration boundary.

Purpose: decide what must be verified before building sync, what access to request from the church's Rock instance, and what donor-facing giving behavior is explicitly out of scope until payment processor capabilities are known.

The brainstorm should produce or update a requirements document that answers:

- Which Rock data must be read first: people, households, gifts, giving setup/status, communication preferences, or another subset.
- Which Rock integration path is actually available: REST API, jobs, exports, webhooks, direct database access, or a combination.
- Whether the church can provide sanitized payloads/fixtures for people, households, gifts, funds/accounts, batches, pledges, recurring giving, and payment profiles.
- Which payment processor is used and whether recurring gift setup/management is owned by Rock, the processor, or a hosted giving provider.
- What donor-facing giving functionality is definitely deferred until verified.
- What minimum sync freshness, auditability, and reconciliation visibility staff need before dashboards are trusted.

## Recommended Next Plan

After the brainstorm, create the next plan around Unit 2 from the active plan: `Document Rock Integration Research`.

The plan should likely cover:

- `docs/research/rock-integration.md`
- `docs/research/payment-and-giving-boundaries.md`
- sanitized fixture format and validation
- first Rock client type definitions without live sync behavior
- explicit failure modes around stale data, missing records, duplicates, and unsafe logging

Do not implement sync behavior until the Rock read path and sample payload shape are verified.

## Open Questions To Bring Forward

- What Rock version and API surface is the church running?
- What authentication method should this app use to read from Rock?
- Are there rate limits, API permissions, or hosting/network constraints?
- Are giving records, recurring giving setup, payment instruments, pledges, and funds all accessible from the same source?
- Is the payment processor directly accessible, or only through Rock/hosted giving?
- How should sanitized fixtures be generated and reviewed without exposing donor PII or payment details?
