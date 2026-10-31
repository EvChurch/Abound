---
title: Archived Connect Group membership diagnosis and Christian-source clarification
date: 2026-10-31
status: deployed-and-verified
roadmap: RM-007
---

# Archived membership diagnosis and Christian-source clarification

## Stakeholder clarification

Tataihono's “Go” followed the recommendation to confirm the Christian marker with Rowan/the Rock data owner. A targeted reply was sent to Rowan alone in the existing Giving Check plan thread, from the same personal Gmail account. It asks:

- Whether the intended marker is Non-Christian, Non-Christian This Year or another person field; which marker is authoritative and who maintains/clears it.
- Where positive Christian status is recorded, explicitly retaining Unknown when no explicit value is available.
- Whether Exploring refers to the currently available Investigating connection status.

The reply reports the already verified UniChurch release, without donor-level or financial data. Gmail confirmed sent message `1a191768c57d7e95` in thread `1a16b4025525692b`. Earlier review findings had already been delivered to Tataihono first; this subsequent clarification contact follows his instruction to proceed. No other staff recipients were added. The Christian classification contract remains unbound pending the reply; no tag/status proxy has been adopted.

## Feedback loop and root cause

A bounded GET-only/read-only-database comparison reproduces 37 local standard-group membership rows absent from the source collection, with 29 still flagged active locally. The aggregate repro exits 2 with `FAIL_STALE_ACTIVE_MEMBERSHIPS`. It prints counts only. The minimized case is one locally active member omitted by collection GET but readable by its own ID.

Three hypotheses were considered before the direct-read probe: archived/deleted records, reassignment, or incomplete collection reads. All 29 active extras are still readable by ID and explicitly archived in Rock. The direct reads do not support reassignment or hard deletion for this cohort.

Live contract discovery:

- The v1 documentation page points to `/api/doc/v1?controllerName=GroupMembers`.
- The documented collection GET has OData and attribute-loading parameters, with no archive-inclusion parameter.
- `includeArchived=true` was tested against a known missing archived row and did not make it appear in the collection; the proposed fix does not invent that parameter.
- GET `/api/GroupMembers/{id}` is documented, readable and already covered by the app's existing read allowlist.
- The existing sync only upserts rows returned by collection GET, so a newly archived membership can retain its previous active flag indefinitely.

This is an archive-state ingestion failure. Raw source collection counts need not equal the mirror's historical-row counts, because the mirror retains confirmed archived rows. The correct acceptance check is zero active local extras for this verified cohort, with archive state preserved.

## Local change and evidence

Plan: `docs/plans/2026-10-31-001-refresh-archived-connect-memberships.md`.

Full-sync worker and CLI now prepare a bounded set of known, not-yet-archived memberships missing from the source collection. They read those records by ID, validate the returned schema and verify unchanged member/group/person identity, then pass the verified records through normal sync normalization and persistence. Already-archived local rows need no repeated lookup; an unarchive reappears in the collection.

A source read failure, missing row, invalid payload, identity mismatch or exceeded bound produces an ERROR SyncIssue and PARTIAL run while preserving unresolved local rows. There is no source write, deletion, arbitrary query endpoint or manual production repair. Person-slice sync remains outside global reconciliation. Missing parent groups and reassigned identities remain explicit follow-up cases.

Verification:

- The orchestration regression first failed because the old full-sync job never performed the member-ID read. It passes with the new preparation step and actual shared normalizer, which produces `archived = true` and `activeConnectGroup = false`.
- Focused unit/contract checks cover types 25/46, present records, candidate bounds, changed identities, payload validation, HTTP 403/404/503 handling, safe error messages and PARTIAL status propagation.
- A read-only replay captured only group/member reference and archive/status metadata in memory, then ran the actual patched reader, preparation service and normalizer locally. All 37 missing rows were verified archived; active extras decreased from 29 to zero, with zero source issues and zero production writes. No payload was saved to a file or logged.
- Full suite: 443 passed, one isolated-database integration test skipped. Formatting, lint, typecheck and diff checks passed. The compiled supervisor/worker-runtime checks pass (two tests).

The live production repro remains red until this change is deployed and a normal sync applies the verified archive states. This record does not claim production remediation. Release must follow GitHub review/main CI and the connected Railway flow, with saved-audience impact reviewed before the sync. No deployment or repair was performed for this follow-up.

## Subsequent release and clarification

The earlier local-only state above is superseded by PR #62's GitHub-managed deployment and successful normal sync. Production active extras are now zero; UniChurch remains an exact source match. Rowan also replied asking to use Investigating as a temporary non-Christian proxy, which Tataihono adopted with other statuses remaining Unknown unless explicitly recorded. See `docs/research/2026-10-31-archived-membership-release-verification.md` for deployment IDs, job/run evidence and the classification decision. No Christian-classification code shipped in this release.
