---
title: Data Model Baseline
date: 2026-04-17
source_plan: docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
---

# Data Model Baseline

## Ownership Boundary

Rock RMS remains authoritative for people, aliases, defined values, group types, group roles, households, campuses, groups, group membership, financial accounts, financial transactions, financial transaction details, scheduled transactions, and scheduled transaction details.

This app stores read-only synced copies for reporting, workflow, reconciliation, and API use. Local tables must not be treated as the source of truth for Rock-owned data.

Locally owned records are limited to:

- `SyncRun`
- `SyncIssue`
- `GivingFact`
- `StaffTask`
- `CommunicationPrep`
- app auth tables from the auth foundation

## Sync Traceability

Every synced Rock table has:

- `rockId` as its primary key
- optional `rockGuid`
- `sourceUpdatedAt`
- `firstSyncedAt`
- `lastSyncedAt`
- `lastSyncRunId`

`rockId` is the primary key on each synced Rock mirror table so duplicate upstream IDs reconcile into one local row instead of creating ambiguous records. Locally owned tables such as `SyncRun`, `SyncIssue`, `GivingFact`, `StaffTask`, `CommunicationPrep`, and app auth tables keep local generated IDs because they are not Rock source records.

Because the app is not deployed yet, the early migration history was squashed into `prisma/migrations/20260417000000_initial_baseline/migration.sql`. The local development database was reset from that baseline after the Rock mirror tables were changed to use `rockId` as their primary key.

## First Reporting Model

The first giving reporting baseline supports:

- Rock reference tables through `RockGroupType`, `RockGroupRole`, `RockDefinedValue`, and `RockPersonAlias`
- one-off gifts through `RockFinancialTransaction` and `RockFinancialTransactionDetail`
- scheduled recurring gifts through `RockFinancialScheduledTransaction` and `RockFinancialScheduledTransactionDetail`
- derived reporting rows through `GivingFact`
- family/household giving rollups through `RockHousehold`, `RockHouseholdMember`, `RockPerson.givingGroupRockId`, and `RockPerson.givingId`
- campus segmentation through `People.PrimaryCampusId`, `Groups.CampusId`, and `FinancialAccounts.CampusId`
- Connect Group participation through `RockGroupMember.activeConnectGroup`

## Family And Giving Groups

Rock families are special Rock groups. In this app they are stored as `RockHousehold` rows because "household" is the product language, but the source record is still a Rock group.

Family model rules:

- `RockHousehold.rockId` is the Rock `Group.Id`.
- `RockHousehold.groupTypeRockId` defaults to `10`, Rock's `Family` group type.
- `RockHousehold.groupTypeRockId` references `RockGroupType.rockId`.
- Family members come from `GroupMembers` and are stored in `RockHouseholdMember`.
- `RockHouseholdMember.groupRoleRockId` references `RockGroupRole.rockId` when Rock supplies a role.
- `RockPerson.primaryFamilyRockId` preserves `People.PrimaryFamilyId`.
- `RockPerson.primaryAliasRockId` references `RockPersonAlias.rockId`.
- `RockPerson.givingGroupRockId` preserves `People.GivingGroupId`.
- `RockPerson.givingId` preserves `People.GivingId`.
- `RockPerson.givingLeaderRockId` preserves the person-level giving leader when available.

Giving rollups should prefer `GivingGroupId` when Rock supplies it, falling back to `PrimaryFamilyId` only when there is no separate giving group. This keeps reporting aligned with Rock's donor/giving grouping instead of assuming every family membership is the same as the giving unit.

Active Connect Group participation means:

- `RockGroup.groupTypeRockId = 25`
- group is active
- group is not archived
- membership is not archived
- `GroupMemberStatus = 1`

Rock defines `GroupMemberStatus` as `0 = Inactive`, `1 = Active`, and `2 = Pending`.

## Sensitive Data

Do not store payment instruments or processor secrets in this schema.

Explicitly forbidden:

- full card numbers
- bank account or routing numbers
- payment tokens
- gateway customer identifiers
- REST keys, cookies, bearer tokens, and authorization headers

Financial transaction and scheduled transaction records may store source IDs, status fields, dates, account IDs, and amounts needed for staff reporting. They must not store payment method details.

## API Version Boundary

The first sync path should use the verified Rock API v1 read endpoints. API v2 docs are available but v2 model search returned `401` during discovery.

All Rock integration code for this phase must use `GET` requests only.

## Sync Foundation

The first sync foundation supports two inputs:

- sanitized fixtures through `syncFixtureBundle`
- the verified Rock API v1 read surface through `rock:sync`

The live full sync uses API v1 `GET` requests only. It pages:

- group types
- group type roles, stored locally as group roles
- defined values
- person aliases
- people
- groups, including Rock Family groups
- group members, including family and Connect Group memberships
- campuses
- financial accounts
- financial transactions
- transaction details
- scheduled transactions
- scheduled transaction details

The older `rock:sync-person <rock-person-id>` command remains a narrow debug probe for stakeholder-approved records. It is not the scheduled production sync path.
