---
title: Rock Sync Local Mirror And Test Database Boundaries
date: 2026-04-17
category: best-practices
module: rock-sync
problem_type: best_practice
component: database
severity: high
applies_when:
  - Syncing Rock RMS data into a local reporting database.
  - Mirroring Rock reference IDs that appear on synced records.
  - Testing sync transforms with deterministic fixture data.
  - Running destructive local database resets before deployment.
related_components:
  - integration
  - testing_framework
  - tooling
  - background_job
tags:
  - rock-rms
  - prisma
  - sync
  - test-database
  - fixtures
  - pg-boss
  - source-of-truth
---

# Rock Sync Local Mirror And Test Database Boundaries

## Context

The giving management app syncs church Rock RMS data into a local application database for reporting, workflow, and API use. Rock remains the source of truth, so the local schema needs to mirror Rock identifiers clearly, keep reference IDs backed by synced reference tables, and avoid mixing fake fixture rows with live read-only Rock sync data.

Session history shows the earliest project decisions already established this shape: Rock is authoritative, this app is an operational/reporting layer, direct database access to Rock should stay off the table, and payment/giving setup mutation is out of scope until the real Rock/payment boundaries are verified. (session history)

## Guidance

Use Rock IDs as primary keys for Rock-owned mirror tables.

```prisma
model RockPerson {
  rockId             Int  @id
  primaryAliasRockId Int? @unique
  givingGroupRockId  Int?

  primaryAlias    RockPersonAlias? @relation("PersonPrimaryAlias", fields: [primaryAliasRockId], references: [rockId])
  givingHousehold RockHousehold?   @relation("PersonGivingHousehold", fields: [givingGroupRockId], references: [rockId])
}
```

Keep app-owned rows on local generated IDs. `SyncRun`, `SyncIssue`, `GivingFact`, staff tasks, communication prep, and auth tables are local application records, so they should not pretend to be Rock entities.

When a Rock field is a foreign key-like reference, sync the referenced table too. Do not leave opaque Rock reference IDs without a corresponding local table where the referenced record can be resolved.

Examples from the current sync surface:

- `RockHousehold.groupTypeRockId` -> `RockGroupType.rockId`
- `RockHouseholdMember.groupRoleRockId` -> `RockGroupRole.rockId`
- `RockGroup.groupTypeRockId` -> `RockGroupType.rockId`
- `RockPerson.primaryAliasRockId` -> `RockPersonAlias.rockId`
- `RockPerson.recordStatusValueRockId` -> `RockDefinedValue.rockId`
- `RockFinancialTransaction.sourceTypeValueRockId` -> `RockDefinedValue.rockId`
- `RockFinancialTransaction.transactionTypeValueRockId` -> `RockDefinedValue.rockId`
- `RockFinancialTransaction.authorizedPersonAliasRockId` -> `RockPersonAlias.rockId`

Verify endpoint names against the real Rock instance instead of trusting guessed pluralization. In this Rock 17 instance, the working v1 read endpoints include:

- `/api/GroupTypeRoles` for group member roles
- `/api/PersonAlias` for aliases

The tempting guesses `/api/GroupRoles` and `/api/PersonAliases` returned `404`.

Keep sync tests isolated from the development database. Fixture-backed database tests should use `TEST_DATABASE_URL`, not `DATABASE_URL`, and destructive reset tooling should refuse to run unless the target database is clearly a test database.

```ts
const connectionString = process.env.TEST_DATABASE_URL;
const developmentConnectionString = process.env.DATABASE_URL;

if (connectionString === developmentConnectionString) {
  throw new Error(
    "TEST_DATABASE_URL must not point at the same database as DATABASE_URL.",
  );
}
```

Use a reset helper that creates and resets only the test database:

```bash
pnpm test:db:reset
```

That command should fail if:

- `TEST_DATABASE_URL` is unset
- `TEST_DATABASE_URL` matches `DATABASE_URL`
- the database name does not include `test`

## Why This Matters

Rock mirror tables are not normal application tables. Their identity comes from Rock, so local generated IDs add ambiguity and force every sync operation to maintain duplicate identity columns. Using `rockId` as the primary key makes sync upserts deterministic and keeps local rows directly traceable to Rock.

Backing reference IDs with synced tables turns shape assumptions into enforced integrity. It lets Prisma and Postgres catch missing reference data, and it gives reports a reliable way to join from transaction/person/group records into the taxonomy records Rock uses to describe them.

Testing with fake fixture data is still valuable because it keeps sync transforms deterministic and avoids real donor PII. But fixture rows must not be inserted into the same database used for live Rock sync. Otherwise development queries and dashboards can silently mix demo donors with real synced rows.

Endpoint discovery also needs to happen against the actual church instance. Rock model names, controller names, and pluralization are not always obvious from field names, and API v2 availability does not guarantee v2 model endpoints are usable with the current REST key.

## When to Apply

- When adding a new Rock mirror table to `prisma/schema.prisma`.
- When adding a Rock field whose name ends in `Id` and points at another Rock model.
- When adding fixture-backed integration tests that write through Prisma.
- When squashing or resetting local migrations before first deployment.
- When adding new Rock API endpoints to the read allowlist.
- When configuring a local developer or CI database.

## Examples

Before: a Rock reference ID exists locally, but the referenced table is absent.

```prisma
model RockFinancialTransaction {
  rockId                 Int  @id
  transactionTypeValueId Int?
}
```

After: the local field is named as a Rock ID and the referenced table is synced.

```prisma
model RockFinancialTransaction {
  rockId                     Int  @id
  transactionTypeValueRockId Int?

  transactionType RockDefinedValue? @relation(
    "FinancialTransactionType",
    fields: [transactionTypeValueRockId],
    references: [rockId]
  )
}
```

Before: a fixture integration test writes fake donors into the normal development database.

```ts
const connectionString = process.env.DATABASE_URL;
```

After: the fixture integration test uses the isolated test database and skips when it is not configured.

```ts
const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("fixture-backed Rock sync", () => {
  // ...
});
```

After a clean dev database reset and read-only Rock sync, verify both counts and reference integrity. A useful anti-join check should return zero missing rows for every mirrored reference:

```sql
select count(*)
from "RockPerson" p
left join "RockPersonAlias" pa
  on pa."rockId" = p."primaryAliasRockId"
where p."primaryAliasRockId" is not null
  and pa."rockId" is null;
```

## Related

- `docs/architecture/data-model.md` documents the current Rock mirror schema and ownership boundaries.
- `docs/architecture/sync-runner.md` documents the pg-boss sync runner, verification results, and test database boundary.
- `docs/research/rock-integration.md` records the verified Rock API v1 endpoint surface.
- `docs/solutions/security-issues/nextjs-auth0-prisma-auth-foundation-guardrails-2026-04-17.md` is related through Prisma migration and sensitive-data guardrails, but covers auth rather than Rock sync.
