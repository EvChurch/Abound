---
title: Deceased-person sync production release verification
date: 2026-11-02
status: deployed-full-sync-verified-deceased-case-resolved
---

# Deceased-person release verification

Tataihono explicitly authorized merging PR #67, deploying through GitHub, running a full sync and verifying the deceased-person case. Rock requests remain GET-only. Inspection SQL uses READ ONLY transactions with ROLLBACK; no donor/source repair SQL or source mutations were performed.

## GitHub-managed releases

PR #67 merged as `e2c17b37ce56b737912c3955c6459477a3d0f085`. Exact-main CI `41367789043` and image `41367789033` passed. Web `e17b6cc5-5faf-42c0-8085-082f36360c7f` and worker `491223bc-b7fb-42ea-8112-2eb8e1b31289` reached SUCCESS at that exact commit. The preceding scheduled full job `1b6089d9-2989-48a7-984c-f58cc9f8468d` completed successfully before merge (SyncRun `cmvyi89x25fsq08qxdwl0wa5v`, completion 2026-11-02T00:32:45.881Z including derived refresh).

The first authorized verification job `660da4b2-5023-4f8a-83b8-9fa11a0cf51e` encountered reproducible HTTP 500 during source fetch at GroupMembers `IncludeDeceased=true`, skip 18500/top 100. Three attempts failed before creating a SyncRun or persisting source records. Controlled GETs proved the default page succeeds and the deceased-inclusive page succeeds when selecting the nine normalized fields. A complete projected walk succeeded for 37,945 members across 38 pages, including membership 20270; all selected field shapes were checked. The exact unused response field responsible for the full-response error remains unidentified.

Necessary follow-up PR #68 merged as `7a4867858957f4bb9922ccefd415a8377a22df94`. Both independent Standards and Spec reviews found no actionable findings. All 479 tests, two compiled-worker checks, formatting, lint and typecheck passed, with a later-page failure regression observed red before the projection fix. Exact-main CI `41369883573` and image `41369883492` passed. Web `fa89bc5a-b761-4ab0-96a9-d063bf2d086b` and worker `8c1f9224-d49c-4fa4-b68b-2dc04efa0fd6` both reached SUCCESS from that exact merged commit. The new worker startup is recorded at 2026-11-02T01:05:17.824Z. No local archive deployment was used.

## Recorded queue operations

The normal queue is `rock-full-sync`; manual enqueue uses `boss.send(name, {requestedBy: "manual"}, {singletonKey: "full"})` through existing service credentials.

1. Enqueued first verification job `660da4b2-5023-4f8a-83b8-9fa11a0cf51e` after PR #67 services succeeded. After its third failed fetch and reviewed follow-up preparation, read its state as retry and called `boss.cancel('rock-full-sync', '660da4b2-5023-4f8a-83b8-9fa11a0cf51e')`; read-back confirmed cancelled. This stopped obsolete remaining retries, not an active persistence job.
2. The regular hourly scheduler started job `9cd1fdf6-280e-4130-8dfb-23c64aa6b9c0` on the old worker during follow-up builds. It failed during fetch, retried at 01:04:20Z, and the old container was stopped at 01:05:22Z before fetch completed. Confirmed old deployment REMOVED, new deployment SUCCESS, no new SyncRun, and no new-worker start event for this old job. Its queue state remained active. Called `boss.cancel('rock-full-sync', '9cd1fdf6-280e-4130-8dfb-23c64aa6b9c0')` to replace the obsolete fetch job; read-back confirmed cancelled. No job belonging to a running worker was interrupted by that operation.
3. After both corrected services succeeded and the obsolete queue job was cleared, enqueued replacement verification job `c9eb33cc-e3a9-4ac8-a5dd-6f10d0cb8b5c`. The corrected worker deployment's own logs confirm JOB_STARTED at 2026-11-02T01:08:18.644Z; database job start is 01:08:17.643Z. This is the designated verification run; its successful completion and checks are recorded below.

These are routine queue operations needed to complete the authorized GitHub release and full-sync verification. They do not relabel SyncRun history or alter source-owned donor/person/membership records.

## Pre-sync baseline and required completion checks

Membership 20270 and its person remained active locally from 31 July, with deceased=false, although Rock by-ID/deceased-inclusive reads verify Inactive (4) and deceased=true. Membership 79767 remains unreadable along with its person and has no verified replacement identity. Both memberships are active/unarchived locally and have no person-attributed GivingFact rows at this baseline; no financial values were output.

