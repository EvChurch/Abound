---
title: Household participation report release verification
date: 2026-11-02
status: deployed-with-explicit-data-review-limitations
---

# Household report release verification

Tataihono authorized merging and deployment of reviewed PR #63. It merged as `2ad467c4e37aaf0d43949872790d8a2a7f5d4451`. Main CI (`41353910995`) and production-image verification (`41353910979`) passed. GitHub-connected Railway production deployments succeeded for web (`ca25ba03-46a8-416b-b158-30b199dc6f42`) and worker (`b4ccbbb9-237b-4ced-acde-3fbb881414b1`), both at that exact merged commit. No local archive deployment was used.

No sync jobs were queued or active before merge, or immediately before enqueue after both services deployed. Enqueued the normal `rock-full-sync` queue with `{requestedBy: "manual"}` and singleton key `full`, using pg-boss, job `5cf000bb-39ea-4eac-8bdd-917e79c58f49`. No repair SQL, run relabelling, source writes or person debug sync was used. The existing hourly schedule queued a subsequent run normally.

The verification job completed at 2026-11-01T22:23:37.417Z (2 November NZDT), with JOB_SUCCEEDED after derived refreshes. Run `cmvydjnfn000208qxcfb9uhdz` is SUCCEEDED with explicit source `rock:v1:full`: 225,733 records read, 309,561 written and one skipped. Historical ambiguous run sources remain unchanged.

## Deployed reporting service checks

Called the deployed service with aggregate-only output and enumerated every bounded page using one snapshot and as-of time. The snapshot is stable. All 742 household rows enumerate, stage counts match summaries, and selected/latest giving booleans match the totals. Inactive actors are rejected; unauthenticated HTTP access to `/households/participation` redirects to `/auth/login` (307).

Default completed-month window is November 2025 through October 2026 UTC. Current classification: Growing 347, Attending 85, Joining 36, Other 274. Known giving counts are 274 in the selected period and 217 in the latest month; two household giving measures are unresolved. Recorded giver distribution: zero 466, one 248, two 25, three-or-more 1, unresolved 2.

The report deliberately remains `dataComplete: false`: two adult membership cases were not verified in this full cohort. Their demographic rows remain provisional, their giving measures are unknown, and affected participation rates are withheld. These are review findings for Tataihono first; no source correction or third-party notification was performed.

Investigating proxy classifies 94 households non-Christian; 648 remain Unknown. Positive Christian source is still unverified and Christian participation remains unavailable. Counts do not establish positive Christian identity or reproduce Xero evidence.

## UniChurch verification

Read-only live Rock and local mirror comparisons agree on six groups, all 106 current source memberships, and 104 active memberships. No missing IDs, current-record state mismatches or missing local people. The mirror retains three additional inactive historical memberships (109 total); it is not expected to delete historical rows solely because absent from the current collection. Before this sync the mirror had 106 active memberships; normal refresh restored active count to 104.

## Follow-up

Review the two unresolved household membership cases before treating affected rates as complete. Continue positive Christian field discovery, attendance feasibility and aligned Xero evidence under the existing plan; those requirements are not marked complete by this release.
