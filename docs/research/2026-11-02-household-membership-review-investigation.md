---
title: Household membership review case investigation
date: 2026-11-02
status: one-source-contract-defect-confirmed-one-identity-case-unresolved
roadmap: RM-007
---

# Household membership review case investigation

Tataihono requested investigation of the two review cases after PR #63 deployed. All production database queries used READ ONLY transactions followed by ROLLBACK; Rock calls were GET-only. No person debug sync, repair SQL, source write, removal, email or deployment was performed. Identifiers below identify the restricted staff-review membership records; donor names, contact details and financial details are omitted.

## Reproducible symptom

A read-only query selects the latest successful `rock:v1:full` run. It joins household members to current local people and households, applies the report eligibility conditions (active/unarchived family, campuses 2/3/4; role 3, status 1, unarchived member; person status 3, non-deceased, unmerged), and counts memberships whose `lastSyncRunId` differs and `lastSyncedAt` precedes that full run's start. The diagnostic `/tmp/abound-rowan-discovery/membership-review-repro.mjs` returned `{eligibleAdultMembershipsUnverifiedInLatestFull:2,pass:false}` with exit 2 through the deployed service's Railway SSH environment. This is a reproducible failure signal, not evidence that those records should be deleted.

Ranked hypotheses tested: omitted/archived parent group; changed or missing membership/person; different visibility between individual and collection endpoints. Both parent groups remain readable type-10 active/unarchived families and appear in filtered Groups collection reads, ruling out an archived/missing parent as the explanation for these cases.

## Case A: membership 20270 — deceased-person collection omission

The direct membership GET returns 200, same membership/group/person identity, active membership status 1, Adult role 3 and `IsArchived=false`. Default collection queries by membership ID, family and person omit this membership.

The direct person GET returns the same person identity, but `RecordStatusValueId=4` (Inactive) and `IsDeceased=true`. Abound's retained person row still has active status 3 and `deceased=false`, last refreshed 31 July. The membership was last refreshed 31 July too. The source primary family still agrees with the membership family; no source alias redirect was found (two aliases still resolve to this person).

Controlled query difference: `/api/People?includeDeceased=true&$filter=Id eq <person>&$select=Id,IsDeceased,RecordStatusValueId&$top=10` returns one inactive/deceased person; the identical query without `includeDeceased` returns zero. `/api/GroupMembers?IncludeDeceased=true&$filter=Id eq 20270&$select=Id,PersonId,GroupId&$top=10` returns the membership; the default query returns zero. The person GUID lookup with `includeDeceased=true` also returns the same identity.

This confirms a sync source-contract defect: `RockClient.getFullSyncSlice` currently reads default People and GroupMembers collections. The normal upsert path cannot refresh a person who disappears from those collections after being marked deceased. The report's provisional-data guard correctly catches the stale household member, but repeated unchanged full syncs cannot resolve it.

The proposed normal-sync correction is to use the verified deceased-inclusive query options on both existing collection endpoints. Preserve the source's actual inactive/deceased values; existing eligibility rules will exclude that person. This requires a GitHub-reviewed change and normal sync, not manual row editing. Do not mark the still-active membership archived merely to remove a warning.

## Case B: membership 79767 — source identity unavailable

Direct membership GET returns 404. Direct person GET returns 404. Filtered membership collection reads by member/family/person return no matching membership; deceased-inclusive member lookup also returns zero. Both default and deceased-inclusive People queries by ID return zero; deceased-inclusive GUID lookup also returns zero.

The retained local person is still active/non-deceased from 29 June. It has no primary alias, no current local aliases and no recorded alias movement. A live `/api/PersonAlias?$filter=PersonId eq <person>&$select=Id,PersonId&$top=50` returns zero. Therefore the inspected API evidence provides no surviving identity or redirect. The actual PersonAlias API schema does not expose AliasPersonId/AliasPersonGuid; an initial exploratory query using those unsupported fields returned 400 and is not negative merge evidence.

404 and absence do not distinguish deletion, retention/security policy, or a merge that cannot be resolved through this key. No deletion, archive flag, deceased flag, replacement identity or giving reassignment is justified. Keep the household review case unresolved and affected giving measures/rates withheld. Tataihono/Rock administrator should inspect the person/member history and confirm the intended current family/person identity or an explicit approved disposition.

## Primary source evidence

- Actual instance Swagger: `/api/doc/v1?controllerName=People`, People GET summary explicitly excludes deceased records. GroupMembers summary alone is ambiguous and does not document the option; live controlled GETs above establish behavior.
- [Rock 17 PeopleController](https://github.com/SparkDevNetwork/Rock/blob/17.0/Rock.Rest/Controllers/PeopleController.Partial.cs): `Get()` excludes deceased and `Get(bool includeDeceased)` calls `Queryable(includeDeceased)`.
- [Rock 17 GroupMembersController](https://github.com/SparkDevNetwork/Rock/blob/17.0/Rock.Rest/Controllers/GroupMembersController.Partial.cs): `Get()` reads query-string `IncludeDeceased`, default false, and selects `Queryable(true)` when enabled. Upstream source is corroborating evidence; the actual instance probes are the integration contract.
- Repository reader: `lib/rock/client.ts`, `getFullSyncSlice`; report stale-membership guard: `lib/giving/household-participation.ts`; current Connect Group archive refresh: `lib/sync/membership-refresh.ts` (types 25/46 only, not family/person reconciliation).

## Bounded wider impact check

A read-only mirror query found 28 people older than the latest successful full cohort, of whom 18 still appear locally active, non-deceased and unmerged. A capped probe (maximum 25, four requests concurrently) read those 18 by ID: one is the confirmed deceased person above; 17 return 404, and none return a still-active source person or another error. These 17 are unavailable identities, not 17 confirmed deletions. The two report cases are the eligible default-campus adult-membership subset of the wider mirror finding. Do not broaden cleanup from this aggregate result.

Each of the two review families has one other eligible adult according to the current mirror. Removing the stale person's eligibility does not by itself justify removing the family or transferring its giving. Recompute the actual report through the normal service after any approved sync correction; do not predict final stage/rate changes from this narrow inspection.

## Next implementation and unresolved authority

See `docs/plans/2026-11-02-001-deceased-person-sync-contract.md` for the proposed small correction, failure modes and release verification. It can remove the confirmed stale deceased-person eligibility without inventing a disposition for Case B. The current report guard must remain. Positive Christian-source research continues independently in `docs/research/2026-11-02-christian-source-follow-up.md`.
