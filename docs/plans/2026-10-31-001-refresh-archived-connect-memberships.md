---
title: Refresh archived Connect Group memberships omitted by Rock collections
date: 2026-10-31
status: locally-verified-awaiting-pr-review
roadmap: RM-007
---

# Refresh archived Connect Group memberships omitted by Rock collections

## Problem and evidence

HP-002 is reproducible after a successful full sync: standard-group collection reads return 386 membership IDs, while Abound retains 423 rows. Thirty-seven local rows are absent from the collection; 29 remain flagged active. The read-only aggregate harness `/tmp/abound-rowan-discovery/membership-repro.mjs` exits 2 with `FAIL_STALE_ACTIVE_MEMBERSHIPS`. No donor identities or financial values are output.

The minimized case is one existing active local row omitted from the collection but readable by ID with `IsArchived = true`. All 29 active extras have this result. Three hypotheses were tested: archived/deleted source rows; reassignment; incomplete collection fetching. Direct reads support archived-row omission, rather than reassignment or missing pagination.

The church's live v1 contract is `/api/doc/v1?controllerName=GroupMembers`, discovered from its documentation page. Collection GET does not document an archive-inclusion parameter. A read-only probe using `includeArchived=true` still omits the same archived row. Do not invent a collection parameter or create a Rock data view to bypass this behavior. GET by ID is already available and allowlisted.

## Scope and boundaries

- Fix normal full-sync ingestion of known Connect Group membership rows omitted by the collection, using bounded source GET-by-ID reads before persistence.
- Restrict candidates to existing, not-yet-archived local type-25/type-46 memberships whose parent groups remain in the current accepted source group set. Rows already confirmed archived need no repeated individual lookup; a later unarchive returns them to the normal collection. Preserve archived rows/history; do not delete memberships or modify Rock.
- Preserve the existing person-slice path: it cannot certify a full snapshot and must not perform global missing-row reconciliation.
- Verify ID, group and person identity before appending an individually read membership to the source slice. Require typed, validated status/archive fields. Let the shared normalizer calculate active membership and persist the actual archive state.
- Unreadable, missing, malformed or incompatible source rows remain unresolved with an ERROR SyncIssue and a PARTIAL run, while existing local rows are preserved. Do not convert a permission/network failure into an archive/deletion. The normal financial sync can still proceed and the failure is visible.
- Missing parent groups, hard-deletion cleanup, moved memberships and person-identity changes remain separately reviewed reconciliation cases. This is not a complete tombstone implementation.
- Do not change Christian classification, payments, donor communications, user authorization or source record ownership.

## Implementation

1. Add a validated `RockClient.getGroupMember` read for the existing GET-by-ID endpoint. Reject wrong response shape, ID mismatch and invalid membership fields without logging response bodies or secrets.
2. Add a full-sync preparation service that selects bounded known local membership candidates absent from the accepted source membership IDs. Request at most 200 candidates and read them sequentially, with a 15-second timeout per source lookup; if the bound is exceeded, record an explicit incomplete-reconciliation issue rather than silently claiming coverage.
3. Append valid same-group/same-person source records to a new slice without mutating the caller's input. Return safe SyncIssue inputs for unresolved candidates; no writes occur in this preparation service.
4. Call the preparation service in both the full-sync job and full-sync CLI (never the person slice) after all source collections have been fetched and before normal persistence. Propagate preparation issues into the existing normalized SyncIssue stream so ERROR issues produce PARTIAL status. Preserve the original fetch failure behavior.
5. Update focused tests and architecture/failure-mode documentation. Record the stakeholder clarification request for the Christian marker separately.

## Regression and release checks

- Before the fix, a fake Rock collection omits an archived membership already active locally. A full job must fetch that exact membership by ID, normalize it as archived and persist `activeConnectGroup = false`.
- Unit/contract cases: types 25/46; present members need no extra read; archived direct result; unexpected ID/group/person; malformed source values; missing/forbidden/network reads; candidate cap; existing source issues; immutable slice; person sync does not perform global reconciliation.
- Required checks: formatting, lint, typecheck, focused tests and full suite. Review before opening a PR.
- Release through GitHub review/main CI and the connected Railway flow. No production repair SQL. Only after deployment and an authorized normal sync, rerun the live aggregate harness: active extras must be zero for this verified cohort; archived historical row counts may exceed collection counts.
- Recheck saved-view/automation impact before rollout. UniChurch's six groups, 106 memberships and 104 active memberships should remain explainable against a fresh source read.

## Rollback and limitations

Reverting the code restores collection-only ingestion; it should not reactivate correctly archived rows already persisted. Any decision to reinterpret or restore source archive state belongs to Rock staff. Candidate-only preparation cannot discover archived rows that have never existed locally and cannot certify source deletion semantics. Follow-up source outages preserve local state and mark the run incomplete.

## Verification completed

The full-job regression was observed failing before the change and passes with the patched orchestration and real normalizer. The full test suite passes (443 tests, one isolated-database integration test skipped). A read-only replay of the current source cohort through the actual patched reader/preparation/normalizer verifies all 37 missing records archived and reduces active extras from 29 to zero with no source issues or production writes. Source clarification was sent to Rowan in the existing plan thread and remains awaiting his reply. See `docs/research/2026-10-31-archived-membership-diagnosis.md`.
