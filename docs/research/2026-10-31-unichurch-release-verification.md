---
title: UniChurch release verification and Christian-marker investigation
date: 2026-10-31
status: release-verified-christian-marker-contract-open
roadmap: RM-007
---

# UniChurch release verification and Christian-marker investigation

Tataihono explicitly authorized merging PR #61, deploying through GitHub, verifying UniChurch after sync and continuing Christian-field investigation. Rock requests remain GET-only; production database inspections use read-only transactions. No donor communications or Rock record corrections are part of this operation.

## Release record

- [PR #61](https://github.com/EvChurch/Abound/pull/61) merged at `2026-10-31T09:14:40Z` as `ac07f8353b5ecac46dc9caeec7bc54d9a121c356`.
- Both GitHub `main` checks, CI and Production image verification, passed for that merge commit.
- Railway's GitHub-connected flow created web deployment `45db5773-8903-4ce5-b81e-23eb92f69475` and worker deployment `75da279d-82ad-4ccc-b683-a64562eb90e9` from that exact commit. No local archive deployment or direct redeploy was used.
- Both web and worker rollouts reached `SUCCESS` for the merge commit. Unauthenticated root, household and sync pages redirect to `/auth/login`; MCP returns 401, and an unauthenticated GraphQL sync-status query returns a null result with `UNAUTHENTICATED`. Post-deploy sync verification completed successfully.
- The preceding hourly full sync completed successfully at `2026-10-31T09:18:20.325Z`, before the verification sync. It ran the old worker code and does not verify the UniChurch correction.

## Approved verification operation

After both services run the merged code, enqueue one normal `rock-full-sync` job through the existing pg-boss queue, with `{ requestedBy: "manual" }` and `{ singletonKey: "full" }`, equivalent to `pnpm sync:enqueue`. The command runs through Railway SSH with existing service credentials, not copied secrets. This is the authorized normal sync path, not a manual database repair. The queue returned job `db1f8b03-5f6e-4ebf-9312-c5b87ad6a23d`, started by the deployed worker at `2026-10-31T09:21:13.002Z`. Source fetch completed and persistence began under SyncRun `cmvw74ryw000208ll2xyjvax5` (household progress recorded at `2026-10-31T09:26:06.443Z`). The SyncRun finished `SUCCEEDED` at `2026-10-31T09:44:41.578Z`; pg-boss marked the job completed at `2026-10-31T09:44:42.361Z`, after derived refresh. It read 225,476 records and wrote 309,295. Its single `WARNING / RockHouseholdMember / MISSING_PERSON` issue matches the preceding successful sync; no ERROR issue or new group-type mismatch was recorded.

Verify the job and associated SyncRun completion, then inspect type-46 group/member counts, active flags, source type preservation, parent-reference integrity and UI/API consumer predicates. Compare the exact UniChurch group/member ID sets with bounded live Rock reads; output only aggregate discrepancies. The pre-release source baseline is six groups and 106 memberships, of which 104 memberships are active in active, unarchived groups. Source changes during the sync must be distinguished from implementation errors.

## Christian-marker investigation

The previous source investigation is in `docs/research/2026-10-31-household-source-verification.md`. Further GET-only metadata and aggregate checks found:

1. Attribute 8148 (`Christian?`, key `Christian`) belongs to active workflow type 65, **Visitor Entry**. Its single-select qualifier is `Unknown, Yes, No`, and its default is Unknown. Workflow person/spouse/family reference attributes exist, but no authoritative person-field copy has been verified.
2. Visitor Entry contains one Form Builder activity (143), one Form Builder action (610) and form 54. Expanded form metadata includes the Christian workflow attribute. The form has `AllowPersonEntry = false`; its generic person-entry connection default is Fringe (203). That default is not evidence that the Christian answer sets a person's connection status. No separate person-attribute update action was returned. The form-builder settings inspected cover notification/completion/campus behavior, with no Christian mapping found.
3. A bounded `AttributeValues` query for 8148 returned zero stored rows. This does not prove the form has never been used: persistence, retention or API visibility may affect availability. It is not a usable person reporting source on this evidence.
4. A broader search of the 142 person attribute definitions found baptism/spiritual-gift metadata but no verified explicit Christian/non-Christian property. Baptism, gift assessments and connection status are not substitutes for the approved explicit field.
5. **A stronger candidate is person tagging.** Rock exposes active shared tag 8, **Non-Christian**, and active shared tag 36, **Non-Christian This Year**, both for entity type 15 (Person), with no owner or entity qualifier and no descriptions. Tag 8 has 158 distinct person GUID assignments; tag 36 has 125. Their overlap is 122; 36 assignments appear only in tag 8 and three only in tag 36. The tags therefore cannot be treated as interchangeable.
6. All 158 tag-8 entity GUIDs joined to current Rock person records. Seven were Active and non-deceased at inspection; the other 151 were explicitly Inactive, rather than missing status. Five also have an active, unarchived Adult-role membership. The seasonal tag has five Active/non-deceased people, four with active Adult-role membership. These are coverage diagnostics, not complete eligible-household counts: parent-family activity, campus and all report eligibility rules are not applied. The tag spans multiple connection statuses, so it cannot be substituted with a connection-status shortcut. No names, contact details, person IDs or individual classifications were output or retained.

7. Rock data-view metadata exposes four views named Christian Potentially Looking, including all-campus view 231. Its root filter 12898 contains PropertyFilter 12899 selecting `Property_ConnectionStatusValueId` values Visiting (66), Joining (1406), Attending (146) and Growing (1229), plus OtherDataViewFilter 12900 referencing view 351 (Newly Created in last Month). The GUIDs in the stored selection were matched to the verified connection-status taxonomy. This specific Christian-labelled view uses connection-status criteria, not a separate explicit Christian person property at that root. It is evidence of an existing reporting convention, not authority to apply that proxy to Abound or proof of a church-wide rule. Its referenced view and campus variants were not exhaustively evaluated. The approved independent-explicit-marker and Unknown rules remain unchanged.

Interpretation: Non-Christian tagging may be the person-record marker Rowan described; that is an inference requiring confirmation of the church's maintenance/ownership policy. It is a populated explicit negative marker, not a complete binary Christian field. **An absent Non-Christian tag remains Unknown under the approved policy**, and no positive Christian source has yet been verified. The seasonal tag is not silently substituted. No schema, sync allowlist, classification or source data was changed from these findings.

The original 24 October Abound email thread was re-read: Rowan describes Christian/non-Christian data on person records but supplies no field key, tag ID or screen location. It does not resolve which marker is intended.

Next checks: confirm the intended authoritative marker and how staff maintain/clear it; verify the source for positive Christian status; verify current eligible-adult coverage; settle the actual source status intended by Exploring (the current taxonomy includes Investigating). Any tag-based integration needs an explicit provenance/unknown/removal contract before implementation.

## Review notification follow-up

The new Non-Christian person-tag findings and ownership/positive-source checks were sent to Tataihono alone as a reply in the existing review thread. Gmail confirmed message `1a1914a1163d39ad` in thread `1a19132388f6d0d7`. The notification distinguished the populated negative-marker candidate from a verified complete Christian field, explained inactive-record coverage, and requested source-owner confirmation rather than changing classification. No third-party recipients were included.

## UniChurch set and state comparison

After group/member persistence, a fresh bounded Rock read was compared to the production mirror in a read-only transaction. Both sides contain six type-46 groups and 106 type-46 memberships, with 104 active memberships. Missing/extra group IDs, missing/extra membership IDs, group-state mismatches, member-state mismatches and missing local person references all count zero. All six local groups have campus `Unichurch`. Every group and member row carries SyncRun `cmvw74ryw000208ll2xyjvax5`, tying the result to the deployed-code verification job. This initial comparison happened after group/member persistence. After the full job completed, a second read confirmed the same six UniChurch groups and 106 memberships, with 104 active and two inactive. The job completed successfully under the same SyncRun.

## Final deployed-consumer verification

The actual deployed `getSyncStatusSummary` service was invoked through the retained TypeScript source and existing runtime tooling, with output limited to aggregate counts and sync metadata. It reports 34 Connect Groups and 507 active Connect Group memberships, with the verification run as the latest successful run. This is the read model used by the sync UI/API. The totals consist of 28 standard groups plus six UniChurch groups, and 403 standard active memberships plus 104 UniChurch active memberships. The pre-existing standard-group reconciliation finding HP-002 is unchanged and is not certified resolved by this release.

The source/member comparison, final read-only counts and service result agree. No second manual full sync was run; repeat-sync stability can be checked on the next normal scheduled run. This record does not claim that later check has occurred. Web and worker each have one running replica and zero crashed replicas. A Postgres warning count was observed in the environment inventory, with no critical alert or recent deployment failure; database configuration was not changed.

UniChurch deployment and initial post-sync verification are complete. Household participation reporting and Christian-marker binding remain in progress under RM-007; neither Non-Christian tag absence nor the Christian-labelled status-filter data view has been substituted for the approved explicit-positive-source requirement.