Immediately before the corrected sync, the deployed report enumerated all 741 eligible households with matching stage/giving summaries and two STALE_ADULT_MEMBERSHIP review cases. Both target families have two locally eligible adults, and affected giving measures are withheld. Current saved-view fields are lifecycle/search (two unarchived views); no Connect Group filter is present. Existing automation runs retain frozen recipients; no communication send is part of this release.

Completion must confirm complete job success including derived refresh, a new `rock:v1:full` baseline, actual inactive/deceased source fields and freshness on the known person/member, unchanged membership archive state, the deceased adult excluded by the report, the separate unavailable identity still flagged, stable complete pagination matching summaries, and source/mirror Connect Group counts. Positive Christian classification remains unchanged pending Rowan's answer. These checks were completed as recorded below; the separate unavailable-identity and positive Christian-source limitations remain.

## Completed full sync and deceased-case result

Replacement job `c9eb33cc-e3a9-4ac8-a5dd-6f10d0cb8b5c` completed successfully at 2026-11-02T01:24:36.888Z, including derived refreshes (14:24 NZDT on 2 November). Its scoped `rock:v1:full` run `cmvykcx80000208p9bhzmn6mm` started persistence at 01:11:47.760Z and completed SUCCEEDED at 01:24:36.082Z. It read 225,901 records and wrote 309,800, with one skipped record and the unchanged WARNING / RockHouseholdMember / MISSING_PERSON issue. No ERROR or new issue category was reported.

The person behind membership 20270 is now source-confirmed inactive (4), deceased=true, unmerged and stamped by this run. The membership is also stamped by this run while remaining Adult role 3, active status 1 and archived=false, matching the source. No archive/deletion was invented. Person-attributed GivingFact count remains zero before and after for both inspected identities; no financial values were emitted.

The actual deployed report excludes the deceased adult: this household now has one eligible adult, remains Growing through the surviving adult, has no review reason or stale membership ID, and its giving measure is available again. Membership 79767 remains unchanged and STALE_ADULT_MEMBERSHIP is still reported for its household, with affected giving measures/rates withheld. Review cases decreased from two to one. This confirms the requested deceased-person case is resolved; it does not establish a disposition for the unavailable identity.

## Report and consumer verification

The deployed reporting service has a stable snapshot under the new completed full baseline. All 745 household rows enumerate through bounded pages with one as-of/snapshot context; stage and selected/latest giving counts match summaries. Stages: Growing 347, Attending 85, Joining 36, Other 277. Known selected-period giving is 276 households and latest-month giving is 223, with one unresolved household. Growing participation is now available (226/347); Other/overall rates remain withheld because of the unavailable identity.

The pre-sync cohort was 741 households. A bounded follow-up found four newly mirrored eligible adult memberships in four distinct households, all independently visible in the current default GroupMembers collection. This is an observed current-source cohort difference, not a claim that deceased people became eligible or that every denominator change is attributable to this fix. There are 97 temporary-proxy non-Christian households and 648 Unknown. Positive Christian participation remains unavailable, not zero; the approved Investigating rule is unchanged pending Rowan's source decision.

The report service rejects inactive actors, and an unauthenticated HTTP request to the report redirects to login (307). Web and worker each have one running replica and zero crashed replicas; both exact follow-up deployments remain SUCCESS, with no pending environment work or new deployment failure. The pre-existing Postgres warning count remains one; no database configuration was changed.

## Connect Group verification

Live Rock and local mirror agree on six UniChurch groups, all 106 current source memberships and 104 active memberships, with zero missing IDs, current-record state mismatches or missing local people. Three inactive historical rows remain locally (109 memberships), without active extras. Standard-group comparison passes: 386 current source memberships, 423 local historical memberships, 37 retained inactive extras, zero active extras and zero source memberships missing locally. Overall current totals remain 34 groups and 478 active memberships (374 standard + 104 UniChurch).

## Remaining work

The unavailable person/member 79767 still requires source-owner identity/history review; no 404-based deletion, archive flag or merge was inferred. Positive Christian-source authority/completion statuses are pending Rowan's answer in Giving Check. Xero/attendance and the wider unavailable-identity audit remain separately scoped. No completion message was sent to another stakeholder as part of this deployment request.
